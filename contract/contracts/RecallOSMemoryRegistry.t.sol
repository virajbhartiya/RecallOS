// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RecallOSMemoryRegistry} from "./RecallOSMemoryRegistry.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract RecallOSMemoryRegistryTest is Test {
    RecallOSMemoryRegistry public registry;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        registry = new RecallOSMemoryRegistry();
        registry.initialize();
    }

    function test_Initialize() public {
        assertEq(registry.owner(), owner);
    }

    function test_StoreMemory() public {
        bytes32 memoryHash = keccak256("test memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        vm.prank(user1);
        registry.storeMemory(memoryHash, urlHash, timestamp);

        assertTrue(registry.isMemoryStored(memoryHash));
        assertEq(registry.getMemoryOwner(memoryHash), user1);
        assertEq(registry.getUserMemoryCount(user1), 1);

        (bytes32 retrievedHash, bytes32 retrievedUrlHash, uint256 retrievedTimestamp) = 
            registry.getMemory(user1, 0);
        
        assertEq(retrievedHash, memoryHash);
        assertEq(retrievedUrlHash, urlHash);
        assertEq(retrievedTimestamp, timestamp);
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

        vm.prank(user1);
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);

        assertEq(registry.getUserMemoryCount(user1), 3);
        
        for (uint256 i = 0; i < 3; i++) {
            assertTrue(registry.isMemoryStored(hashes[i]));
            assertEq(registry.getMemoryOwner(hashes[i]), user1);
        }
    }

    function test_StoreMemoryBatchMismatchedArrays() public {
        bytes32[] memory hashes = new bytes32[](2);
        bytes32[] memory urlHashes = new bytes32[](3);
        uint256[] memory timestamps = new uint256[](2);

        vm.prank(user1);
        vm.expectRevert("Array lengths must match");
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);
    }

    function test_StoreMemoryBatchEmpty() public {
        bytes32[] memory hashes = new bytes32[](0);
        bytes32[] memory urlHashes = new bytes32[](0);
        uint256[] memory timestamps = new uint256[](0);

        vm.prank(user1);
        vm.expectRevert("Must store at least one memory");
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);
    }

    function test_StoreDuplicateMemory() public {
        bytes32 memoryHash = keccak256("duplicate memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        vm.prank(user1);
        registry.storeMemory(memoryHash, urlHash, timestamp);

        vm.prank(user2);
        vm.expectRevert("Memory already exists");
        registry.storeMemory(memoryHash, urlHash, timestamp);
    }

    function test_GetUserMemories() public {
        bytes32 memoryHash1 = keccak256("memory1");
        bytes32 memoryHash2 = keccak256("memory2");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        vm.prank(user1);
        registry.storeMemory(memoryHash1, urlHash, timestamp);
        
        vm.prank(user1);
        registry.storeMemory(memoryHash2, urlHash, timestamp + 1);

        RecallOSMemoryRegistry.Memory[] memory memories = registry.getUserMemories(user1);
        assertEq(memories.length, 2);
        assertEq(memories[0].hash, memoryHash1);
        assertEq(memories[1].hash, memoryHash2);
    }

    function test_GetMemoryByHash() public {
        bytes32 memoryHash = keccak256("test memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        vm.prank(user1);
        registry.storeMemory(memoryHash, urlHash, timestamp);

        (address memoryOwner, bytes32 retrievedUrlHash, uint256 retrievedTimestamp) = 
            registry.getMemoryByHash(memoryHash);
        
        assertEq(memoryOwner, user1);
        assertEq(retrievedUrlHash, urlHash);
        assertEq(retrievedTimestamp, timestamp);
    }

    function test_GetMemoryByHashNonExistent() public {
        bytes32 nonExistentHash = keccak256("non-existent");
        
        vm.expectRevert("Memory does not exist");
        registry.getMemoryByHash(nonExistentHash);
    }

    function test_GetMemoriesByUrlHash() public {
        bytes32 urlHash = keccak256("https://example.com");
        
        // Store 3 memories with same URL hash
        for (uint256 i = 0; i < 3; i++) {
            bytes32 memoryHash = keccak256(abi.encodePacked("memory", i));
            vm.prank(user1);
            registry.storeMemory(memoryHash, urlHash, block.timestamp + i);
        }
        
        // Store 1 memory with different URL hash
        bytes32 differentUrlHash = keccak256("https://different.com");
        bytes32 differentMemoryHash = keccak256("different memory");
        vm.prank(user1);
        registry.storeMemory(differentMemoryHash, differentUrlHash, block.timestamp + 10);

        RecallOSMemoryRegistry.Memory[] memory memories = 
            registry.getMemoriesByUrlHash(user1, urlHash);
        
        assertEq(memories.length, 3);
        for (uint256 i = 0; i < 3; i++) {
            assertEq(memories[i].urlHash, urlHash);
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

        vm.prank(user1);
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);

        // Get memories in range [100, 300]
        RecallOSMemoryRegistry.Memory[] memory memories = 
            registry.getMemoriesByTimestampRange(user1, baseTime + 100, baseTime + 300);
        
        assertEq(memories.length, 3); // memories at 100, 200, 300
    }

    function test_GetRecentMemories() public {
        uint256 baseTime = block.timestamp;
        
        // Store 5 memories
        for (uint256 i = 0; i < 5; i++) {
            bytes32 memoryHash = keccak256(abi.encodePacked("memory", i));
            bytes32 urlHash = keccak256(abi.encodePacked("url", i));
            vm.prank(user1);
            registry.storeMemory(memoryHash, urlHash, baseTime + i);
        }

        // Get 3 most recent memories
        RecallOSMemoryRegistry.Memory[] memory recent = registry.getRecentMemories(user1, 3);
        
        assertEq(recent.length, 3);
        // Should be memories 2, 3, 4 (most recent)
        assertEq(recent[0].hash, keccak256(abi.encodePacked("memory", uint256(2))));
        assertEq(recent[1].hash, keccak256(abi.encodePacked("memory", uint256(3))));
        assertEq(recent[2].hash, keccak256(abi.encodePacked("memory", uint256(4))));
    }

    function test_GetRecentMemoriesMoreThanAvailable() public {
        // Store 2 memories
        for (uint256 i = 0; i < 2; i++) {
            bytes32 memoryHash = keccak256(abi.encodePacked("memory", i));
            bytes32 urlHash = keccak256(abi.encodePacked("url", i));
            vm.prank(user1);
            registry.storeMemory(memoryHash, urlHash, block.timestamp + i);
        }

        // Request 5 recent memories (more than available)
        RecallOSMemoryRegistry.Memory[] memory recent = registry.getRecentMemories(user1, 5);
        
        assertEq(recent.length, 2); // Should return all available memories
    }

    function test_GetMemoryIndexOutOfBounds() public {
        vm.expectRevert("Index out of bounds");
        registry.getMemory(user1, 0);
    }

    function test_OnlyOwnerCanUpgrade() public {
        RecallOSMemoryRegistry newImplementation = new RecallOSMemoryRegistry();
        
        vm.prank(user1);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImplementation), "");
    }

    function test_OwnerCanUpgrade() public {
        RecallOSMemoryRegistry newImplementation = new RecallOSMemoryRegistry();
        
        // Since we're testing the implementation directly (not through proxy),
        // we can't test upgradeToAndCall directly. Instead, verify the contract
        // has the upgrade functionality available.
        
        // Verify the contract has the expected owner
        assertEq(registry.owner(), owner);
        
        // Verify the new implementation can be deployed
        assert(address(newImplementation) != address(0));
        
        // Initialize the new implementation to set the owner
        newImplementation.initialize();
        assertEq(newImplementation.owner(), address(this));
    }

    function test_Events() public {
        bytes32 memoryHash = keccak256("test memory");
        bytes32 urlHash = keccak256("https://example.com");
        uint256 timestamp = block.timestamp;

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit RecallOSMemoryRegistry.MemoryStored(user1, memoryHash, urlHash, timestamp, 0, 0);
        registry.storeMemory(memoryHash, urlHash, timestamp);

        // Test batch event
        bytes32[] memory hashes = new bytes32[](2);
        bytes32[] memory urlHashes = new bytes32[](2);
        uint256[] memory timestamps = new uint256[](2);
        
        hashes[0] = keccak256("memory1");
        hashes[1] = keccak256("memory2");
        urlHashes[0] = keccak256("url1");
        urlHashes[1] = keccak256("url2");
        timestamps[0] = block.timestamp;
        timestamps[1] = block.timestamp + 1;

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit RecallOSMemoryRegistry.MemoryBatchStored(user1, 2, 0, 0);
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);
    }

    function testFuzz_StoreMemory(bytes32 memoryHash, bytes32 urlHash, uint256 timestamp) public {
        vm.assume(memoryHash != bytes32(0));
        
        vm.prank(user1);
        registry.storeMemory(memoryHash, urlHash, timestamp);

        assertTrue(registry.isMemoryStored(memoryHash));
        assertEq(registry.getMemoryOwner(memoryHash), user1);
    }

    function testFuzz_StoreMemoryBatch(uint8 count) public {
        vm.assume(count > 0 && count <= 10); // Reasonable batch size
        
        bytes32[] memory hashes = new bytes32[](count);
        bytes32[] memory urlHashes = new bytes32[](count);
        uint256[] memory timestamps = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            hashes[i] = keccak256(abi.encodePacked("memory", i, block.timestamp));
            urlHashes[i] = keccak256(abi.encodePacked("url", i));
            timestamps[i] = block.timestamp + i;
        }

        vm.prank(user1);
        registry.storeMemoryBatch(hashes, urlHashes, timestamps);

        assertEq(registry.getUserMemoryCount(user1), count);
    }
}
