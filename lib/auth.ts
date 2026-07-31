import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Ensure critical secrets exist in production
function getSecret(key: string): string {
  const secret = process.env[key];
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing mandatory environment variable: ${key}`);
    }
    return `fallback-${key}-dev-only`;
  }
  return secret;
}

const ACCESS_SECRET = getSecret("JWT_ACCESS_SECRET");
const REFRESH_SECRET = getSecret("JWT_REFRESH_SECRET");

interface AccessTokenPayload {
  userId: string;
  agencyId: string;
  role?: UserRole | string;
}

/**
 * Retrieves the current session user on the server side.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user;
}

/**
 * Password Hashing & Verification
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Custom Token Generation (for External APIs / Mobile Apps / Interceptors)
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}