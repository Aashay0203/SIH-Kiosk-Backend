// checkAudio.js
import { parseFile } from "music-metadata";

const meta = await parseFile("./test-audio.wav");
console.log("Duration (sec):", meta.format.duration);
console.log("Sample rate:", meta.format.sampleRate);
console.log("Channels:", meta.format.numberOfChannels);
console.log("Codec:", meta.format.codec);