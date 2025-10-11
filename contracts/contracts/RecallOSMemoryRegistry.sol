// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract RecallOSMemoryRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct BatchMetadata {
        address user;
        uint256 timestamp;
        uint256 hashCount;
    }

    mapping(bytes32 => BatchMetadata) public batches;
    mapping(bytes32 => bool) public verifiedHashes;
    mapping(address => bytes32[]) public userMemories;

    event MemoryBatchSubmitted(address indexed user, bytes32 merkleRoot, uint256 count);
    event MemoryVerified(address indexed user, bytes32 hash);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function submitMemoryBatch(bytes32 merkleRoot, bytes32[] calldata hashes) external {
        require(batches[merkleRoot].timestamp == 0, "Batch exists");
        batches[merkleRoot] = BatchMetadata({
            user: msg.sender,
            timestamp: block.timestamp,
            hashCount: hashes.length
        });
        for (uint i = 0; i < hashes.length; i++) {
            userMemories[msg.sender].push(hashes[i]);
        }
        emit MemoryBatchSubmitted(msg.sender, merkleRoot, hashes.length);
    }

    function verifyMemory(bytes32 hash, bytes32[] calldata proof, bytes32 merkleRoot) external returns (bool) {
        require(batches[merkleRoot].timestamp != 0, "Invalid root");
        bool valid = MerkleProof.verify(proof, merkleRoot, hash);
        if (valid) verifiedHashes[hash] = true;
        emit MemoryVerified(msg.sender, hash);
        return valid;
    }

    function getMemoryStatus(bytes32 hash) external view returns (bool) {
        return verifiedHashes[hash];
    }

    function getUserMemoryCount(address user) external view returns (uint256) {
        return userMemories[user].length;
    }
}
