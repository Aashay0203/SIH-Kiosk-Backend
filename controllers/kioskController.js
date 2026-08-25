import fs from "fs";
import wrapAsync from "../utils/wrapAsync.js";
import KioskHistory from "../models/kioskHistorySchema.js";
import Report from "../models/reportSchema.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { speechToText, textToSpeech } from "../services/sarvamService.js";
import { getNextQuestion } from "../services/geminiService.js";
import PatientHealthProfile from "../models/patientHealthSumSchema.js";
import { processReportInBackground } from "../jobs/processReport.js";
import { generateKioskStructuredSummary } from "../services/geminiService.js";
import KioskSummary from "../models/kioskSummarySchema.js";



const OPENING_QUESTION_BY_LANGUAGE = {
    "hi-IN": "आज आप किस समस्या के लिए आए हैं?",
    "en-IN": "What brings you in today?",
    "bn-IN": "আজ আপনি কী সমস্যা নিয়ে এসেছেন?",
    "ta-IN": "இன்று நீங்கள் என்ன பிரச்சினையுடன் வந்துள்ளீர்கள்?",
};

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer, options) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(stream);
    });


export const startSession = async (req, res) => {
    try {
        const { patientId, appointmentId, language, mode } = req.body;
        console.log(req.body);
        const session = await KioskHistory.create({ patientId, appointmentId, language, mode });
        res.status(201).json({ sessionId: session._id });
    } catch (err) {
        res.status(500).json({ message: "Failed to start session" });
    }
};


export const getSession = async (req, res) => {
    try {
        const session = await KioskHistory.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });
        res.json(session);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch session" });
    }
};

export const handleVoiceTurn = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Patient answered by tapping an MCQ chip — req.body.answerText
        // arrives as a JSON string field. Patient answered by voice —
        // req.file is present instead, no answerText.
        const typedAnswer = req.body?.answerText;

        if (!req.file && !typedAnswer) {
            return res.status(400).json({ message: "Audio file or answer text is required" });
        }

        const session = await KioskHistory.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // 1. Get the patient's answer — transcribe if voice, use directly if tapped
        const transcribedText = req.file
            ? await speechToText(req.file.path, session.language)
            : typedAnswer;

        session.transcript.push({ role: "patient", text: transcribedText });

        // 2. Get next SOCRATES question from Gemini
        const geminiResult = await getNextQuestion(
            session.transcript,
            session.chiefComplaint
        );

        if (geminiResult.chiefComplaint && !session.chiefComplaint) {
            session.chiefComplaint = geminiResult.chiefComplaint;
        }
        if (geminiResult.redFlag && !session.redFlags.includes(geminiResult.redFlag)) {
            session.redFlags.push(geminiResult.redFlag);
        }

        session.transcript.push({ role: "ai", text: geminiResult.nextQuestion });
        await session.save();

        // 3. Generate TTS reply — best-effort, in-memory only
        let audioUrl = null;
        console.log("Session language is :", session.language)
        try {
            const audioBuffer = await textToSpeech(geminiResult.nextQuestion, session.language);
            // data: URI prefix is required — a bare base64 string is not
            // a valid <audio> src, the frontend assigns this straight in.
            audioUrl = `data:audio/wav;base64,${audioBuffer.toString("base64")}`;
        } catch (ttsErr) {
            console.error("TTS generation failed, continuing without audio:", ttsErr.message);
        }

        // 4. Delete the temporary file created by multer — only exists on voice turns
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            transcribedText,
            nextQuestion: geminiResult.nextQuestion,
            mcqOptions: geminiResult.mcqOptions || [],
            chiefComplaint: session.chiefComplaint,
            isComplete: geminiResult.isComplete,
            redFlag: geminiResult.redFlag,
            audioUrl,
        });

    } catch (err) {
        console.error("Voice turn error:", err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Voice turn failed", error: err.message });
    }
};


export const uploadKioskDoc = wrapAsync(async (req, res) => {
    const { sessionId } = req.params;
    console.log(sessionId);

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const session = await KioskHistory.findById(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
    }
    console.log(session);
    if (!session.patientId) {
        // Report.userId is required — a session that hasn't been linked to a
        // patient yet can't legally create one. Surface this instead of letting
        // report.save() throw a validation error downstream.
        return res.status(409).json({
            success: false,
            message: "This session isn't linked to a patient yet",
        });
    }

    const file = req.file;
    const sanitizedFileName = file.originalname
        .replace(/\s+/g, "_")
        .replace(/[()]/g, "");

    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "reports",
        resource_type: getResourceType(file.mimetype),
        public_id: sanitizedFileName,
    });

    const fileTypeEnum = mimeTypeMap[file.mimetype] || file.mimetype;

    const report = new Report({
        userId: session.patientId,           // patientId (KioskHistory) -> userId (Report)
        fileName: file.originalname,
        fileUrl: cloudinaryResult.secure_url,
        fileType: fileTypeEnum,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        cloudinaryPublicId: cloudinaryResult.public_id,
        reportType: req.body.reportType || "",
        uploadedBy: "Kiosk",
        reportDate: req.body.reportDate || null,
    });

    await report.save();

    // Fire-and-forget, same as reportController — extraction lands on the
    // Report doc asynchronously, not in this response.
    processReportInBackground(
        report._id,
        cloudinaryResult.secure_url,
        file.mimetype,
        session.patientId
    );

    session.reports.push(report._id);
    await session.save();

    return res.status(201).json({ success: true, reportId: report._id });
});


function formatHealthProfileContext(profile) {
    if (!profile) return null;
    const lines = [];
    if (profile.quickSummary?.shortSummary) lines.push(profile.quickSummary.shortSummary);
    const conditions = Object.entries(profile.userProvided?.conditions || {})
        .filter(([, v]) => v).map(([k]) => k);
    if (conditions.length) lines.push(`Known conditions: ${conditions.join(", ")}`);
    if (profile.userProvided?.allergies?.length)
        lines.push(`Allergies: ${profile.userProvided.allergies.join(", ")}`);
    if (profile.aiExtracted?.detectedAllergies?.length)
        lines.push(`AI-detected allergies (from past reports): ${profile.aiExtracted.detectedAllergies.join(", ")}`);
    if (profile.userProvided?.medications?.length)
        lines.push(`Current medications: ${profile.userProvided.medications.join(", ")}`);
    const flags = Object.entries(profile.aiExtracted?.specialFlags || {})
        .filter(([, v]) => v).map(([k]) => k);
    if (flags.length) lines.push(`Flagged from past labs: ${flags.join(", ")}`);
    return lines.length ? lines.join("\n") : null;
}

function formatReportsContext(reports) {
    if (!reports?.length) return null;
    return reports.map((r, i) => {
        if (r.aiStatus === "completed") {
            const preview = r.aiSummary?.plainSummary?.join(" ") || "No summary generated.";
            return `Document ${i + 1} (${r.fileName}): ${preview}`;
        }
        if (r.aiStatus === "failed") {
            return `Document ${i + 1} (${r.fileName}): analysis failed, not available.`;
        }
        return `Document ${i + 1} (${r.fileName}): analysis still in progress, not yet available.`;
    }).join("\n");
}
export const generateKioskSummary = wrapAsync(async (req, res) => {
    const { sessionId } = req.params;
    const { structuredSummary: submittedSummary, confirm } = req.body || {};
    const session = await KioskHistory.findById(sessionId).populate("reports");
    if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (confirm) {
        session.structuredSummary = submittedSummary;
        session.status = "pushed-to-his";
        await session.save();
        return res.status(200).json({ success: true, status: session.status });
    }

    const healthProfile = session.patientId
        ? await PatientHealthProfile.findOne({ userId: session.patientId })
        : null;

    const merged = await generateKioskStructuredSummary({
        transcript: session.transcript,
        language: session.language,
        mode: session.mode,
        healthProfileContext: formatHealthProfileContext(healthProfile),
        reportsContext: formatReportsContext(session.reports),
    });

    const { redFlags: newRedFlags, ...generatedSummary } = merged;

    session.structuredSummary = generatedSummary;
    session.redFlags = Array.from(new Set([...(session.redFlags || []), ...(newRedFlags || [])]));
    session.status = "summarized";
    await session.save();

    return res.status(200).json({
        success: true,
        structuredSummary: session.structuredSummary,
        status: session.status,
        redFlags: session.redFlags,
        digitizedDocs: session.reports.map((r) => ({
            reportId: r._id,
            docDate: r.reportDate || r.uploadedAt,
            aiStatus: r.aiStatus,
            preview:
                r.aiStatus === "completed"
                    ? r.aiSummary?.plainSummary?.[0] || "Analyzed"
                    : r.aiStatus === "failed"
                        ? "Analysis failed"
                        : "Analysis in progress",
        })),
    });
});


export const submitKioskSummary = wrapAsync(async (req, res) => {
    const { sessionId } = req.params;
    const { structuredSummary } = req.body;

    const session = await KioskHistory.findById(sessionId).populate("reports");
    if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
    }

    const digitizedDocs = (session.reports || []).map((r) => ({
        reportId: r._id,
        docDate: r.reportDate || r.uploadedAt,
        aiStatus: r.aiStatus,
        preview:
            r.aiStatus === "completed"
                ? r.aiSummary?.plainSummary?.[0] || "Analyzed"
                : r.aiStatus === "failed"
                    ? "Analysis failed"
                    : "Analysis in progress",
    }));

    const kioskSummary = await KioskSummary.findOneAndUpdate(
        { sessionId: session._id },
        {
            sessionId: session._id,
            patientId: session.patientId,
            appointmentId: session.appointmentId,
            ...structuredSummary,
            redFlags: session.redFlags || [],
            digitizedDocs,
            status: "pushed-to-his",
            submittedAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // keep the session's own copy in sync + mark it done
    session.structuredSummary = structuredSummary;
    session.status = "pushed-to-his";
    await session.save();

    return res.status(200).json({
        success: true,
        kioskSummaryId: kioskSummary._id,
        status: kioskSummary.status,
    });
});

export const getKioskGreeting = wrapAsync(async (req, res) => {
    const { sessionId } = req.params;

    const session = await KioskHistory.findById(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
    }

    const questionText =
        OPENING_QUESTION_BY_LANGUAGE[session.language] ||
        OPENING_QUESTION_BY_LANGUAGE["en-IN"];

    const audioBuffer = await textToSpeech(questionText, session.language);

    res.status(200).json({
        success: true,
        question: questionText,
        audioUrl: audioBuffer.toString("base64"),
    });
});