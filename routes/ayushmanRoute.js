import express from "express";
import { checkClaimStatus, getMyClaims } from "../controllers/ayushmanController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/check-status", protect, checkClaimStatus);
router.get("/my-claims", protect, getMyClaims);

export default router;