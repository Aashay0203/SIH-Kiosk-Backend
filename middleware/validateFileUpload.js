// middleware/validateFileUpload.js
// 3-layer file validation: extension + MIME type + magic bytes
// Called AFTER multer has buffered the file (memoryStorage)

import path from "path";

// ─── Whitelists ───────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

// ─── Magic Bytes Signatures ───────────────────────────────────────────────────
// Each entry: { label, check: (buffer) => boolean }
// Buffer is the first 16 bytes of the file.

const MAGIC_SIGNATURES = [
    {
        label: "PDF",
        // %PDF-
        check: (buf) => buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46,
    },
    {
        label: "JPEG",
        // FF D8 FF
        check: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
    },
    {
        label: "PNG",
        // 89 50 4E 47 0D 0A 1A 0A
        check: (buf) =>
            buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
            buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
    },
    {
        label: "WEBP",
        // RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
        check: (buf) =>
            buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
            buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
    },
];

// ─── Size limit ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * validateFileUpload(req, res, next)
 *
 * Expects multer (memoryStorage) to have already run and set req.file.
 * Checks: presence → size → extension → MIME type → magic bytes.
 * Returns 400 with a specific message on any failure.
 */
function validateFileUpload(req, res, next) {
    const file = req.file;

    // 1. File presence
    if (!file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    // 2. Size check (belt-and-suspenders — multer limit should catch this first)
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
            message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
        });
    }

    // 3. Extension check
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({
            message: `File extension '${ext}' is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
        });
    }

    // 4. MIME type check
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return res.status(400).json({
            message: `File type '${file.mimetype}' is not allowed.`,
        });
    }

    // 5. Magic bytes check — read first 16 bytes of actual buffer
    const buf = file.buffer.slice(0, 16);
    const matched = MAGIC_SIGNATURES.some((sig) => sig.check(buf));

    if (!matched) {
        return res.status(400).json({
            message:
                "File content does not match a recognized format. Upload may be corrupt or disguised.",
        });
    }

    // 6. Extension ↔ MIME type consistency check
    //    Catches: file named report.pdf but MIME is image/jpeg
    const EXT_MIME_MAP = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    };

    const expectedMime = EXT_MIME_MAP[ext];
    if (expectedMime && file.mimetype !== expectedMime) {
        return res.status(400).json({
            message: `Extension '${ext}' does not match reported file type '${file.mimetype}'.`,
        });
    }

    next();
}

export default validateFileUpload;