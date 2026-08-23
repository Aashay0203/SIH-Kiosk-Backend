// backend/jobs/updateHealthProfile.js
import Report from "../models/reportSchema.js";
import PatientHealthProfile from "../models/patientHealthSumSchema.js";
import { buildHealthProfile } from "../services/geminiService.js";
import logger from "../utils/logger.js"

/**
 * updateHealthProfileAI(userId)
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered after a report is processed by Gemini.
 * 1. Fetches all COMPLETED reports for this user
 * 2. Extracts their aiSummary objects
 * 3. Calls Gemini's buildHealthProfile() to consolidate
 * 4. Upserts the result into PatientHealthProfile.aiExtracted
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function updateHealthProfileAI(userId) {
    try {
        logger.info({ message: `[Health Profile] Starting AI extraction for user ${userId}` });

        // Step 1: Fetch all COMPLETED reports ordered by date (newest first)
        const completedReports = await Report.find({
            userId,
            aiStatus: "completed",
        })
            .sort({ reportDate: -1 })
            .select("aiSummary reportDate");

        if (!completedReports || completedReports.length === 0) {
            logger.info({
                message:
                    `[Health Profile] No completed reports found for user ${userId}`
            }
            );
            return;
        }

        // Step 2: Extract all aiSummary objects
        const allReportSummaries = completedReports
            .map((report) => report.aiSummary)
            .filter((summary) => summary); // Filter out any null/undefined

        if (allReportSummaries.length === 0) {
            logger.info({
                message:
                    `[Health Profile] No aiSummary data to process for user ${userId}`
            }
            );
            return;
        }

        logger.info({
            message:
                `[Health Profile] Processing ${allReportSummaries.length} reports for user ${userId}`
        }
        );

        // Step 3: Call Gemini to consolidate
        const consolidatedData = await buildHealthProfile(allReportSummaries);

        if (!consolidatedData) {
            logger.error({
                message: `Gemini returned null consolidation for user ${userId}`
            });
            return null;
        }

        // Step 4: Prepare aiExtracted section
        const aiExtractedData = {
            bloodGroup: consolidatedData.bloodGroup || null,
            detectedAllergies: consolidatedData.detectedAllergies || [],
            currentMedications: consolidatedData.currentMedications || [],

            // Map lab values from consolidation
            labValues: {
                hemoglobin: consolidatedData.hemoglobin || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                wbc: consolidatedData.wbc || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                platelets: consolidatedData.platelets || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                bloodSugar: consolidatedData.bloodSugar || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                creatinine: consolidatedData.creatinine || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                urea: consolidatedData.urea || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                sodium: consolidatedData.sodium || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                potassium: consolidatedData.potassium || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                sgpt: consolidatedData.sgpt || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                sgot: consolidatedData.sgot || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                bilirubin: consolidatedData.bilirubin || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
                cholesterol: consolidatedData.cholesterol || {
                    value: null,
                    unit: null,
                    status: "Unknown",
                },
            },

            specialFlags: consolidatedData.specialFlags || {
                anemia: false,
                infection: false,
                kidneyIssue: false,
                liverIssue: false,
                diabetesRisk: false,
            },

            personalizedInsights:
                consolidatedData.personalizedInsights || [],

            lastUpdated: new Date(),
        };

        // Step 5: Upsert into PatientHealthProfile
        const profile = await PatientHealthProfile.findOneAndUpdate(
            { userId },
            { aiExtracted: aiExtractedData },
            { upsert: true, returnDocument: "after" }
        );

        logger.info({
            message:
                `[Health Profile] Successfully updated profile for user ${userId}`
        }
        );
        return profile;
    } catch (error) {
        logger.error({
            message: `[Health Profile] Error updating profile for user ${userId}:`,
            error: error.message
        });
        return null;
    }
}

/**
 * updateHealthProfileManual(userId, userProvidedData)
 * ─────────────────────────────────────────────────────────────────────────────
 * Called when user submits the HealthProfileSetup form.
 * Saves user-provided medical history into PatientHealthProfile.userProvided
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function updateHealthProfileManual(userId, userProvidedData) {
    try {
        logger.info({ message: `[Health Profile] Saving user data for user ${userId}` });

        const profile = await PatientHealthProfile.findOneAndUpdate(
            { userId },
            {
                userProvided: {
                    ...userProvidedData,
                    completedAt: new Date(),
                },
            },
            { upsert: true, returnDocument: "after" }
        );

        logger.info({
            message:
                `[Health Profile] User data saved for user ${userId}`
        }
        );
        return profile;
    } catch (error) {
        console.error({
            message:
                `[Health Profile] Error saving user data for user ${userId}:`,
            error: error.message
        }
        );
        throw error;
    }
}