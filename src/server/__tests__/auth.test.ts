import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  type UserRecord,
} from "../auth";
import { sign, verify } from "hono/jwt";

describe("Authentication & Cryptography — PBKDF2 Password Hashing", () => {
  it("generates a distinct salt and hash for passwords", async () => {
    const { hash, salt } = await hashPassword("SecureP@ssw0rd123!");
    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(hash.length).toBe(64); // 32 bytes hex encoded = 64 characters
    expect(salt.length).toBe(32); // 16 bytes hex encoded = 32 characters
  });

  it("produces distinct salts and hashes for the same password across invocations (CSPRNG salt)", async () => {
    const res1 = await hashPassword("SameSecretPasscode");
    const res2 = await hashPassword("SameSecretPasscode");
    expect(res1.salt).not.toBe(res2.salt);
    expect(res1.hash).not.toBe(res2.hash);
  });

  it("correctly verifies matching password against stored hash and salt", async () => {
    const password = "ResidentPortalLogin2026";
    const { hash, salt } = await hashPassword(password);
    const isValid = await verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);
  });

  it("rejects wrong password against valid hash and salt", async () => {
    const { hash, salt } = await hashPassword("CorrectSecret");
    const isValid = await verifyPassword("WrongGuess", hash, salt);
    expect(isValid).toBe(false);
  });

  it("rejects password check when salt or hash is altered", async () => {
    const { hash, salt } = await hashPassword("SecretPassword");
    const alteredHash = hash.slice(0, -2) + "ff";
    const isValid = await verifyPassword("SecretPassword", alteredHash, salt);
    expect(isValid).toBe(false);
  });
});

describe("Authentication & Cryptography — JWT Session Generation & Signature", () => {
  const dummyUser: UserRecord = {
    id: 42,
    email: "priya.sharma@example.com",
    password_hash: "dummyhash",
    salt: "dummysalt",
    full_name: "Priya Sharma",
    role: "tenant",
    tenant_id: 10,
    token_version: 1,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("generates a standard 3-part signed JWT", async () => {
    const token = await generateToken(dummyUser);
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });

  it("embeds user claims, role, and expiration into token payload", async () => {
    const token = await generateToken(dummyUser);
    const secret = "nestara-ai-jwt-dev-secret-key-at-least-32-chars-long";
    const payload = (await verify(token, secret, "HS256")) as Record<string, unknown>;

    expect(payload.sub).toBe(42);
    expect(payload.email).toBe("priya.sharma@example.com");
    expect(payload.role).toBe("tenant");
    expect(payload.full_name).toBe("Priya Sharma");
    expect(payload.v).toBe(1);
    expect(typeof payload.exp).toBe("number");
    expect(payload.exp as number).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("fails verification when token signature is tampered", async () => {
    const token = await generateToken(dummyUser);
    const tampered = token.slice(0, -4) + "abcd";
    const secret = "nestara-ai-jwt-dev-secret-key-at-least-32-chars-long";
    await expect(verify(tampered, secret, "HS256")).rejects.toThrow();
  });
});
