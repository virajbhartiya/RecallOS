import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const CONTRACT_ABI = [
  "function storeMemory(bytes32 hash, bytes32 urlHash, uint256 timestamp) external",
  "function storeMemoryBatch(bytes32[] calldata hashes, bytes32[] calldata urlHashes, uint256[] calldata timestamps) external",
  "function getMemory(address user, uint256 index) external view returns (bytes32 hash, bytes32 urlHash, uint256 timestamp)",
  "function getUserMemories(address user) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)",
  "function getUserMemoryCount(address user) external view returns (uint256)",
  "function isMemoryStored(bytes32 hash) external view returns (bool)",
  "function getMemoryOwner(bytes32 hash) external view returns (address)",
  "function getMemoriesByUrlHash(address user, bytes32 urlHash) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)",
  "function getMemoriesByTimestampRange(address user, uint256 startTime, uint256 endTime) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)",
  "function getRecentMemories(address user, uint256 count) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)",
  "function getMemoryByHash(bytes32 hash) external view returns (address owner, bytes32 urlHash, uint256 timestamp)",
  "event MemoryStored(address indexed user, bytes32 indexed hash, bytes32 urlHash, uint256 timestamp)",
  "event MemoryBatchStored(address indexed user, uint256 count)"
];

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;


function initializeBlockchain() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.MEMORY_REGISTRY_CONTRACT_ADDRESS;
  
  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(`Missing required environment variables for blockchain connection:
      SEPOLIA_RPC_URL: ${rpcUrl ? 'SET' : 'NOT SET'}
      DEPLOYER_PRIVATE_KEY: ${privateKey ? 'SET' : 'NOT SET'}
      MEMORY_REGISTRY_CONTRACT_ADDRESS: ${contractAddress ? 'SET' : 'NOT SET'}`);
  }
  
  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
  
  console.log('Blockchain initialized successfully');
}

try {
  initializeBlockchain();
} catch (error) {
  console.warn("Blockchain not initialized:", error.message);
}

export function initializeBlockchainConnection() {
  try {
    initializeBlockchain();
    return true;
  } catch (error) {
    console.warn("Blockchain initialization failed:", error.message);
    return false;
  }
}

export interface MemoryData {
  hash: string;
  urlHash: string;
  timestamp: number;
}

export function hashUrl(url: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(url));
}


export async function storeMemory(hash: string, url: string, timestamp: number) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const urlHash = hashUrl(url);
      console.log(`Storing memory: hash=${hash}, urlHash=${urlHash}, timestamp=${timestamp} (attempt ${attempt}/${maxRetries})`);
      
      // Get current gas price with dynamic buffer based on attempt
      const gasPrice = await provider.getFeeData();
      const bufferMultiplier = 100 + (attempt * 20); // 120%, 140%, 160%
      const gasPriceWithBuffer = gasPrice.gasPrice ? 
        gasPrice.gasPrice * BigInt(bufferMultiplier) / BigInt(100) : undefined;
      
      // Estimate gas limit for the transaction
      let gasLimit: bigint | undefined;
      try {
        gasLimit = await contract.storeMemory.estimateGas(hash, urlHash, timestamp, {
          gasPrice: gasPriceWithBuffer
        });
        // Add 20% buffer to gas limit
        gasLimit = gasLimit * BigInt(120) / BigInt(100);
      } catch (gasEstimateError) {
        console.log(`Gas estimation failed, using default: ${gasEstimateError.message}`);
        gasLimit = BigInt(200000); // Default gas limit for single memory
      }
      
      console.log(`Using gas price: ${gasPriceWithBuffer?.toString()}, gas limit: ${gasLimit?.toString()}`);
      
      const tx = await contract.storeMemory(hash, urlHash, timestamp, {
        gasPrice: gasPriceWithBuffer,
        gasLimit: gasLimit
      });
      const receipt = await tx.wait();
      
      console.log(`Memory stored successfully: ${tx.hash}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Error storing memory (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Check if it's a gas-related error that we can retry
      if (error.code === 'REPLACEMENT_UNDERPRICED' || 
          error.message.includes('replacement fee too low') ||
          error.message.includes('gas price too low') ||
          error.message.includes('transaction underpriced')) {
        
        if (attempt < maxRetries) {
          console.log(`Retrying with higher gas price in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      
      // For non-gas related errors or final attempt, throw immediately
      if (attempt === maxRetries || !error.message.includes('gas') && !error.message.includes('fee')) {
        break;
      }
    }
  }
  
  throw new Error(`Failed to store memory after ${maxRetries} attempts: ${lastError?.message}`);
}

export async function storeMemoryBatch(memories: MemoryData[]) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  if (!memories || memories.length === 0) {
    throw new Error("Memories array cannot be empty");
  }
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Storing batch of ${memories.length} memories (attempt ${attempt}/${maxRetries})`);
      
      const hashes = memories.map(m => m.hash);
      const urlHashes = memories.map(m => m.urlHash);
      const timestamps = memories.map(m => m.timestamp);
      
      // Get current gas price with dynamic buffer based on attempt
      const gasPrice = await provider.getFeeData();
      const bufferMultiplier = 100 + (attempt * 20); // 120%, 140%, 160%
      const gasPriceWithBuffer = gasPrice.gasPrice ? 
        gasPrice.gasPrice * BigInt(bufferMultiplier) / BigInt(100) : undefined;
      
      // Estimate gas limit for the transaction
      let gasLimit: bigint | undefined;
      try {
        gasLimit = await contract.storeMemoryBatch.estimateGas(hashes, urlHashes, timestamps, {
          gasPrice: gasPriceWithBuffer
        });
        // Add 20% buffer to gas limit
        gasLimit = gasLimit * BigInt(120) / BigInt(100);
      } catch (gasEstimateError) {
        console.log(`Gas estimation failed, using default: ${gasEstimateError.message}`);
        gasLimit = BigInt(500000); // Default gas limit
      }
      
      console.log(`Using gas price: ${gasPriceWithBuffer?.toString()}, gas limit: ${gasLimit?.toString()}`);
      
      const tx = await contract.storeMemoryBatch(hashes, urlHashes, timestamps, {
        gasPrice: gasPriceWithBuffer,
        gasLimit: gasLimit
      });
      const receipt = await tx.wait();
      
      console.log(`Memory batch stored successfully: ${tx.hash}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        memoryCount: memories.length
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Error storing memory batch (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Check if it's a gas-related error that we can retry
      if (error.code === 'REPLACEMENT_UNDERPRICED' || 
          error.message.includes('replacement fee too low') ||
          error.message.includes('gas price too low') ||
          error.message.includes('transaction underpriced')) {
        
        if (attempt < maxRetries) {
          console.log(`Retrying with higher gas price in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      
      // For non-gas related errors or final attempt, throw immediately
      if (attempt === maxRetries || !error.message.includes('gas') && !error.message.includes('fee')) {
        break;
      }
    }
  }
  
  throw new Error(`Failed to store memory batch after ${maxRetries} attempts: ${lastError?.message}`);
}



export function onMemoryStored(callback: (user: string, hash: string, urlHash: string, timestamp: number) => void) {
  contract.on("MemoryStored", (user, hash, urlHash, timestamp) => {
    callback(user, hash, urlHash, timestamp.toNumber());
  });
}

export function onMemoryBatchStored(callback: (user: string, count: number) => void) {
  contract.on("MemoryBatchStored", (user, count) => {
    callback(user, count.toNumber());
  });
}

export function removeAllListeners() {
  contract.removeAllListeners();
}

export async function getMemory(userAddress: string, index: number) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const result = await contract.getMemory(userAddress, index);
    return {
      hash: result.hash,
      urlHash: result.urlHash,
      timestamp: result.timestamp.toString()
    };
  } catch (error) {
    console.error("Error getting memory:", error);
    throw new Error(`Failed to get memory: ${error.message}`);
  }
}

export async function getUserMemories(userAddress: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const memories = await contract.getUserMemories(userAddress);
    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString()
    }));
  } catch (error) {
    console.error("Error getting user memories:", error);
    throw new Error(`Failed to get user memories: ${error.message}`);
  }
}

export async function getUserMemoryCount(userAddress: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const count = await contract.getUserMemoryCount(userAddress);
    return count.toString();
  } catch (error) {
    console.error("Error getting user memory count:", error);
    throw new Error(`Failed to get user memory count: ${error.message}`);
  }
}

export async function isMemoryStored(hash: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    return await contract.isMemoryStored(hash);
  } catch (error) {
    console.error("Error checking if memory is stored:", error);
    throw new Error(`Failed to check if memory is stored: ${error.message}`);
  }
}

export async function getMemoryOwner(hash: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    return await contract.getMemoryOwner(hash);
  } catch (error) {
    console.error("Error getting memory owner:", error);
    throw new Error(`Failed to get memory owner: ${error.message}`);
  }
}

export async function getMemoriesByUrlHash(userAddress: string, urlHash: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const memories = await contract.getMemoriesByUrlHash(userAddress, urlHash);
    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString()
    }));
  } catch (error) {
    console.error("Error getting memories by URL hash:", error);
    throw new Error(`Failed to get memories by URL hash: ${error.message}`);
  }
}

export async function getMemoriesByTimestampRange(userAddress: string, startTime: number, endTime: number) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const memories = await contract.getMemoriesByTimestampRange(userAddress, startTime, endTime);
    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString()
    }));
  } catch (error) {
    console.error("Error getting memories by timestamp range:", error);
    throw new Error(`Failed to get memories by timestamp range: ${error.message}`);
  }
}

export async function getRecentMemories(userAddress: string, count: number) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const memories = await contract.getRecentMemories(userAddress, count);
    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString()
    }));
  } catch (error) {
    console.error("Error getting recent memories:", error);
    throw new Error(`Failed to get recent memories: ${error.message}`);
  }
}

export async function getMemoryByHash(hash: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const result = await contract.getMemoryByHash(hash);
    return {
      owner: result.owner,
      urlHash: result.urlHash,
      timestamp: result.timestamp.toString()
    };
  } catch (error) {
    console.error("Error getting memory by hash:", error);
    throw new Error(`Failed to get memory by hash: ${error.message}`);
  }
}

