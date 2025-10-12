import { Router } from "express";
import { MemoryController } from "../controller/memory.controller";

const router = Router();

router.post("/process", MemoryController.processRawContent);
router.post("/", MemoryController.storeMemory); 
router.post("/batch", MemoryController.storeMemoryBatch);

// Query routes
router.get("/user/:userAddress", MemoryController.getUserMemories);
router.get("/user/:userAddress/count", MemoryController.getUserMemoryCount);
router.get("/user/:userAddress/memory/:index", MemoryController.getMemory); 
router.get("/user/:userAddress/recent", MemoryController.getRecentMemories);
router.get("/user/:userAddress/by-url", MemoryController.getMemoriesByUrlHash);
router.get("/user/:userAddress/by-timestamp", MemoryController.getMemoriesByTimestampRange);

// Enhanced RAG search routes
router.get("/search", MemoryController.searchMemories);
router.get("/insights", MemoryController.getMemoryInsights);

// Blockchain transaction routes
router.get("/transactions", MemoryController.getMemoriesWithTransactionDetails);
router.get("/transaction/:memoryId", MemoryController.getMemoryTransactionStatus);
router.post("/retry-failed", MemoryController.retryFailedTransactions); 

// Memory mesh and embedding routes
router.get("/mesh/:userAddress", MemoryController.getMemoryMesh);
router.get("/relations/:memoryId", MemoryController.getMemoryWithRelations);
router.get("/cluster/:memoryId", MemoryController.getMemoryCluster);
router.get("/search-embeddings", MemoryController.searchMemoriesWithEmbeddings);
router.post("/process-mesh/:memoryId", MemoryController.processMemoryForMesh);

// Hash-based queries
router.get("/hash/:hash", MemoryController.getMemoryByHash);
router.get("/exists/:hash", MemoryController.isMemoryStored);

// Health check
router.get("/health", MemoryController.healthCheck);

export default router;