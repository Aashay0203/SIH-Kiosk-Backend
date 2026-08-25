import mongoose from "mongoose";

const digitizedDocSnapshotSchema = new mongoose.Schema(
    {
        reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
        docDate: { type: Date },
        aiStatus: { type: String, enum: ["pending", "processing", "completed", "failed"] },
        preview: { type: String, default: "" },
    },
    { _id: false }
);

const kioskSummarySchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "KioskHistory",
            required: true,
            unique: true, // one confirmed summary per kiosk session
        },
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },

        chiefComplaint: { type: String, default: "" },
        hpi: { type: String, default: "" },
        pastHistory: { type: String, default: "" },
        drugAllergyHistory: { type: String, default: "" },
        familyHistory: { type: String, default: "" },
        personalHistory: { type: String, default: "" },
        reviewOfSystems: { type: String, default: "" },
        plainSummary: { type: String, default: "" },

        redFlags: { type: [String], default: [] },
        digitizedDocs: { type: [digitizedDocSnapshotSchema], default: [] },

        status: {
            type: String,
            enum: ["summarized", "pushed-to-his"],
            default: "pushed-to-his",
        },
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model("KioskSummary", kioskSummarySchema);