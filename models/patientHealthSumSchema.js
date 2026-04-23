// backend/models/PatientHealthProfile.js
import mongoose from "mongoose";

const valueSchema = {
    value: { type: String, default: null },
    unit: { type: String, default: null },
    status: {
        type: String,
        enum: ["High", "Low", "Normal", "Critical", "Unknown"],
        default: "Unknown",
    },
    referenceRange: { type: String, default: null },
    lastUpdated: { type: Date, default: null },
};

const patientHealthProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        // ───────────────── AI EXTRACTED DATA ─────────────────
        aiExtracted: {
            bloodGroup: { type: String, default: null },

            detectedAllergies: [String],
            currentMedications: [String],

            // 🧪 Lab Values (Top doctor-required fields)
            labValues: {
                hemoglobin: valueSchema,
                wbc: valueSchema,
                platelets: valueSchema,
                bloodSugar: valueSchema,
                creatinine: valueSchema,
                urea: valueSchema,
                sodium: valueSchema,
                potassium: valueSchema,
                sgpt: valueSchema,
                sgot: valueSchema,
                bilirubin: valueSchema,
                cholesterol: valueSchema,
            },

            // 🚨 AI Flags (important conditions detected)
            specialFlags: {
                anemia: { type: Boolean, default: false },
                infection: { type: Boolean, default: false },
                kidneyIssue: { type: Boolean, default: false },
                liverIssue: { type: Boolean, default: false },
                diabetesRisk: { type: Boolean, default: false },
            },

            // 🧠 AI Insights (human readable)
            personalizedInsights: [String],

            // 📈 Trends (very powerful feature)
            trends: {
                hemoglobin: { type: String, default: null }, // "Increasing"
                wbc: { type: String, default: null },
                sugar: { type: String, default: null },
            },

            lastUpdated: { type: Date, default: null },
        },

        // ───────────────── USER PROVIDED DATA ─────────────────
        userProvided: {
            // 🧠 Conditions
            conditions: {
                diabetes: { type: Boolean, default: false },
                hypertension: { type: Boolean, default: false },
                thyroid: { type: Boolean, default: false },
            },

            // 🧾 Past Medical History
            pastEvents: {
                surgeries: [String],
                injuries: [String],
                majorIllness: [String],
            },

            // 💊 Medications (manual input fallback)
            medications: [String],

            // ⚠️ Allergies (manual fallback)
            allergies: [String],

            // 🧬 Family History
            familyHistory: {
                diabetes: { type: Boolean, default: false },
                heartDisease: { type: Boolean, default: false },
                cancer: { type: Boolean, default: false },
                geneticConditions: [String],
            },

            // 🚨 Lifestyle
            lifestyle: {
                smoking: {
                    type: String,
                    enum: ["Never", "Current", "Former"],
                    default: null,
                },
                alcohol: {
                    type: String,
                    enum: ["Never", "Occasionally", "Regularly"],
                    default: null,
                },
            },

            // 🤒 Symptoms
            currentSymptoms: [String],

            completedAt: { type: Date, default: null },
        },

        // ───────────────── QUICK DOCTOR VIEW ─────────────────
        quickSummary: {
            criticalAlerts: [String], // ["Severe anemia", "High infection"]
            shortSummary: { type: String, default: null },
            lastGenerated: { type: Date, default: null },
        },

        // ───────────────── METADATA ─────────────────
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model(
    "PatientHealthProfile",
    patientHealthProfileSchema
);