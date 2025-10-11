import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

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

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(process.env.MEMORY_REGISTRY_CONTRACT_ADDRESS!, CONTRACT_ABI, wallet);

export function generateMerkleTree(hashes: string[]) {
  const leaves = hashes.map(x => Buffer.from(ethers.keccak256(x).slice(2), 'hex'));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return { tree, root: tree.getHexRoot() };
}

export async function submitBatch(hashes: string[]) {
  const { tree, root } = generateMerkleTree(hashes);
  const tx = await contract.submitMemoryBatch(root, hashes);
  await tx.wait();
  return { txHash: tx.hash, root };
}

export async function verifyMemory(hash: string, proof: string[], root: string) {
  return await contract.verifyMemory(hash, proof, root);
}

export async function getMemoryStatus(hash: string) {
  return await contract.getMemoryStatus(hash);
}

export async function getUserMemoryCount(userAddress: string) {
  return await contract.getUserMemoryCount(userAddress);
}

export async function getBatchMetadata(merkleRoot: string) {
  return await contract.batches(merkleRoot);
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
