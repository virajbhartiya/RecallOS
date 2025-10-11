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

// Track submitted batches to prevent duplicates
const submittedBatches = new Set<string>();

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
  
  console.log(`Contract address: ${contract.target}`);
  console.log(`Wallet address: ${wallet.address}`);
  
  try {
    const { tree, root } = generateMerkleTree(hashes);
    
    // Check if this batch has already been submitted
    if (submittedBatches.has(root)) {
      console.log(`Batch with root ${root} already submitted, skipping...`);
      return { 
        txHash: null as string | null, 
        root,
        blockNumber: null as number | null,
        gasUsed: null as string | null,
        skipped: true
      };
    }
    
    // Check if batch exists on blockchain
    try {
      const batchMetadata = await contract.batches(root);
      if (batchMetadata.timestamp > 0) {
        console.log(`Batch with root ${root} already exists on blockchain, skipping...`);
        console.log(`Batch submitted by: ${batchMetadata.user}`);
        console.log(`Batch timestamp: ${new Date(Number(batchMetadata.timestamp) * 1000).toISOString()}`);
        console.log(`Batch hash count: ${batchMetadata.hashCount}`);
        
        // Try to get the original transaction hash
        try {
          const txInfo = await getBatchTransactionHash(root);
          if (txInfo) {
            console.log(`Original transaction hash: ${txInfo.txHash}`);
            console.log(`Original block number: ${txInfo.blockNumber}`);
          }
        } catch (txError) {
          console.log("Could not retrieve original transaction hash");
        }
        
        submittedBatches.add(root);
        return { 
          txHash: null as string | null, 
          root,
          blockNumber: null as number | null,
          gasUsed: null as string | null,
          skipped: true,
          existingBatch: {
            user: batchMetadata.user,
            timestamp: batchMetadata.timestamp.toString(),
            hashCount: batchMetadata.hashCount.toString()
          }
        };
      }
    } catch (checkError) {
      // If we can't check, proceed with submission
      console.log("Could not check batch existence, proceeding with submission...");
    }
    
    console.log(`Submitting batch with root: ${root}`);
    console.log(`Hashes count: ${hashes.length}`);
    console.log(`First hash: ${hashes[0]}`);
    
    // Try to estimate gas first
    try {
      const gasEstimate = await contract.submitMemoryBatch.estimateGas(root, hashes);
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
    } catch (gasError) {
      console.error("Gas estimation failed:", gasError);
      throw new Error(`Gas estimation failed: ${gasError.message}`);
    }
    
    const tx = await contract.submitMemoryBatch(root, hashes);
    console.log(`Transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Mark batch as submitted
    submittedBatches.add(root);
    
    return { 
      txHash: tx.hash, 
      root,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed?.toString()
    };
  } catch (error) {
    console.error("Error submitting batch:", error);
    
    // If error is "Batch exists", mark it as submitted to prevent retries
    if (error.message && error.message.includes("Batch exists")) {
      const { tree, root } = generateMerkleTree(hashes);
      submittedBatches.add(root);
      console.log(`Marked batch ${root} as submitted due to 'Batch exists' error`);
    }
    
    // Check if it's a transaction revert
    if (error.code === 'CALL_EXCEPTION' && error.receipt && error.receipt.status === 0) {
      console.error("Transaction was reverted. Receipt:", error.receipt);
      console.error("Transaction data:", error.transaction);
    }
    
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

// Interface for complete memory data
export interface MemoryData {
  summary: string;
  timestamp: number;
  location?: string;
  url?: string;
  title?: string;
  source?: string;
  content?: string;
  metadata?: any;
}

// Function to create a hash from complete memory data
export function createMemoryHash(memoryData: MemoryData): string {
  // Create a structured object with all memory data
  const memoryObject = {
    summary: memoryData.summary,
    timestamp: memoryData.timestamp,
    location: memoryData.location || '',
    url: memoryData.url || '',
    title: memoryData.title || '',
    source: memoryData.source || '',
    content: memoryData.content || '',
    metadata: memoryData.metadata || {}
  };
  
  // Convert to JSON string and hash it
  const memoryString = JSON.stringify(memoryObject, Object.keys(memoryObject).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(memoryString));
}

// New function to store complete memory data on blockchain
export async function storeMemoryData(memoryData: MemoryData[], userAddress?: string) {
  if (!memoryData || memoryData.length === 0) {
    throw new Error("Memory data array cannot be empty");
  }
  
  try {
    // Generate hashes for the complete memory data
    const hashes = memoryData.map(memory => createMemoryHash(memory));
    
    // Submit batch to blockchain
    const result = await submitBatch(hashes);
    
    return {
      success: true,
      txHash: result.txHash,
      merkleRoot: result.root,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      memoryCount: memoryData.length,
      userAddress: userAddress || wallet.address,
      skipped: result.skipped || false,
      memoryHashes: hashes
    };
  } catch (error) {
    console.error("Error storing memory data:", error);
    throw new Error(`Failed to store memory data: ${error.message}`);
  }
}

// Legacy function for backward compatibility
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
      userAddress: userAddress || wallet.address,
      skipped: result.skipped || false
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

// Function to clear submitted batches cache (useful for testing or reset)
export function clearSubmittedBatches() {
  submittedBatches.clear();
  console.log("Cleared submitted batches cache");
}

// Function to get submitted batches count
export function getSubmittedBatchesCount() {
  return submittedBatches.size;
}

// Function to get all batches submitted by the current wallet
export async function getAllUserBatches() {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    const filter = contract.filters.MemoryBatchSubmitted(wallet.address);
    const events = await contract.queryFilter(filter);
    
    return events.map(event => {
      if ('args' in event && event.args) {
        const eventArgs = event.args as any;
        return {
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          user: eventArgs.user,
          merkleRoot: eventArgs.merkleRoot,
          count: eventArgs.count.toString()
        };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error("Error getting user batches:", error);
    throw new Error(`Failed to get user batches: ${error.message}`);
  }
}

// Function to get transaction hash for an existing batch by looking up events
export async function getBatchTransactionHash(merkleRoot: string) {
  if (!contract) {
    throw new Error("Blockchain not initialized. Check environment variables.");
  }
  
  try {
    // Since merkleRoot is not indexed, we need to get all MemoryBatchSubmitted events
    // and filter them manually. We'll get events from the wallet address.
    const filter = contract.filters.MemoryBatchSubmitted(wallet.address);
    
    // Get past events
    const events = await contract.queryFilter(filter);
    
    // Filter events to find the one with matching merkleRoot
    for (const event of events) {
      if ('args' in event && event.args) {
        const eventArgs = event.args as any;
        if (eventArgs.merkleRoot === merkleRoot) {
          return {
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            user: eventArgs.user,
            merkleRoot: eventArgs.merkleRoot,
            count: eventArgs.count.toString()
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting batch transaction hash:", error);
    throw new Error(`Failed to get batch transaction hash: ${error.message}`);
  }
}
