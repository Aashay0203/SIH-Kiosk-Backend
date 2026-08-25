import { SarvamAIClient } from "sarvamai";
import fs from "fs";

const client = new SarvamAIClient({
    apiSubscriptionKey: "sk_8r4b13o9_iM9kmArfXIchRk1iGZuFhAuO"
});

/* try {
    const response = await client.textToSpeech.convert({
        text: "Maa ka Bhosda, Aagg",
        language_code: "hi-IN",
        model: "bulbul:v3",
        speaker: "shubh",
    });

    // Decode the base64 audio before saving, since writing the raw string produces a corrupted file
    const audio = Buffer.from(response.audios.join(""), "base64");
    fs.writeFileSync("output.wav", audio);
} catch (error) {
    console.error("Error:", error);
} */

const audioFile = fs.createReadStream("output.wav"); // path to your own audio file
try {
    const response = await client.speechToText.transcribe({
        file: audioFile,
        model: "saaras:v3",
        mode: "transcribe",  // or "translate", "verbatim", "translit", "codemix"
    });
    console.log(response.transcript);
} catch (error) {
    console.error("Error:", error);
}