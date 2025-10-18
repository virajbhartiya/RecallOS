// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RecallOSMemoryRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Memory {
        bytes32 hash;           
        bytes32 urlHash;        
        uint256 timestamp;      
    }

    mapping(address => Memory[]) public userMemories;           
    mapping(address => uint256) public userMemoryCount;         
    mapping(bytes32 => bool) public memoryExists;               
    mapping(bytes32 => address) public memoryOwner;            

    // Gas deposit management
    mapping(address => uint256) public userGasDeposits;
    mapping(address => bool) public authorizedRelayers;
    uint256 public constant GAS_BUFFER_PERCENT = 120; // 20% buffer
    uint256 public constant MIN_DEPOSIT = 0.001 ether;
    uint256 public constant MAX_WITHDRAWAL_PER_DAY = 1 ether;
    
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => uint256) public dailyWithdrawalAmount;

    event MemoryStored(address indexed user, bytes32 indexed hash, bytes32 urlHash, uint256 timestamp);
    event MemoryBatchStored(address indexed user, uint256 count);
    event GasDeposited(address indexed user, uint256 amount, uint256 newBalance);
    event GasDeducted(address indexed user, uint256 amount, uint256 remainingBalance);
    event GasWithdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event RelayerAuthorized(address indexed relayer, bool authorized);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Gas deposit management functions
    function depositGas() external payable {
        require(msg.value >= MIN_DEPOSIT, "Deposit amount too small");
        userGasDeposits[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value, userGasDeposits[msg.sender]);
    }

    function withdrawGas(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(userGasDeposits[msg.sender] >= amount, "Insufficient balance");
        
        // Check daily withdrawal limit
        uint256 currentTime = block.timestamp;
        uint256 dayStart = (currentTime / 1 days) * 1 days;
        
        if (lastWithdrawalTime[msg.sender] < dayStart) {
            dailyWithdrawalAmount[msg.sender] = 0;
        }
        
        require(dailyWithdrawalAmount[msg.sender] + amount <= MAX_WITHDRAWAL_PER_DAY, "Daily withdrawal limit exceeded");
        
        userGasDeposits[msg.sender] -= amount;
        dailyWithdrawalAmount[msg.sender] += amount;
        lastWithdrawalTime[msg.sender] = currentTime;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit GasWithdrawn(msg.sender, amount, userGasDeposits[msg.sender]);
    }

    function getUserGasBalance(address user) external view returns (uint256) {
        return userGasDeposits[user];
    }

    function authorizeRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }

    function isAuthorizedRelayer(address relayer) external view returns (bool) {
        return authorizedRelayers[relayer];
    }

    // Internal function to deduct gas from user's deposit
    function _deductGas(address user, uint256 gasCost) internal {
        require(userGasDeposits[user] >= gasCost, "Insufficient gas deposit");
        userGasDeposits[user] -= gasCost;
        emit GasDeducted(user, gasCost, userGasDeposits[user]);
    }

    function storeMemory(bytes32 _hash, bytes32 _urlHash, uint256 _timestamp) external {
        require(!memoryExists[_hash], "Memory already exists");
        require(authorizedRelayers[msg.sender], "Unauthorized relayer");
        
        // Store gas start for calculation
        uint256 gasStart = gasleft();
        
        Memory memory newMemory = Memory({
            hash: _hash,
            urlHash: _urlHash,
            timestamp: _timestamp
        });
        
        userMemories[tx.origin].push(newMemory);
        userMemoryCount[tx.origin]++;
        
        memoryExists[_hash] = true;
        memoryOwner[_hash] = tx.origin;
        
        // Calculate actual gas used and deduct from user's deposit
        uint256 gasUsed = gasStart - gasleft() + 21000; // Add base transaction cost
        uint256 gasCost = tx.gasprice * gasUsed * GAS_BUFFER_PERCENT / 100;
        _deductGas(tx.origin, gasCost);
        
        emit MemoryStored(tx.origin, _hash, _urlHash, _timestamp);
    }

    function storeMemoryBatch(
        bytes32[] calldata _hashes,
        bytes32[] calldata _urlHashes,
        uint256[] calldata _timestamps
    ) external {
        require(_hashes.length == _urlHashes.length && _urlHashes.length == _timestamps.length, "Array lengths must match");
        require(_hashes.length > 0, "Must store at least one memory");
        require(authorizedRelayers[msg.sender], "Unauthorized relayer");
        
        // Store gas start for calculation
        uint256 gasStart = gasleft();
        
        for (uint256 i = 0; i < _hashes.length; i++) {
            require(!memoryExists[_hashes[i]], "Memory already exists");
            
            Memory memory newMemory = Memory({
                hash: _hashes[i],
                urlHash: _urlHashes[i],
                timestamp: _timestamps[i]
            });
            
            userMemories[tx.origin].push(newMemory);
            userMemoryCount[tx.origin]++;
            
            memoryExists[_hashes[i]] = true;
            memoryOwner[_hashes[i]] = tx.origin;
            
            emit MemoryStored(tx.origin, _hashes[i], _urlHashes[i], _timestamps[i]);
        }
        
        // Calculate actual gas used and deduct from user's deposit
        uint256 gasUsed = gasStart - gasleft() + 21000; // Add base transaction cost
        uint256 gasCost = tx.gasprice * gasUsed * GAS_BUFFER_PERCENT / 100;
        _deductGas(tx.origin, gasCost);
        
        emit MemoryBatchStored(tx.origin, _hashes.length);
    }

    function getMemory(address _user, uint256 _index) external view returns (bytes32 hash, bytes32 urlHash, uint256 timestamp) {
        require(_index < userMemories[_user].length, "Index out of bounds");
        Memory memory mem = userMemories[_user][_index];
        return (mem.hash, mem.urlHash, mem.timestamp);
    }

    function getUserMemories(address _user) external view returns (Memory[] memory) {
        return userMemories[_user];
    }

    function getUserMemoryCount(address _user) external view returns (uint256) {
        return userMemoryCount[_user];
    }

    function isMemoryStored(bytes32 _hash) external view returns (bool) {
        return memoryExists[_hash];
    }

    function getMemoryOwner(bytes32 _hash) external view returns (address) {
        return memoryOwner[_hash];
    }

    function getMemoriesByUrlHash(address _user, bytes32 _urlHash) external view returns (Memory[] memory) {
        Memory[] memory allMemories = userMemories[_user];
        uint256 matchCount = 0;
        
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].urlHash == _urlHash) {
                matchCount++;
            }
        }
        
        Memory[] memory matches = new Memory[](matchCount);
        uint256 matchIndex = 0;
        
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].urlHash == _urlHash) {
                matches[matchIndex] = allMemories[i];
                matchIndex++;
            }
        }
        
        return matches;
    }

    function getMemoriesByTimestampRange(
        address _user,
        uint256 _startTime,
        uint256 _endTime
    ) external view returns (Memory[] memory) {
        Memory[] memory allMemories = userMemories[_user];
        uint256 matchCount = 0;
        
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].timestamp >= _startTime && allMemories[i].timestamp <= _endTime) {
                matchCount++;
            }
        }
        
        Memory[] memory matches = new Memory[](matchCount);
        uint256 matchIndex = 0;
        
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].timestamp >= _startTime && allMemories[i].timestamp <= _endTime) {
                matches[matchIndex] = allMemories[i];
                matchIndex++;
            }
        }
        
        return matches;
    }

    function getRecentMemories(address _user, uint256 _count) external view returns (Memory[] memory) {
        uint256 totalMemories = userMemories[_user].length;
        if (_count > totalMemories) {
            _count = totalMemories;
        }
        
        Memory[] memory recent = new Memory[](_count);
        uint256 startIndex = totalMemories - _count;
        
        for (uint256 i = 0; i < _count; i++) {
            recent[i] = userMemories[_user][startIndex + i];
        }
        
        return recent;
    }

    function getMemoryByHash(bytes32 _hash) external view returns (address owner, bytes32 urlHash, uint256 timestamp) {
        require(memoryExists[_hash], "Memory does not exist");
        address ownerAddr = memoryOwner[_hash];
        
        Memory[] memory memories = userMemories[ownerAddr];
        for (uint256 i = 0; i < memories.length; i++) {
            if (memories[i].hash == _hash) {
                return (ownerAddr, memories[i].urlHash, memories[i].timestamp);
            }
        }
        
        revert("Memory not found");
    }
}