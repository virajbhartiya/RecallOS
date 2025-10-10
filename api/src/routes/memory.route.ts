import express from "express";
import { captureMemory } from "../controller/memory.controller";

const router = express.Router();

router.post("/", captureMemory());

export default router;
