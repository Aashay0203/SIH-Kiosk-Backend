import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
    getHealthProfile,
    putHealthProfile,
    deleteHealthProfile,
    aiExtractSection,
    userProvided,
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

export default router;