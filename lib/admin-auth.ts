import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "peptidedb_admin_session";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return { username, password };
}

function expectedSessionToken(): string {
  const { username, password } = getAdminCredentials();
  return createHash("sha256").update(`${username}:${password}`).digest("hex");
}

export function hasAdminConfig(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const current = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!current || !hasAdminConfig()) {
    return false;
  }
  return current === expectedSessionToken();
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
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, expectedSessionToken(), {
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

export function validateAdminLogin(inputUsername: string, inputPassword: string): boolean {
  const { username, password } = getAdminCredentials();
  if (!password) {
    return false;
  }
  return inputUsername === username && inputPassword === password;
}
