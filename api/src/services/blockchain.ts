import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Contract ABI - this would be generated after deployment
const CONTRACT_ABI = [
  "function submitMemoryBatch(bytes32 merkleRoot, bytes32[] calldata hashes) external",
  "function verifyMemory(bytes32 hash, bytes32[] calldata proof, bytes32 merkleRoot) external returns (bool)",
  "function getMemoryStatus(bytes32 hash) external view returns (bool)",
  "function getUserMemoryCount(address user) external view returns (uint256)",
  "function batches(bytes32) external view returns (address user, uint256 timestamp, uint256 hashCount)",
  "event MemoryBatchSubmitted(address indexed user, bytes32 merkleRoot, uint256 count)",
  "event MemoryVerified(address indexed user, bytes32 hash)"
];

// Initialize blockchain connection
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

// Initialize on module load
try {
  initializeBlockchain();
} catch (error) {
  console.warn("Blockchain not initialized:", error.message);
}

// Export initialization function for manual initialization
export function initializeBlockchainConnection() {
  try {
    initializeBlockchain();
    return true;
  } catch (error) {
    console.warn("Blockchain initialization failed:", error.message);
    return false;
  }
}

export function generateMerkleTree(hashes: string[]) {
  if (!hashes || hashes.length === 0) {
    throw new Error("Hashes array cannot be empty");
  }
  
  const leaves = hashes.map(x => Buffer.from(ethers.keccak256(x).slice(2), 'hex'));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return { tree, root: tree.getHexRoot() };
}

export async function submitBatch(hashes: string[]) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const { tree, root } = generateMerkleTree(hashes);
    const tx = await contract.submitMemoryBatch(root, hashes);
    await tx.wait();
    return { 
      txHash: tx.hash, 
      root,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed?.toString()
    };
  } catch (error) {
    console.error("Error submitting batch:", error);
    throw new Error(`Failed to submit memory batch: ${error.message}`);
  }
}

export async function verifyMemory(hash: string, proof: string[], root: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const result = await contract.verifyMemory(hash, proof, root);
    return result;
  } catch (error) {
    console.error("Error verifying memory:", error);
    throw new Error(`Failed to verify memory: ${error.message}`);
  }
}

export async function getMemoryStatus(hash: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    return await contract.getMemoryStatus(hash);
  } catch (error) {
    console.error("Error getting memory status:", error);
    throw new Error(`Failed to get memory status: ${error.message}`);
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

export async function getBatchMetadata(merkleRoot: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const batch = await contract.batches(merkleRoot);
    return {
      user: batch.user,
      timestamp: batch.timestamp.toString(),
      hashCount: batch.hashCount.toString()
    };
  } catch (error) {
    console.error("Error getting batch metadata:", error);
    throw new Error(`Failed to get batch metadata: ${error.message}`);
  }
}

// New function to store memories with automatic batching
export async function storeMemories(memories: string[], userAddress?: string) {
  if (!memories || memories.length === 0) {
    throw new Error("Memories array cannot be empty");
  }
  
  try {
    // Generate hashes for the memories
    const hashes = memories.map(memory => ethers.keccak256(ethers.toUtf8Bytes(memory)));
    
    // Submit batch to blockchain
    const result = await submitBatch(hashes);
    
    return {
      success: true,
      txHash: result.txHash,
      merkleRoot: result.root,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      memoryCount: memories.length,
      userAddress: userAddress || wallet.address
    };
  } catch (error) {
    console.error("Error storing memories:", error);
    throw new Error(`Failed to store memories: ${error.message}`);
  }
}

// Function to get proof for a specific memory
export function getMemoryProof(memory: string, allMemories: string[]) {
  const hashes = allMemories.map(m => ethers.keccak256(ethers.toUtf8Bytes(m)));
  const { tree } = generateMerkleTree(hashes);
  const targetHash = ethers.keccak256(ethers.toUtf8Bytes(memory));
  const leaves = hashes.map(x => Buffer.from(x.slice(2), 'hex'));
  const targetLeaf = Buffer.from(targetHash.slice(2), 'hex');
  
  const proof = tree.getHexProof(targetLeaf);
  return {
    proof,
    root: tree.getHexRoot(),
    hash: targetHash
  };
}

// Event listeners for real-time updates
export function onMemoryBatchSubmitted(callback: (user: string, merkleRoot: string, count: number) => void) {
  contract.on("MemoryBatchSubmitted", (user, merkleRoot, count) => {
    callback(user, merkleRoot, count.toNumber());
  });
}

export function onMemoryVerified(callback: (user: string, hash: string) => void) {
  contract.on("MemoryVerified", (user, hash) => {
    callback(user, hash);
  });
}

export function removeAllListeners() {
  contract.removeAllListeners();
}
