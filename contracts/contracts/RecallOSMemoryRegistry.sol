// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RecallOSMemoryRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // Memory structure
    struct Memory {
        bytes32 hash;           // Hash of the memory data
        bytes32 urlHash;        // Hash of the URL where the memory came from
        uint256 timestamp;      // When the memory was created
    }

    // Storage mappings
    mapping(address => Memory[]) public userMemories;           // wallet => array of memories
    mapping(address => uint256) public userMemoryCount;         // wallet => count of memories
    mapping(bytes32 => bool) public memoryExists;               // hash => exists (for quick lookup)
    mapping(bytes32 => address) public memoryOwner;             // hash => owner wallet

    // Events
    event MemoryStored(address indexed user, bytes32 indexed hash, bytes32 urlHash, uint256 timestamp);
    event MemoryBatchStored(address indexed user, uint256 count);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Store a single memory
    function storeMemory(bytes32 _hash, bytes32 _urlHash, uint256 _timestamp) external {
        require(!memoryExists[_hash], "Memory already exists");
        
        // Create memory struct
        Memory memory newMemory = Memory({
            hash: _hash,
            urlHash: _urlHash,
            timestamp: _timestamp
        });
        
        // Store in user's memory array
        userMemories[msg.sender].push(newMemory);
        userMemoryCount[msg.sender]++;
        
        // Update lookup mappings
        memoryExists[_hash] = true;
        memoryOwner[_hash] = msg.sender;
        
        emit MemoryStored(msg.sender, _hash, _urlHash, _timestamp);
    }

    // Store multiple memories in a batch
    function storeMemoryBatch(
        bytes32[] calldata _hashes,
        bytes32[] calldata _urlHashes,
        uint256[] calldata _timestamps
    ) external {
        require(_hashes.length == _urlHashes.length && _urlHashes.length == _timestamps.length, "Array lengths must match");
        require(_hashes.length > 0, "Must store at least one memory");
        
        for (uint256 i = 0; i < _hashes.length; i++) {
            require(!memoryExists[_hashes[i]], "Memory already exists");
            
            // Create memory struct
            Memory memory newMemory = Memory({
                hash: _hashes[i],
                urlHash: _urlHashes[i],
                timestamp: _timestamps[i]
            });
            
            // Store in user's memory array
            userMemories[msg.sender].push(newMemory);
            userMemoryCount[msg.sender]++;
            
            // Update lookup mappings
            memoryExists[_hashes[i]] = true;
            memoryOwner[_hashes[i]] = msg.sender;
            
            emit MemoryStored(msg.sender, _hashes[i], _urlHashes[i], _timestamps[i]);
        }
        
        emit MemoryBatchStored(msg.sender, _hashes.length);
    }

    // Query functions

    // Get a specific memory by user and index
    function getMemory(address _user, uint256 _index) external view returns (bytes32 hash, bytes32 urlHash, uint256 timestamp) {
        require(_index < userMemories[_user].length, "Index out of bounds");
        Memory memory mem = userMemories[_user][_index];
        return (mem.hash, mem.urlHash, mem.timestamp);
    }

    // Get all memories for a user
    function getUserMemories(address _user) external view returns (Memory[] memory) {
        return userMemories[_user];
    }

    // Get memory count for a user
    function getUserMemoryCount(address _user) external view returns (uint256) {
        return userMemoryCount[_user];
    }

    // Check if a memory exists
    function isMemoryStored(bytes32 _hash) external view returns (bool) {
        return memoryExists[_hash];
    }

    // Get the owner of a memory
    function getMemoryOwner(bytes32 _hash) external view returns (address) {
        return memoryOwner[_hash];
    }

    // Get memories by URL hash (returns all memories with matching URL hash for a user)
    function getMemoriesByUrlHash(address _user, bytes32 _urlHash) external view returns (Memory[] memory) {
        Memory[] memory allMemories = userMemories[_user];
        uint256 matchCount = 0;
        
        // Count matches first
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].urlHash == _urlHash) {
                matchCount++;
            }
        }
        
        // Create result array
        Memory[] memory matches = new Memory[](matchCount);
        uint256 matchIndex = 0;
        
        // Fill result array
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].urlHash == _urlHash) {
                matches[matchIndex] = allMemories[i];
                matchIndex++;
            }
        }
        
        return matches;
    }

    // Get memories by timestamp range
    function getMemoriesByTimestampRange(
        address _user,
        uint256 _startTime,
        uint256 _endTime
    ) external view returns (Memory[] memory) {
        Memory[] memory allMemories = userMemories[_user];
        uint256 matchCount = 0;
        
        // Count matches first
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].timestamp >= _startTime && allMemories[i].timestamp <= _endTime) {
                matchCount++;
            }
        }
        
        // Create result array
        Memory[] memory matches = new Memory[](matchCount);
        uint256 matchIndex = 0;
        
        // Fill result array
        for (uint256 i = 0; i < allMemories.length; i++) {
            if (allMemories[i].timestamp >= _startTime && allMemories[i].timestamp <= _endTime) {
                matches[matchIndex] = allMemories[i];
                matchIndex++;
            }
        }
        
        return matches;
    }

    // Get recent memories (last N memories for a user)
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

    // Get memory by hash (if you know the hash but not the owner)
    function getMemoryByHash(bytes32 _hash) external view returns (address owner, bytes32 urlHash, uint256 timestamp) {
        require(memoryExists[_hash], "Memory does not exist");
        address ownerAddr = memoryOwner[_hash];
        
        // Find the memory in the owner's array
        Memory[] memory memories = userMemories[ownerAddr];
        for (uint256 i = 0; i < memories.length; i++) {
            if (memories[i].hash == _hash) {
                return (ownerAddr, memories[i].urlHash, memories[i].timestamp);
            }
        }
        
        revert("Memory not found");
    }
}