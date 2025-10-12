import { Router } from "express";
import { MemoryController } from "../controller/memory.controller";

const router = Router();

// Memory processing and storage routes
router.post("/process", MemoryController.processRawContent); // Process raw content and store on blockchain
router.post("/", MemoryController.storeMemory); // Store single memory
router.post("/batch", MemoryController.storeMemoryBatch); // Store memory batch

// Query routes
router.get("/user/:userAddress", MemoryController.getUserMemories); // Get all memories for user
router.get("/user/:userAddress/count", MemoryController.getUserMemoryCount); // Get memory count
router.get("/user/:userAddress/memory/:index", MemoryController.getMemory); // Get specific memory by index
router.get("/user/:userAddress/recent", MemoryController.getRecentMemories); // Get recent memories
router.get("/user/:userAddress/by-url", MemoryController.getMemoriesByUrlHash); // Get memories by URL hash
router.get("/user/:userAddress/by-timestamp", MemoryController.getMemoriesByTimestampRange); // Get memories by timestamp range

// Hash-based queries
router.get("/hash/:hash", MemoryController.getMemoryByHash); // Get memory by hash
router.get("/exists/:hash", MemoryController.isMemoryStored); // Check if memory exists

// Health check
router.get("/health", MemoryController.healthCheck);

export default router;