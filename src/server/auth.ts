import { sign, verify } from "hono/jwt";
import type { Context, Next } from "hono";
import { get } from "./db";

export type UserRole = "admin" | "landlord" | "tenant";

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  full_name: string;
  role: UserRole;
  tenant_id: number | null;
  token_version?: number;
  created_at: string;
}

export interface AuthTokenPayload {
  [key: string]: unknown;
  sub: number;
  email: string;
  role: UserRole;
  full_name: string;
  tenant_id: number | null;
  v?: number;
  exp: number;
}


const JWT_DEFAULT_SECRET = "nestara-ai-jwt-dev-secret-key-at-least-32-chars-long";
const PBKDF2_ITERATIONS = 100000;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Constant-time byte buffer comparison to mitigate timing attacks.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Derives a PBKDF2-HMAC-SHA256 hash using the native Web Crypto API.
 */
export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const rawSalt = saltHex ? hexToBuffer(saltHex) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const salt = bufferToHex(rawSalt);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: rawSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    256
  );

  const hash = bufferToHex(derivedBits);
  return { hash, salt };
}

/**
 * Verifies a password against the stored hash and salt using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash: string, saltHex: string): Promise<boolean> {
  const { hash: computedHash } = await hashPassword(password, saltHex);
  const a = new Uint8Array(hexToBuffer(computedHash));
  const b = new Uint8Array(hexToBuffer(storedHash));
  return constantTimeEqual(a, b);
}

function getJwtSecret(c?: Context): string {
  // @ts-ignore Cloudflare environment binding or process.env
  const secret = c?.env?.JWT_SECRET ?? (typeof process !== "undefined" ? process.env?.JWT_SECRET : undefined);
  // @ts-ignore
  const isProd = c?.env?.ENVIRONMENT === "production" || (typeof process !== "undefined" && process.env?.NODE_ENV === "production");
  if (!secret) {
    if (isProd) {
      throw new Error("SECURITY FAULT: JWT_SECRET environment variable must be explicitly defined in production.");
    }
    return JWT_DEFAULT_SECRET;
  }
  return secret;
}

/**
 * Generates a signed JWT with 7-day expiration.
 */
export async function generateToken(user: UserRecord, c?: Context): Promise<string> {
  const secret = getJwtSecret(c);
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    tenant_id: user.tenant_id,
    v: user.token_version ?? 1,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  };

  return await sign(payload, secret, "HS256");
}

/**
 * Extracts and verifies the JWT from Authorization header or Cookie.
 * Validates cryptographic signature, expiration, and database token_version (SEC-07).
 */
export async function verifyToken(c: Context): Promise<AuthTokenPayload | null> {
  const authHeader = c.req.header("Authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    // Check cookie
    const cookieHeader = c.req.header("Cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)nestara_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) return null;

  try {
    const secret = getJwtSecret(c);
    const payload = (await verify(token, secret, "HS256")) as unknown as AuthTokenPayload;
    if (!payload || !payload.sub || !payload.role) {
      return null;
    }

    // Security Audit Fix (SEC-07): Token version check for immediate session revocation
    try {
      const dbUser = await get<{ token_version: number }>(
        "SELECT token_version FROM users WHERE id = ?",
        [payload.sub]
      );
      if (dbUser && typeof dbUser.token_version === "number" && typeof payload.v === "number") {
        if (dbUser.token_version !== payload.v) {
          // Token has been revoked via logout or password change
          return null;
        }
      }
    } catch {
      // If table is cold or being initialized, fallback gracefully
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware: requires an authenticated user.
 */
export async function requireAuth(c: Context, next: Next) {
  const user = await verifyToken(c);
  if (!user) {
    return c.json({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
  }
  c.set("user", user);
  await next();
}

/**
 * Middleware: restricts endpoint to specific roles.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = (c.get("user") as AuthTokenPayload | undefined) ?? (await verifyToken(c));
    if (!user) {
      return c.json({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
    }
    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Access forbidden: insufficient permissions", code: "FORBIDDEN" }, 403);
    }
    c.set("user", user);
    await next();
  };
}
