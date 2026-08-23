import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
    getHealthProfile,
    putHealthProfile,
    deleteHealthProfile,
    aiExtractSection,
    userProvided,
    generateDoctorSummary,
} from "../controllers/healthProfileController.js";
import { validate } from "../middleware/validate.js";
import { healthProfileUserDataSchema } from "../validators/healthProfileValidators.js";

const router = express.Router();

router.get("/", protect, getHealthProfile);
router.put(
    "/userData",
    protect,
    validate(healthProfileUserDataSchema),
    putHealthProfile
);
router.delete("/", protect, deleteHealthProfile);
router.get("/ai-only", protect, aiExtractSection);
router.get("/user-only", protect, userProvided);
router.get("/summary", protect, generateDoctorSummary);
router.get("/summary/:patientId", protect, generateDoctorSummary);

export default router;