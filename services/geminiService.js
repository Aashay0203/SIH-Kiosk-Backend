import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import logger from "../utils/logger.js"

// ───────────────── CONFIG ─────────────────
function getGeminiModel() {
    return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

// ───────────────── FILE FETCH ─────────────────
async function fetchFileAsBase64(url) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const base64 = Buffer.from(response.data, "binary").toString("base64");
    const contentType =
        response.headers["content-type"] || "application/octet-stream";
    return { base64, contentType };
}

function resolveMimeType(fileType, contentType) {
    if (contentType && contentType !== "application/octet-stream")
        return contentType;

    const map = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
    };

    return map[(fileType || "").toLowerCase()] || "application/pdf";
}

// ───────────────── SAFE JSON PARSER ─────────────────
function parseGeminiJSON(text) {
    if (!text || typeof text !== "string") {
        throw new Error("Gemini returned an empty response");
    }

    try {
        const clean = text.replace(/```json|```/gi, "").trim();
        return JSON.parse(clean);
    } catch (err) {
        console.error("Raw Gemini Response:", text);
        throw new Error("Invalid JSON returned by Gemini");
    }
}

// ───────────────── ANALYZE SINGLE REPORT ─────────────────
export async function analyzeReport(cloudinaryUrl, fileType) {
    if (!process.env.GEMINI_API_KEY)
        throw new Error("GEMINI_API_KEY is not set.");

    const { base64, contentType } = await fetchFileAsBase64(cloudinaryUrl);
    const mimeType = resolveMimeType(fileType, contentType);

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are an expert medical data extraction AI.

STRICT RULES:
- Return ONLY valid JSON. No markdown, no explanation, no preamble.
- Do NOT hallucinate. If a value is not explicitly present in the document → use null.
- Empty arrays [] are required when no items found — never null for array fields.
- Extract ALL parameters visible in the report for testTable.
- Use correct medical interpretation for status.

STATUS RULE:
Compare value with reference range. Return: "High", "Low", "Normal", "Critical", or "Unknown".

OUTPUT FORMAT (return this exact structure):
{
  "testTable": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string",
      "referenceRange": "string",
      "status": "High|Low|Normal|Critical|Unknown"
    }
  ],
  "extractedHealthData": {
    "bloodGroup": null,
    "hemoglobin": null,
    "wbc": null,
    "platelets": null,
    "bloodSugar": null,
    "creatinine": null,
    "urea": null,
    "sodium": null,
    "potassium": null,
    "sgpt": null,
    "sgot": null,
    "bilirubin": null,
    "cholesterol": null,
    "detectedAllergies": [],
    "currentMedications": []
  },
  "specialFlags": {
    "anemia": false,
    "infection": false,
    "kidneyIssue": false,
    "liverIssue": false,
    "diabetesRisk": false
  },
  "plainSummary": [],
  "reportTypeDetected": "CBC|LFT|KFT|Lipid Profile|Sugar|X-Ray|Prescription|ECG|Unknown"
}

MEDICAL LOGIC FOR specialFlags:
- Low hemoglobin → anemia: true
- High WBC/neutrophils → infection: true
- High creatinine/urea → kidneyIssue: true
- High SGPT/SGOT → liverIssue: true
- High fasting/PP sugar → diabetesRisk: true

PLAIN SUMMARY RULES (for the "plainSummary" array):
- Return exactly 4–6 strings in the array.
- Each string is one short line (no paragraphs).
- Written in Hinglish (Hindi + simple English mix).
- Each string MUST start with a severity emoji: 🟢 (normal/good), 🟡 (mild concern), 🔴 (serious issue).
- 💡 for diet/lifestyle tip, 👨‍⚕️ for doctor advice.
- No medical jargon — explain simply. If using a term, explain it.
- Example:
  [
    "🟢 Hemoglobin normal hai, khoon ki kami nahi",
    "🟡 Urea thoda high hai, kidney pe halka pressure ho sakta hai",
    "🔴 SGPT high hai — liver ko attention chahiye",
    "🟢 Sodium aur Potassium bilkul theek hain",
    "💡 Pani zyada piyen, oily khana avoid karein",
    "👨‍⚕️ Doctor se follow-up karna better rahega"
  ]
`;

    try {
        let response;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                response = await ai.models.generateContent({
                    model: getGeminiModel(),
                    contents: [
                        {
                            parts: [
                                { inlineData: { mimeType, data: base64 } },
                                { text: prompt },
                            ],
                        },
                    ],
                });
                break;
            } catch (error) {
                if (!isRetryableGeminiError(error) || attempt === 3) throw error;
                await wait(attempt * 1000);
            }
        }

        return parseGeminiJSON(response.text);
    } catch (error) {
        const status = error.status || error.code || error.error?.code || "unknown";
        logger.error(`Gemini API error during report analysis (status ${status}): ${error.message}`);
        return null;
    }
}

// ───────────────── BUILD HEALTH PROFILE ─────────────────
export async function buildHealthProfile(allReports) {
    if (!allReports || allReports.length === 0) return null;

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are a medical AI assistant. Consolidate these ${allReports.length} report summaries into a unified patient health profile. Return ONLY valid JSON, no markdown, no preamble.

SUMMARIES: ${JSON.stringify(allReports, null, 2)}

Return this exact JSON:
{
  "bloodGroup": null,
  "detectedAllergies": [],
  "currentMedications": [],
  "hemoglobin": { "value": null, "unit": null, "status": "Unknown" },
  "wbc": { "value": null, "unit": null, "status": "Unknown" },
  "platelets": { "value": null, "unit": null, "status": "Unknown" },
  "bloodSugar": { "value": null, "unit": null, "status": "Unknown" },
  "creatinine": { "value": null, "unit": null, "status": "Unknown" },
  "urea": { "value": null, "unit": null, "status": "Unknown" },
  "sodium": { "value": null, "unit": null, "status": "Unknown" },
  "potassium": { "value": null, "unit": null, "status": "Unknown" },
  "sgpt": { "value": null, "unit": null, "status": "Unknown" },
  "sgot": { "value": null, "unit": null, "status": "Unknown" },
  "bilirubin": { "value": null, "unit": null, "status": "Unknown" },
  "cholesterol": { "value": null, "unit": null, "status": "Unknown" },
  "specialFlags": {
    "anemia": false,
    "infection": false,
    "kidneyIssue": false,
    "liverIssue": false,
    "diabetesRisk": false
  },
  "personalizedInsights": [],
  "trends": {
    "hemoglobin": null,
    "wbc": null,
    "sugar": null
  }
}
Rules: Use most recent value when duplicates exist across reports. status must be High/Low/Normal/Unknown. trends should be Increasing/Decreasing/Stable/null based on multiple reports. Never hallucinate.
`;

    try {
        const response = await ai.models.generateContent({
            model: getGeminiModel(),
            contents: [{ parts: [{ text: prompt }] }],
        });

        return parseGeminiJSON(response.text);
    } catch (error) {
        logger.error({ message: "Gemini API error during profile building", error: error.message });
        return null;
    }
}

function isRetryableGeminiError(error) {
    const status = Number(error.status || error.code || error.error?.code);
    return [429, 500, 502, 503, 504].includes(status);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));