import { ethers } from 'ethers';

import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ABI = [
  'function storeMemory(bytes32 hash, bytes32 urlHash, uint256 timestamp) external',
  'function storeMemoryBatch(bytes32[] calldata hashes, bytes32[] calldata urlHashes, uint256[] calldata timestamps) external',
  'function getMemory(address user, uint256 index) external view returns (bytes32 hash, bytes32 urlHash, uint256 timestamp)',
  'function getUserMemories(address user) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)',
  'function getUserMemoryCount(address user) external view returns (uint256)',
  'function isMemoryStored(bytes32 hash) external view returns (bool)',
  'function getMemoryOwner(bytes32 hash) external view returns (address)',
  'function getMemoriesByUrlHash(address user, bytes32 urlHash) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)',
  'function getMemoriesByTimestampRange(address user, uint256 startTime, uint256 endTime) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)',
  'function getRecentMemories(address user, uint256 count) external view returns (tuple(bytes32 hash, bytes32 urlHash, uint256 timestamp)[] memory)',
  'function getMemoryByHash(bytes32 hash) external view returns (address owner, bytes32 urlHash, uint256 timestamp)',
  'function getUserGasBalance(address user) external view returns (uint256)',
  'function depositGas() external payable',
  'function withdrawGas(uint256 amount) external',
  'function authorizeRelayer(address relayer, bool authorized) external',
  'function isAuthorizedRelayer(address relayer) external view returns (bool)',
  'event MemoryStored(address indexed user, bytes32 indexed hash, bytes32 urlHash, uint256 timestamp)',
  'event MemoryBatchStored(address indexed user, uint256 count)',
  'event GasDeposited(address indexed user, uint256 amount, uint256 newBalance)',
  'event GasDeducted(address indexed user, uint256 amount, uint256 remainingBalance)',
  'event GasWithdrawn(address indexed user, uint256 amount, uint256 newBalance)',
  'event RelayerAuthorized(address indexed relayer, bool authorized)',
];

let provider: ethers.JsonRpcProvider;

let wallet: ethers.Wallet;

let contract: ethers.Contract;

function initializeBlockchain() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

  const contractAddress = process.env.MEMORY_REGISTRY_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(`Missing required environment variables for blockchain connection:
      SEPOLIA_RPC_URL: ${rpcUrl ? 'SET' : 'NOT SET'}
      RELAYER_PRIVATE_KEY: ${privateKey ? 'SET' : 'NOT SET'}
      MEMORY_REGISTRY_CONTRACT_ADDRESS: ${contractAddress ? 'SET' : 'NOT SET'}`);
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
}

try {
  initializeBlockchain();
} catch (error) {
  console.warn('Blockchain not initialized:', error.message);
}

export function initializeBlockchainConnection() {
  try {
    initializeBlockchain();

    return true;
  } catch (error) {
    console.warn('Blockchain initialization failed:', error.message);

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

export async function storeMemory(
  hash: string,
  url: string,
  timestamp: number,
  userAddress: string
) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  // Check user's gas balance first
  const userBalance = await contract.getUserGasBalance(userAddress);

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const urlHash = hashUrl(url);


      const gasPrice = await provider.getFeeData();
      const bufferMultiplier = 100 + attempt * 20;
      const gasPriceWithBuffer = gasPrice.gasPrice
        ? (gasPrice.gasPrice * BigInt(bufferMultiplier)) / BigInt(100)
        : undefined;

      let gasLimit: bigint | undefined;

      try {
        gasLimit = await contract.storeMemory.estimateGas(
          hash,
          urlHash,
          timestamp,
          {
            gasPrice: gasPriceWithBuffer,
          }
        );
        gasLimit = (gasLimit * BigInt(120)) / BigInt(100);
      } catch (gasEstimateError) {
        gasLimit = BigInt(200000);
      }

      // Calculate estimated gas cost
      const estimatedGasCost = gasPriceWithBuffer && gasLimit 
        ? gasPriceWithBuffer * gasLimit 
        : BigInt(0);


      // Check if user has sufficient balance
      if (userBalance < estimatedGasCost) {
        throw new Error(`Insufficient gas deposit. Required: ${ethers.formatEther(estimatedGasCost)} ETH, Available: ${ethers.formatEther(userBalance)} ETH`);
      }

      const tx = await contract.storeMemory(hash, urlHash, timestamp, {
        gasPrice: gasPriceWithBuffer,
        gasLimit: gasLimit,
      });

      const receipt = await tx.wait();

      // Get updated user balance after transaction
      const updatedBalance = await contract.getUserGasBalance(userAddress);


      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        userBalance: ethers.formatEther(updatedBalance),
        estimatedCost: ethers.formatEther(estimatedGasCost),
      };
    } catch (error: any) {
      lastError = error;
      console.error(
        `Error storing memory (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (
        error.code === 'REPLACEMENT_UNDERPRICED' ||
        error.message.includes('replacement fee too low') ||
        error.message.includes('gas price too low') ||
        error.message.includes('transaction underpriced')
      ) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      if (
        attempt === maxRetries ||
        (!error.message.includes('gas') && !error.message.includes('fee'))
      ) {
        break;
      }
    }
  }

  throw new Error(
    `Failed to store memory after ${maxRetries} attempts: ${lastError?.message}`
  );
}

export async function storeMemoryBatch(memories: MemoryData[], userAddress: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  if (!memories || memories.length === 0) {
    throw new Error('Memories array cannot be empty');
  }

  const userBalance = await contract.getUserGasBalance(userAddress);

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      const hashes = memories.map(m => m.hash);
      const urlHashes = memories.map(m => m.urlHash);
      const timestamps = memories.map(m => m.timestamp);

      const gasPrice = await provider.getFeeData();
      const bufferMultiplier = 100 + attempt * 20;
      const gasPriceWithBuffer = gasPrice.gasPrice
        ? (gasPrice.gasPrice * BigInt(bufferMultiplier)) / BigInt(100)
        : undefined;

      let gasLimit: bigint | undefined;

      try {
        gasLimit = await contract.storeMemoryBatch.estimateGas(
          hashes,
          urlHashes,
          timestamps,
          {
            gasPrice: gasPriceWithBuffer,
          }
        );
        gasLimit = (gasLimit * BigInt(120)) / BigInt(100);
      } catch (gasEstimateError) {
        gasLimit = BigInt(500000);
      }

      // Calculate estimated gas cost
      const estimatedGasCost = gasPriceWithBuffer && gasLimit 
        ? gasPriceWithBuffer * gasLimit 
        : BigInt(0);


      if (userBalance < estimatedGasCost) {
        throw new Error(`Insufficient gas deposit. Required: ${ethers.formatEther(estimatedGasCost)} ETH, Available: ${ethers.formatEther(userBalance)} ETH`);
      }

      const tx = await contract.storeMemoryBatch(
        hashes,
        urlHashes,
        timestamps,
        {
          gasPrice: gasPriceWithBuffer,
          gasLimit: gasLimit,
        }
      );

      const receipt = await tx.wait();

      // Get updated user balance after transaction
      const updatedBalance = await contract.getUserGasBalance(userAddress);


      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        memoryCount: memories.length,
        userBalance: ethers.formatEther(updatedBalance),
        estimatedCost: ethers.formatEther(estimatedGasCost),
      };
    } catch (error: any) {
      lastError = error;
      console.error(
        `Error storing memory batch (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (
        error.code === 'REPLACEMENT_UNDERPRICED' ||
        error.message.includes('replacement fee too low') ||
        error.message.includes('gas price too low') ||
        error.message.includes('transaction underpriced')
      ) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      if (
        attempt === maxRetries ||
        (!error.message.includes('gas') && !error.message.includes('fee'))
      ) {
        break;
      }
    }
  }

  throw new Error(
    `Failed to store memory batch after ${maxRetries} attempts: ${lastError?.message}`
  );
}

export function onMemoryStored(
  callback: (
    user: string,
    hash: string,
    urlHash: string,
    timestamp: number
  ) => void
) {
  contract.on('MemoryStored', (user, hash, urlHash, timestamp) => {
    callback(user, hash, urlHash, timestamp.toNumber());
  });
}

export function onMemoryBatchStored(
  callback: (user: string, count: number) => void
) {
  contract.on('MemoryBatchStored', (user, count) => {
    callback(user, count.toNumber());
  });
}

export function removeAllListeners() {
  contract.removeAllListeners();
}

export async function getMemory(userAddress: string, index: number) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const result = await contract.getMemory(userAddress, index);

    return {
      hash: result.hash,
      urlHash: result.urlHash,
      timestamp: result.timestamp.toString(),
    };
  } catch (error) {
    console.error('Error getting memory:', error);
    throw new Error(`Failed to get memory: ${error.message}`);
  }
}

export async function getUserMemories(userAddress: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const memories = await contract.getUserMemories(userAddress);

    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString(),
    }));
  } catch (error) {
    console.error('Error getting user memories:', error);
    throw new Error(`Failed to get user memories: ${error.message}`);
  }
}

export async function getUserMemoryCount(userAddress: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const count = await contract.getUserMemoryCount(userAddress);

    return count.toString();
  } catch (error) {
    console.error('Error getting user memory count:', error);
    throw new Error(`Failed to get user memory count: ${error.message}`);
  }
}

export async function isMemoryStored(hash: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    return await contract.isMemoryStored(hash);
  } catch (error) {
    console.error('Error checking if memory is stored:', error);
    throw new Error(`Failed to check if memory is stored: ${error.message}`);
  }
}

export async function getMemoryOwner(hash: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    return await contract.getMemoryOwner(hash);
  } catch (error) {
    console.error('Error getting memory owner:', error);
    throw new Error(`Failed to get memory owner: ${error.message}`);
  }
}

export async function getMemoriesByUrlHash(
  userAddress: string,
  urlHash: string
) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const memories = await contract.getMemoriesByUrlHash(userAddress, urlHash);

    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString(),
    }));
  } catch (error) {
    console.error('Error getting memories by URL hash:', error);
    throw new Error(`Failed to get memories by URL hash: ${error.message}`);
  }
}

export async function getMemoriesByTimestampRange(
  userAddress: string,
  startTime: number,
  endTime: number
) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const memories = await contract.getMemoriesByTimestampRange(
      userAddress,
      startTime,
      endTime
    );

    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString(),
    }));
  } catch (error) {
    console.error('Error getting memories by timestamp range:', error);
    throw new Error(
      `Failed to get memories by timestamp range: ${error.message}`
    );
  }
}

export async function getRecentMemories(userAddress: string, count: number) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const memories = await contract.getRecentMemories(userAddress, count);

    return memories.map((mem: any) => ({
      hash: mem.hash,
      urlHash: mem.urlHash,
      timestamp: mem.timestamp.toString(),
    }));
  } catch (error) {
    console.error('Error getting recent memories:', error);
    throw new Error(`Failed to get recent memories: ${error.message}`);
  }
}

export async function getMemoryByHash(hash: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const result = await contract.getMemoryByHash(hash);

    return {
      owner: result.owner,
      urlHash: result.urlHash,
      timestamp: result.timestamp.toString(),
    };
  } catch (error) {
    console.error('Error getting memory by hash:', error);
    throw new Error(`Failed to get memory by hash: ${error.message}`);
  }
}

export async function getUserGasBalance(userAddress: string) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const checksummedAddress = ethers.getAddress(userAddress.toLowerCase());
    const balance = await contract.getUserGasBalance(checksummedAddress);
    return {
      balance: ethers.formatEther(balance),
      balanceWei: balance.toString(),
    };
  } catch (error) {
    console.error('Error getting user gas balance:', error);
    throw new Error(`Failed to get user gas balance: ${error.message}`);
  }
}

export async function getEstimatedGasCost(memoryCount: number = 1) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const gasPrice = await provider.getFeeData();
    const gasPriceGwei = gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : '0';
    
    const estimatedGas = memoryCount === 1 ? BigInt(200000) : BigInt(500000);
    const estimatedCost = gasPrice.gasPrice ? gasPrice.gasPrice * estimatedGas : BigInt(0);
    
    return {
      gasPrice: gasPriceGwei,
      estimatedGas: estimatedGas.toString(),
      estimatedCost: ethers.formatEther(estimatedCost),
      estimatedCostWei: estimatedCost.toString(),
    };
  } catch (error) {
    console.error('Error getting estimated gas cost:', error);
    throw new Error(`Failed to get estimated gas cost: ${error.message}`);
  }
}

export async function getContractAddress() {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  return contract.target;
}

export async function authorizeRelayer(relayerAddress: string, authorized: boolean) {
  if (!contract) {
    throw new Error('Blockchain not initialized. Check environment variables.');
  }

  try {
    const tx = await contract.authorizeRelayer(relayerAddress, authorized);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error('Error authorizing relayer:', error);
    throw new Error(`Failed to authorize relayer: ${error.message}`);
  }
}
