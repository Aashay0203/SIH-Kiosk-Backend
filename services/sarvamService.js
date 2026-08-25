import fs from "node:fs";
import { SarvamAIClient } from "sarvamai";
import { mergeWavChunks } from "../utils/wavUtils.js";

const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY
});


export async function speechToText(filePath, language) {
    if (!filePath) {
        throw new Error("File path is not present for speech to text");
    }

    const audioFile = fs.createReadStream(filePath);

    const response = await client.speechToText.transcribe({
        file: audioFile,
        model: "saaras:v3",
        mode: "transcribe",
    });

    return response.transcript;
}

export async function textToSpeech(text, language) {
    if (!text) {
        throw new Error("Text is not present for text to speech");
    }
    const response = await client.textToSpeech.convert({
        text: text,
        language_code: language,
        model: "bulbul:v3",
        speaker: "ritu",
    });

    // Properly merge chunks into one valid WAV file (fixes corrupted headers
    // and multi-chunk concatenation bugs)
    return mergeWavChunks(response.audios);
}