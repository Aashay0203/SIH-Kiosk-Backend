import express from "express";
import multer from "multer";
import { startSession, handleVoiceTurn, getSession, uploadKioskDoc, generateKioskSummary, submitKioskSummary, getKioskGreeting } from "../controllers/kioskController.js";
import { submitKioskSummarySchema } from "../validators/kioskValidators.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Save incoming files temporarily to an 'uploads' folder

const uploadAudio = multer({ dest: "uploads/" });        // disk — existing, for STT
const uploadDoc = multer({ storage: multer.memoryStorage() }); // memory — for Cloudinary buffer upload

router.post("/start", startSession);


router.post("/:sessionId/voice-answer", uploadAudio.single("audio"), handleVoiceTurn);
router.post("/:sessionId/upload-doc", uploadDoc.single("document"), uploadKioskDoc);
router.post("/:sessionId/generate-summary", generateKioskSummary);
router.post(
    "/:sessionId/submit-summary",
    validate(submitKioskSummarySchema),
    submitKioskSummary
);
router.get("/:sessionId/greeting", getKioskGreeting);

router.get("/:sessionId", getSession);

export default router;
