import express from "express";
import { moveQueueNext } from "../controllers/queueController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Only doctor/admin can move queue
router.put(
    "/next",
    protect,
    roleMiddleware("doctor"),
    moveQueueNext
);

export default router;