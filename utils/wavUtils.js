// backend/utils/wavUtils.js

/**
 * Takes an array of base64-encoded WAV strings (each a complete WAV file,
 * as Sarvam TTS returns per-chunk) and merges them into a single valid
 * WAV buffer with one correct header.
 */
export function mergeWavChunks(base64Chunks) {
  if (!base64Chunks || base64Chunks.length === 0) {
    throw new Error("No audio chunks to merge");
  }

  // Single chunk — still run it through header validation/fix
  if (base64Chunks.length === 1) {
    const buffer = Buffer.from(base64Chunks[0], "base64");
    return fixWavHeader(buffer);
  }

  const pcmParts = [];
  let sampleRate, channels, bitsPerSample;

  for (const b64 of base64Chunks) {
    const buffer = Buffer.from(b64, "base64");
    const { fmt, dataStart, dataSize } = parseWav(buffer);

    // capture format from first chunk, sanity-check the rest match
    if (sampleRate === undefined) {
      sampleRate = fmt.sampleRate;
      channels = fmt.channels;
      bitsPerSample = fmt.bitsPerSample;
    } else if (fmt.sampleRate !== sampleRate || fmt.channels !== channels) {
      throw new Error("Audio chunks have mismatched format — cannot merge");
    }

    pcmParts.push(buffer.subarray(dataStart, dataStart + dataSize));
  }

  const pcmData = Buffer.concat(pcmParts);
  return buildWavBuffer(pcmData, sampleRate, channels, bitsPerSample);
}

/** Parses a WAV buffer and returns fmt info + data chunk location. */
function parseWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a valid WAV buffer");
  }

  let offset = 12;
  let fmt = null;
  let dataStart = null;
  let dataSize = null;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const declaredSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      fmt = {
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    }

    if (chunkId === "data") {
      dataStart = offset + 8;
      // trust the actual remaining buffer length over a possibly-corrupt declared size
      dataSize = Math.min(declaredSize, buffer.length - dataStart);
      break;
    }

    if (declaredSize > buffer.length) break; // corrupted chunk size — stop walking
    offset += 8 + declaredSize + (declaredSize % 2);
  }

  if (!fmt || dataStart === null) {
    throw new Error("Could not find fmt/data chunks in WAV buffer");
  }

  return { fmt, dataStart, dataSize };
}

/** Builds a fresh, correctly-headered WAV buffer from raw PCM data. */
function buildWavBuffer(pcmData, sampleRate, channels, bitsPerSample) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

/** Fixes a single WAV buffer's header if the declared size is wrong. */
function fixWavHeader(buffer) {
  const { dataStart, fmt } = parseWav(buffer);
  const actualDataSize = buffer.length - dataStart;
  return buildWavBuffer(buffer.subarray(dataStart, dataStart + actualDataSize), fmt.sampleRate, fmt.channels, fmt.bitsPerSample);
}