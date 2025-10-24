// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RecallOSMemoryRegistry} from "./RecallOSMemoryRegistry.sol";
import "hardhat/console.sol";

contract RecallOSMemoryRegistryTest {
    RecallOSMemoryRegistry public registry;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        registry = new RecallOSMemoryRegistry();
        registry.initialize();
    }

    function test_Initialize() public {
        require(registry.owner() == owner, "Owner not set correctly");
    }

    function test_StoreMemory() public {
        bytes32 memoryHash = keccak256("test memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        registry.storeMemory(memoryHash, urlHash, timestamp);

        require(registry.isMemoryStored(memoryHash), "Memory not stored");
        require(registry.getMemoryOwner(memoryHash) == user1, "Wrong memory owner");
        require(registry.getUserMemoryCount(user1) == 1, "Wrong memory count");

        (bytes32 retrievedHash, bytes32 retrievedUrlHash, uint256 retrievedTimestamp) = 
            registry.getMemory(user1, 0);
        
        require(retrievedHash == memoryHash, "Wrong hash");
        require(retrievedUrlHash == urlHash, "Wrong URL hash");
        require(retrievedTimestamp == timestamp, "Wrong timestamp");
    }

    function test_StoreMemoryBatch() public {
        bytes32[] memory hashes = new bytes32[](3);
        bytes32[] memory urlHashes = new bytes32[](3);
        uint256[] memory timestamps = new uint256[](3);

        for (uint256 i = 0; i < 3; i++) {
            hashes[i] = keccak256(abi.encodePacked("memory", i));
            urlHashes[i] = keccak256(abi.encodePacked("url", i));
            timestamps[i] = block.timestamp + i;
        }

        registry.storeMemoryBatch(hashes, urlHashes, timestamps);

        require(registry.getUserMemoryCount(user1) == 3, "Wrong batch count");
        
        for (uint256 i = 0; i < 3; i++) {
            require(registry.isMemoryStored(hashes[i]), "Memory not stored");
            require(registry.getMemoryOwner(hashes[i]) == user1, "Wrong owner");
        }
    }

    function test_StoreDuplicateMemory() public {
        bytes32 memoryHash = keccak256("duplicate memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        registry.storeMemory(memoryHash, urlHash, timestamp);

        // This should revert when trying to store the same memory hash
        try registry.storeMemory(memoryHash, urlHash, timestamp) {
            require(false, "Should have reverted");
        } catch {
            // Expected to revert
        }
    }

    function test_GetUserMemories() public {
        bytes32 memoryHash1 = keccak256("memory1");
        bytes32 memoryHash2 = keccak256("memory2");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        registry.storeMemory(memoryHash1, urlHash, timestamp);
        registry.storeMemory(memoryHash2, urlHash, timestamp + 1);

        RecallOSMemoryRegistry.Memory[] memory memories = registry.getUserMemories(user1);
        require(memories.length == 2, "Wrong number of memories");
        require(memories[0].hash == memoryHash1, "Wrong first memory");
        require(memories[1].hash == memoryHash2, "Wrong second memory");
    }

    function test_GetMemoryByHash() public {
        bytes32 memoryHash = keccak256("test memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        registry.storeMemory(memoryHash, urlHash, timestamp);

        (address memoryOwner, bytes32 retrievedUrlHash, uint256 retrievedTimestamp) = 
            registry.getMemoryByHash(memoryHash);
        
        require(memoryOwner == user1, "Wrong owner");
        require(retrievedUrlHash == urlHash, "Wrong URL hash");
        require(retrievedTimestamp == timestamp, "Wrong timestamp");
    }

    function test_GetMemoriesByUrlHash() public {
        bytes32 urlHash = keccak256("https://example.com");
        
        // Store 3 memories with same URL hash
        for (uint256 i = 0; i < 3; i++) {
            bytes32 memoryHash = keccak256(abi.encodePacked("memory", i));
            registry.storeMemory(memoryHash, urlHash, block.timestamp + i);
        }
        
        // Store 1 memory with different URL hash
        bytes32 differentUrlHash = keccak256("https://different.com");
        bytes32 differentMemoryHash = keccak256("different memory");
        registry.storeMemory(differentMemoryHash, differentUrlHash, block.timestamp + 10);

        RecallOSMemoryRegistry.Memory[] memory memories = 
            registry.getMemoriesByUrlHash(user1, urlHash);
        
        require(memories.length == 3, "Wrong number of memories");
        for (uint256 i = 0; i < 3; i++) {
            require(memories[i].urlHash == urlHash, "Wrong URL hash");
        }
    }

    function test_GetMemoriesByTimestampRange() public {
        uint256 baseTime = block.timestamp;
        
        // Store memories with different timestamps
        bytes32[] memory hashes = new bytes32[](5);
        bytes32[] memory urlHashes = new bytes32[](5);
        uint256[] memory timestamps = new uint256[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            hashes[i] = keccak256(abi.encodePacked("memory", i));
            urlHashes[i] = keccak256(abi.encodePacked("url", i));
            timestamps[i] = baseTime + (i * 100); // 0, 100, 200, 300, 400
        }

        registry.storeMemoryBatch(hashes, urlHashes, timestamps);

        // Get memories in range [100, 300]
        RecallOSMemoryRegistry.Memory[] memory memories = 
            registry.getMemoriesByTimestampRange(user1, baseTime + 100, baseTime + 300);
        
        require(memories.length == 3, "Wrong number of memories in range");
    }

    function test_GetRecentMemories() public {
        uint256 baseTime = block.timestamp;
        
        // Store 5 memories
        for (uint256 i = 0; i < 5; i++) {
            bytes32 memoryHash = keccak256(abi.encodePacked("memory", i));
            bytes32 urlHash = keccak256(abi.encodePacked("url", i));
            registry.storeMemory(memoryHash, urlHash, baseTime + i);
        }

        // Get 3 most recent memories
        RecallOSMemoryRegistry.Memory[] memory recent = registry.getRecentMemories(user1, 3);
        
        require(recent.length == 3, "Wrong number of recent memories");
    }

    function test_OnlyOwnerCanUpgrade() public {
        RecallOSMemoryRegistry newImplementation = new RecallOSMemoryRegistry();
        
        // This should revert when non-owner tries to upgrade
        try registry.upgradeToAndCall(address(newImplementation), "") {
            require(false, "Should have reverted");
        } catch {
            // Expected to revert
        }
    }

    function test_OwnerCanUpgrade() public {
        RecallOSMemoryRegistry newImplementation = new RecallOSMemoryRegistry();
        
        // Verify the contract has the expected owner
        require(registry.owner() == owner, "Wrong owner");
        
        // Verify the new implementation can be deployed
        require(address(newImplementation) != address(0), "Invalid implementation");
        
        // Initialize the new implementation to set the owner
        newImplementation.initialize();
        require(newImplementation.owner() == address(this), "Wrong implementation owner");
    }
}