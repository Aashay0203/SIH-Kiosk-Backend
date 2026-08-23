import * as Sentry from "@sentry/node";
import PatientHealthProfile from "../models/patientHealthSumSchema.js";
import { updateHealthProfileManual } from "../jobs/updateHealthProfile.js";
import wrapAsync from "../utils/wrapAsync.js";

export const getHealthProfile = wrapAsync(async (req, res) => {
    const userId = req.user.userId;

    const profile = await PatientHealthProfile.findOne({ userId });
    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Health profile not found. Start by uploading reports or completing the setup form.",
            profile: null,
        });
    }

    res.status(200).json({ success: true, message: "Health profile retrieved", profile });
});

export const putHealthProfile = wrapAsync(async (req, res) => {
    const userId = req.user.userId;
    const userProvidedData = req.body;

    if (!userProvidedData || Object.keys(userProvidedData).length === 0) {
        return res.status(400).json({ success: false, message: "No health data provided" });
    }

    const updatedProfile = await updateHealthProfileManual(userId, userProvidedData);

    res.status(200).json({ success: true, message: "Health profile updated successfully", profile: updatedProfile });
});

export const deleteHealthProfile = wrapAsync(async (req, res) => {
    const userId = req.user.userId;

    const result = await PatientHealthProfile.deleteOne({ userId });
    if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: "Health profile not found" });
    }

    res.status(200).json({ success: true, message: "Health profile deleted successfully" });
});

export const aiExtractSection = wrapAsync(async (req, res) => {
    const userId = req.user.userId;

    const profile = await PatientHealthProfile.findOne({ userId }).select("aiExtracted");
    if (!profile) {
        return res.status(404).json({ success: false, message: "No AI-extracted health data found", aiExtracted: null });
    }

    res.status(200).json({ success: true, message: "AI-extracted data retrieved", aiExtracted: profile.aiExtracted });
});

export const userProvided = wrapAsync(async (req, res) => {
    const userId = req.user.userId;

    const profile = await PatientHealthProfile.findOne({ userId }).select("userProvided");
    if (!profile) {
        return res.status(404).json({ success: false, message: "No user-provided health data found", userProvided: null });
    }

    res.status(200).json({ success: true, message: "User-provided data retrieved", userProvided: profile.userProvided });
});

export const generateDoctorSummary = wrapAsync(async (req, res) => {
    const { patientId } = req.params;
    const targetUserId = patientId || req.user.userId;

    const profile = await PatientHealthProfile.findOne({ userId: targetUserId });
    if (!profile) {
        return res.status(404).json({ success: false, message: "Health profile not found for summary generation" });
    }

    const { synthesizeClinicalSummary } = await import("../services/geminiService.js");
    const summary = await synthesizeClinicalSummary(profile);

    if (summary) {
        profile.quickSummary = {
            criticalAlerts: summary.redFlagAlerts || [],
            shortSummary: summary.oneLiner || summary.chiefComplaintHpi || "",
            lastGenerated: new Date(),
        };
        await profile.save();
    }

    res.status(200).json({
        success: true,
        message: "Clinical summary generated successfully",
        summary: summary || {
            oneLiner: "Patient health profile loaded.",
            chiefComplaintHpi: profile.userProvided?.chiefComplaint || "No acute complaint documented.",
            pastAndMedsSummary: "No prior adverse history.",
            ayushSummary: profile.userProvided?.ayushAssessment?.prakriti ? `Prakriti: ${profile.userProvided.ayushAssessment.prakriti}` : null,
            keyLabFindings: "Standard parameters.",
            redFlagAlerts: profile.userProvided?.redFlagAlert?.isTriggered ? profile.userProvided.redFlagAlert.reasons : [],
            differentialSuggestions: [],
            suggestedWorkup: []
        }
    });
});
