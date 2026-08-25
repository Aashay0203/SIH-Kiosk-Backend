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

// ───────────────── KIOSK: NEXT QUESTION (SOCRATES) ─────────────────
const KIOSK_SYSTEM_PROMPT = `You are a clinical history-taking assistant conducting a structured patient interview before a doctor's consultation, based on the SOCRATES framework (Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity).

Rules:
- If this is the patient's FIRST statement (no prior chief complaint established), identify their chief complaint in a few words and ask your first SOCRATES follow-up question.
- Otherwise, review the conversation so far and ask the next most clinically useful SOCRATES question that hasn't been covered yet.
- Ask ONE question at a time, in simple, plain language suitable for text-to-speech playback to a patient with possibly low health literacy.
- For every question, also provide 2-4 short tappable answer options (mcqOptions) covering the most likely answers, so patients who prefer touch over speech can respond without talking. Keep each option under 4 words, in the same language as the question. If the question genuinely has no sensible fixed options (e.g. "describe your pain in your own words"), return an empty array — but prefer providing options whenever the question has a natural bounded set of answers (yes/no, body locations, durations, severity levels, etc).
- Detect red flags: if the patient describes symptoms suggesting a medical emergency (e.g. chest pain with breathlessness, stroke symptoms like facial drooping/slurred speech/sudden weakness, severe uncontrolled bleeding, loss of consciousness), set redFlag to a short description of the concern. Otherwise set redFlag to null.
- Mark isComplete true once you have covered chief complaint, onset, character, associated symptoms, and severity at minimum — do not drag the interview out unnecessarily.
- Always respond in the same language as the patient's most recent message.
- Respond with ONLY valid JSON, no markdown fences, no preamble. Format exactly:
{"chiefComplaint": "string or null if already established", "nextQuestion": "string", "mcqOptions": ["string", "..."], "isComplete": boolean, "redFlag": "string or null"}`;

export async function getNextQuestion(transcript, chiefComplaint) {
    if (!process.env.GEMINI_API_KEY)
        throw new Error("GEMINI_API_KEY is not set.");

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const conversationText = transcript
        .map(t => `${t.role === "patient" ? "Patient" : "AI"}: ${t.text}`)
        .join("\n");

    const prompt = `${KIOSK_SYSTEM_PROMPT}

Current chief complaint on file: ${chiefComplaint || "none yet — extract from conversation"}

Conversation so far:
${conversationText}`;

    try {
        let response;
        let parsed;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                response = await ai.models.generateContent({
                    model: getGeminiModel(),
                    contents: [{ parts: [{ text: prompt }] }],
                });
                parsed = parseGeminiJSON(response.text); // moved inside the loop
                break;
            } catch (error) {
                if (attempt === 3) throw error;
                await wait(attempt * 1000);
            }
        }
        return parsed;
    } catch (error) {
        const status = error.status || error.code || error.error?.code || "unknown";
        logger.error(`Gemini API error during kiosk voice turn (status ${status}): ${error.message}`);
        throw error; // controller needs to know this failed — don't silently return null here
    }
}

const KIOSK_SUMMARY_PROMPT = `You are generating a structured clinical intake note for a doctor, based on a kiosk-recorded patient interview conducted before their consultation.

You will receive:
1. The full patient-AI conversation transcript
2. The patient's existing health profile (if any prior history exists)
3. Any documents the patient uploaded at the kiosk today (lab reports, prescriptions), with their AI-extracted findings if analysis has completed, or a note that analysis is still in progress

Write clinical fields in plain clinical English regardless of the patient's spoken language — doctors reviewing this expect standard clinical shorthand. Do NOT hallucinate values not present in the transcript or provided context.

Return ONLY valid JSON, no markdown, no preamble, in exactly this shape:
{
  "chiefComplaint": "string",
  "hpi": "string — history of present illness, narrative form",
  "pastHistory": "string — past medical/surgical history, drawing on the health profile if relevant",
  "drugAllergyHistory": "string — current medications and known allergies",
  "familyHistory": "string",
  "personalHistory": "string — lifestyle factors: smoking, alcohol, occupation if mentioned",
  "reviewOfSystems": "string",
  "plainSummary": "string — a SINGLE short paragraph (not an array), written in {{LANGUAGE}}, simple enough to read aloud to the patient via text-to-speech, recapping what was discussed",
  "redFlags": ["string — short description of any urgent/emergency concern, empty array if none"]
}

Leave any field as an empty string "" if the transcript and context genuinely don't cover it — do not invent content to fill a field.`;

export async function generateKioskStructuredSummary({
    transcript,
    language,
    mode,
    healthProfileContext,
    reportsContext,
}) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const conversationText = transcript
        .map((t) => `${t.role === "patient" ? "Patient" : "AI"}: ${t.text}`)
        .join("\n");

    const prompt = `${KIOSK_SUMMARY_PROMPT.replace("{{LANGUAGE}}", language || "the patient's spoken language")}

Interview mode: ${mode === "ayush" ? "AYUSH (also note any relevant dosha/lifestyle observations if the patient volunteered them)" : "standard"}

CONVERSATION TRANSCRIPT:
${conversationText}

PATIENT HEALTH PROFILE:
${healthProfileContext || "No prior health profile on file."}

DOCUMENTS UPLOADED TODAY:
${reportsContext || "No documents uploaded."}`;

    let response;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            response = await ai.models.generateContent({
                model: getGeminiModel(),
                contents: [{ parts: [{ text: prompt }] }],
            });
            break;
        } catch (error) {
            if (!isRetryableGeminiError(error) || attempt === 3) throw error;
            await wait(attempt * 1000);
        }
    }

    return parseGeminiJSON(response.text);
}