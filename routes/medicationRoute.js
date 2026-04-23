import express from "express";
import {
    getMedication,
    addMedication,
    updateMedication,
    resetDailyMedications,
} from "../controllers/medicationController.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
    addMedicationSchema,
    updateMedicationSchema,
    medicationIdParamSchema,
} from "../validators/medicationValidators.js";

const router = express.Router();

router.get("/", protect, getMedication);
router.post("/", protect, validate(addMedicationSchema), addMedication);
// reset-daily MUST come before /:id or Express matches it as a param
router.patch("/reset-daily", protect, resetDailyMedications);
router.patch(
    "/:id",
    protect,
    validate(medicationIdParamSchema, "params"),
    validate(updateMedicationSchema),
    updateMedication
);

export default router;