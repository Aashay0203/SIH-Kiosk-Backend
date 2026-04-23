import express from "express";
import multer from "multer";
import protect from "../middleware/authMiddleware.js";
import validateFileUpload from "../middleware/validateFileUpload.js";
import {
    saveCloudinaryResult,
    getAllReport,
    getSingleReport,
    saveMetaData,
    deleteReport,
    aiStatus,
    regenerateSummary,
} from "../controllers/reportController.js";
import { validate } from "../middleware/validate.js";
import {
    reportMetaSchema,
    reportIdParamSchema,
} from "../validators/reportValidators.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ── Non-param routes first ──────────────────────────────────────────
router.post("/upload", protect, upload.single("report"), validateFileUpload, saveCloudinaryResult);
router.get("/", protect, getAllReport);

// ── Specific :id sub-routes ─────────────────────────────────────────
router.get(
    "/:id/ai-status",
    protect,
    validate(reportIdParamSchema, "params"),
    aiStatus
);
router.post(
    "/:id/regenerate-summary",
    protect,
    validate(reportIdParamSchema, "params"),
    regenerateSummary
);

// ── Generic :id catch-all — always last ────────────────────────────
router.get(
    "/:id",
    protect,
    validate(reportIdParamSchema, "params"),
    getSingleReport
);
router.patch(
    "/:id",
    protect,
    validate(reportIdParamSchema, "params"),
    validate(reportMetaSchema),
    saveMetaData
);
router.delete(
    "/:id",
    protect,
    validate(reportIdParamSchema, "params"),
    deleteReport
);

export default router;