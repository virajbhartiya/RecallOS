import express from "express";
import { captureMemory, getMemory, getUserMemories } from "../controller/memory.controller";

const router = express.Router();

router.post("/", captureMemory());
router.get("/:id", getMemory());
router.get("/user/:wallet_address", getUserMemories());

export default router;
