import { Router } from "express";
import { MemoryController } from "../controller/memory.controller";

const router = Router();

// Memory storage routes
router.post("/", MemoryController.storeMemories); // Root POST route
router.post("/store", MemoryController.storeMemories);
router.get("/status/:hash", MemoryController.getMemoryStatus);
router.get("/user/:userAddress/count", MemoryController.getUserMemoryCount);
router.get("/batch/:merkleRoot", MemoryController.getBatchMetadata);
router.post("/proof", MemoryController.generateProof);
router.get("/health", MemoryController.healthCheck);

export default router;