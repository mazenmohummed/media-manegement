import crypto from "crypto";

const KEY_PREFIX = "sk_live_";

/**
 * Generates a un-hashed API key for the user (shown ONCE)
 * and its SHA-256 hash for database storage.
 */
export function generateApiKey() {
  // Generate 24 random bytes -> 48 hex characters
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `${KEY_PREFIX}${randomBytes}`;

  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,     // Show this ONCE to the frontend user
    keyHash,    // Store this in PostgreSQL
  };
}

/**
 * Hashes an incoming raw API key using SHA-256 for fast, safe DB matching.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}