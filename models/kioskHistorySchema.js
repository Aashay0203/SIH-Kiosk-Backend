import mongoose from "mongoose";

const kioskHistorySchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    language: { type: String, default: 'hi-IN' },
    mode: { type: String, enum: ["standard", "ayush"], default: "standard" },
    transcript: [{
        role: { type: String, enum: ["ai", "patient"] },
        text: String,
        audioUrl: String,
        timestamp: { type: Date, default: Date.now }
    }],
    chiefComplaint: String,
    redFlags: [String],
    digitizedDocs: [{
        fileUrl: String,
        ocrText: String,
        extracted: {
            diagnosis: String,
            medicines: [{ name: String, dosage: String }],
            labValues: [{ name: String, value: String, unit: String, flag: String }]
        },
        docDate: Date
    }],

    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],

    structuredSummary: {
        chiefComplaint: String,
        hpi: String,
        pastHistory: String,
        drugAllergyHistory: String,
        familyHistory: String,
        personalHistory: String,
        reviewOfSystems: String,
        plainSummary: String
    },
    redFlags: { type: [String], default: [] },
    status: { type: String, enum: ["in-progress", "summarized", "pushed-to-his"], default: "in-progress" }
}, { timestamps: true });

export default mongoose.model("KioskHistory", kioskHistorySchema);