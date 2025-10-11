import express from "express";
import { 
  captureMemory, 
  getMemory, 
  getUserMemories, 
  getMemoryMesh, 
  searchMemories, 
  getRelatedMemories 
} from "../controller/memory.controller";

const router = express.Router();

router.post("/", captureMemory());
router.get("/:id", getMemory());
router.get("/user/:wallet_address", getUserMemories());
router.get("/mesh/:wallet_address", getMemoryMesh());
router.get("/search/:wallet_address", searchMemories());
router.get("/:id/related", getRelatedMemories());

export default router;
