import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_COOKIE = "peptidedb_admin_session";
const ADMIN_AUTH_BUCKET = process.env.ADMIN_AUTH_BUCKET ?? "vendor-docs";
const ADMIN_AUTH_OBJECT_PATH = process.env.ADMIN_AUTH_OBJECT_PATH ?? "_system/admin-auth.json";
const CREDENTIAL_CACHE_TTL_MS = 30_000;

type StoredAdminCredential = {
  version: 1;
  algorithm: "scrypt";
  salt: string;
  hash: string;
  updatedAt: string;
  updatedBy: string;
};

let credentialCache:
  | {
      loadedAt: number;
      value: StoredAdminCredential | null;
    }
  | null = null;

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return { username, password };
}

function computePasswordHash(password: string, saltHex: string): string {
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return derived.toString("hex");
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

async function expectedSessionToken(): Promise<string | null> {
  const { username, password } = getAdminCredentials();
  const stored = await loadStoredAdminCredential();
  const secret = stored?.hash || password;
  if (!secret) {
    return null;
  }
  return createHash("sha256").update(`${username}:${secret}`).digest("hex");
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
  const expected = await expectedSessionToken();
  if (!current || !expected) {
    return false;
  }
  return current === expected;
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
  const expected = await expectedSessionToken();
  if (!expected) {
    throw new Error("Admin authentication is not configured.");
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export async function validateAdminLogin(inputUsername: string, inputPassword: string): Promise<boolean> {
  const { username, password } = getAdminCredentials();
  if (inputUsername !== username) {
    return false;
  }

  const stored = await loadStoredAdminCredential();
  if (stored) {
    return verifyAgainstStoredCredential(inputPassword, stored);
  }

  if (!password) {
    return false;
  }
  return inputPassword === password;
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
