import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a raw PIN string using AES-256-CBC.
 * Key: process.env.PIN_ENCRYPTION_SECRET (64 hex chars = 32 bytes)
 * Returns: "<iv_hex>:<encrypted_hex>"
 */
export const encryptPin = (rawPin) => {
    const key = Buffer.from(process.env.PIN_ENCRYPTION_SECRET, "utf8");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(rawPin, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

/**
 * Decrypts an encrypted PIN string produced by encryptPin().
 * Returns the original rawPin string.
 */
export const decryptPin = (encryptedPin) => {
    const [ivHex, encryptedHex] = encryptedPin.split(":");
    const key = Buffer.from(process.env.PIN_ENCRYPTION_SECRET, "utf8");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedBuffer = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString("utf8");
};
