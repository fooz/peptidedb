import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_COOKIE = "__Host-peptidedb_admin_session";
const ADMIN_AUTH_BUCKET = process.env.ADMIN_AUTH_BUCKET ?? "vendor-docs";
const ADMIN_AUTH_OBJECT_PATH = process.env.ADMIN_AUTH_OBJECT_PATH ?? "_system/admin-auth.json";
const CREDENTIAL_CACHE_TTL_MS = 30_000;
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 6;
const RESET_MAX_ATTEMPTS = 5;

type StoredAdminCredential = {
  version: 1;
  algorithm: "scrypt";
  salt: string;
  hash: string;
  updatedAt: string;
  updatedBy: string;
};

type SessionPayload = {
  v: 1;
  u: string;
  iat: number;
  exp: number;
  n: string;
  pv: string;
};

type AuthAttemptScope = "login" | "reset";
type AttemptRecord = {
  windowStart: number;
  failedCount: number;
  blockedUntil: number;
};

let credentialCache:
  | {
      loadedAt: number;
      value: StoredAdminCredential | null;
    }
  | null = null;

const authAttemptMap = new Map<string, AttemptRecord>();

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return { username, password };
}

function computePasswordHash(password: string, saltHex: string): string {
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return derived.toString("hex");
}

function digestValue(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function constantTimeEqualString(left: string, right: string): boolean {
  return timingSafeEqual(digestValue(left), digestValue(right));
}

function isStrictHex(value: string, expectedLength: number): boolean {
  return value.length === expectedLength && /^[a-f0-9]+$/i.test(value);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function normalizeAttemptId(value: string): string {
  const normalized = value.trim().toLowerCase().slice(0, 160);
  return normalized || "unknown";
}

function attemptKey(scope: AuthAttemptScope, identifier: string): string {
  return `${scope}:${normalizeAttemptId(identifier)}`;
}

function maxAttemptsForScope(scope: AuthAttemptScope): number {
  return scope === "reset" ? RESET_MAX_ATTEMPTS : LOGIN_MAX_ATTEMPTS;
}

function clearExpiredAttemptRecords(now: number) {
  for (const [key, record] of authAttemptMap.entries()) {
    const blockExpired = record.blockedUntil > 0 && now >= record.blockedUntil;
    const windowExpired = now - record.windowStart >= RATE_LIMIT_WINDOW_MS;
    if (blockExpired && windowExpired) {
      authAttemptMap.delete(key);
    }
  }
}

async function currentPasswordVersion(): Promise<string | null> {
  const { password } = getAdminCredentials();
  const stored = await loadStoredAdminCredential();
  const source = stored?.hash || password;
  if (!source) {
    return null;
  }
  return createHash("sha256").update(`peptidedb-admin-password-version:${source}`).digest("hex");
}

async function getSessionSigningKey(passwordVersion: string | null): Promise<Buffer | null> {
  if (!passwordVersion) {
    return null;
  }
  const override = process.env.ADMIN_SESSION_SECRET?.trim();
  const secretSource = override || passwordVersion;
  if (!secretSource) {
    return null;
  }
  return createHash("sha256").update(`peptidedb-admin-session:${secretSource}`).digest();
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.v === 1 &&
    typeof record.u === "string" &&
    typeof record.iat === "number" &&
    Number.isFinite(record.iat) &&
    typeof record.exp === "number" &&
    Number.isFinite(record.exp) &&
    typeof record.n === "string" &&
    isStrictHex(record.n, 32) &&
    typeof record.pv === "string" &&
    isStrictHex(record.pv, 64)
  );
}

async function buildSessionToken(): Promise<string | null> {
  const { username } = getAdminCredentials();
  const passwordVersion = await currentPasswordVersion();
  const signingKey = await getSessionSigningKey(passwordVersion);
  if (!passwordVersion || !signingKey) {
    return null;
  }

  const issuedAt = Date.now();
  const payload: SessionPayload = {
    v: 1,
    u: username,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS * 1000,
    n: randomBytes(16).toString("hex"),
    pv: passwordVersion
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", signingKey).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

async function verifySessionToken(sessionToken: string): Promise<boolean> {
  const parts = sessionToken.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const encodedPayload = parts[0] ?? "";
  const tokenSignature = parts[1] ?? "";
  if (!encodedPayload || !tokenSignature) {
    return false;
  }

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return false;
  }

  if (!isSessionPayload(parsed)) {
    return false;
  }

  const now = Date.now();
  if (parsed.exp <= now || parsed.iat > now + 60_000) {
    return false;
  }

  const { username } = getAdminCredentials();
  if (!constantTimeEqualString(parsed.u, username)) {
    return false;
  }

  const passwordVersion = await currentPasswordVersion();
  if (!passwordVersion || !constantTimeEqualString(parsed.pv, passwordVersion)) {
    return false;
  }

  const signingKey = await getSessionSigningKey(passwordVersion);
  if (!signingKey) {
    return false;
  }

  const expectedSignature = createHmac("sha256", signingKey).update(encodedPayload).digest("base64url");
  return constantTimeEqualString(tokenSignature, expectedSignature);
}

function buildStoredCredential(password: string, updatedBy: string): StoredAdminCredential {
  const salt = randomBytes(16).toString("hex");
  return {
    version: 1,
    algorithm: "scrypt",
    salt,
    hash: computePasswordHash(password, salt),
    updatedAt: new Date().toISOString(),
    updatedBy
  };
}

function isStoredCredential(value: unknown): value is StoredAdminCredential {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    record.algorithm === "scrypt" &&
    typeof record.salt === "string" &&
    typeof record.hash === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.updatedBy === "string"
  );
}

function verifyAgainstStoredCredential(password: string, record: StoredAdminCredential): boolean {
  if (!isStrictHex(record.salt, 32) || !isStrictHex(record.hash, 128)) {
    return false;
  }
  const actual = Buffer.from(computePasswordHash(password, record.salt), "hex");
  const expected = Buffer.from(record.hash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

function normalizeStorageMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("not found") ||
    message.includes("the resource was not found") ||
    message.includes("404")
  );
}

async function loadStoredAdminCredential(): Promise<StoredAdminCredential | null> {
  const now = Date.now();
  if (credentialCache && now - credentialCache.loadedAt < CREDENTIAL_CACHE_TTL_MS) {
    return credentialCache.value;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    credentialCache = { loadedAt: now, value: null };
    return null;
  }

  const { data, error } = await supabase.storage.from(ADMIN_AUTH_BUCKET).download(ADMIN_AUTH_OBJECT_PATH);
  if (error) {
    if (!normalizeStorageMissing(error)) {
      console.error("Failed to load stored admin credential:", error.message);
    }
    credentialCache = { loadedAt: now, value: null };
    return null;
  }
  if (!data) {
    credentialCache = { loadedAt: now, value: null };
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await data.text());
  } catch {
    parsed = null;
  }

  const record = isStoredCredential(parsed) ? parsed : null;
  credentialCache = { loadedAt: now, value: record };
  return record;
}

export async function hasAdminConfig(): Promise<boolean> {
  const { password } = getAdminCredentials();
  if (password) {
    return true;
  }
  const stored = await loadStoredAdminCredential();
  return Boolean(stored);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const current = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!current) {
    return false;
  }
  return verifySessionToken(current);
}

export async function requireAdminAuth() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }
}

export async function assertAdminAuth() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    throw new Error("Unauthorized admin action.");
  }
}

export async function setAdminSession() {
  const token = await buildSessionToken();
  if (!token) {
    throw new Error("Admin authentication is not configured.");
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export async function validateAdminLogin(inputUsername: string, inputPassword: string): Promise<boolean> {
  const { username, password } = getAdminCredentials();
  if (!constantTimeEqualString(inputUsername, username)) {
    return false;
  }

  const stored = await loadStoredAdminCredential();
  if (stored) {
    return verifyAgainstStoredCredential(inputPassword, stored);
  }

  if (!password) {
    return false;
  }
  return constantTimeEqualString(inputPassword, password);
}

export async function resetAdminPassword(inputPassword: string, updatedBy = "password_reset"): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }
  const nextRecord = buildStoredCredential(inputPassword, updatedBy);
  const payload = JSON.stringify(nextRecord, null, 2);
  const { error } = await supabase.storage.from(ADMIN_AUTH_BUCKET).upload(ADMIN_AUTH_OBJECT_PATH, payload, {
    contentType: "application/json",
    upsert: true
  });
  if (error) {
    throw new Error(error.message);
  }
  credentialCache = {
    loadedAt: Date.now(),
    value: nextRecord
  };
}

export function constantTimeMatch(left: string, right: string): boolean {
  return constantTimeEqualString(left, right);
}

export function checkAdminAuthRateLimit(scope: AuthAttemptScope, identifier: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  clearExpiredAttemptRecords(now);

  const key = attemptKey(scope, identifier);
  const record = authAttemptMap.get(key);
  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - now) / 1000))
    };
  }

  if (now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
    authAttemptMap.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordAdminAuthFailure(scope: AuthAttemptScope, identifier: string): void {
  const now = Date.now();
  clearExpiredAttemptRecords(now);

  const key = attemptKey(scope, identifier);
  const existing = authAttemptMap.get(key);
  const maxAttempts = maxAttemptsForScope(scope);

  if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
    authAttemptMap.set(key, {
      windowStart: now,
      failedCount: 1,
      blockedUntil: 0
    });
    return;
  }

  const failedCount = existing.failedCount + 1;
  const blockedUntil = failedCount >= maxAttempts ? now + RATE_LIMIT_BLOCK_MS : existing.blockedUntil;
  authAttemptMap.set(key, {
    windowStart: existing.windowStart,
    failedCount,
    blockedUntil
  });
}

export function clearAdminAuthRateLimit(scope: AuthAttemptScope, identifier: string): void {
  authAttemptMap.delete(attemptKey(scope, identifier));
}
