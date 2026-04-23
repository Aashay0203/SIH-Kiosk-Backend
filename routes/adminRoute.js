import express from "express";
import { getTodayAppointments } from "../controllers/adminController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { onlyAdminEmail } from "../middleware/adminOnly.js";

const router = express.Router();

router.get("/today", protect, onlyAdminEmail, getTodayAppointments);

export default router;