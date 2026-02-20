"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  checkAdminAuthRateLimit,
  clearAdminAuthRateLimit,
  clearAdminSession,
  constantTimeMatch,
  hasAdminConfig,
  recordAdminAuthFailure,
  resetAdminPassword,
  setAdminSession,
  validateAdminLogin
} from "@/lib/admin-auth";

function redirectWithError(message: string) {
  const encoded = encodeURIComponent(message);
  redirect(`/admin/login?error=${encoded}`);
}

function redirectWithNotice(message: string) {
  const encoded = encodeURIComponent(message);
  redirect(`/admin/login?notice=${encoded}`);
}

function formatLockoutMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return "Use at least 12 characters for the new password.";
  }
  const checks = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  if (score < 3) {
    return "Use a stronger password with at least 3 of: lowercase, uppercase, number, symbol.";
  }
  return null;
}

export async function loginAdminAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rateLimitIdentifier = username || "unknown";
  const globalRateLimitIdentifier = "__global_login__";

  if (!username || !password) {
    redirectWithError("Enter both username and password.");
  }
  if (!(await hasAdminConfig())) {
    redirectWithError("Admin login is not configured on the server.");
  }
  const rateLimitStatus = checkAdminAuthRateLimit("login", rateLimitIdentifier);
  const globalRateLimitStatus = checkAdminAuthRateLimit("login", globalRateLimitIdentifier);
  if (!rateLimitStatus.allowed || !globalRateLimitStatus.allowed) {
    redirectWithError(
      formatLockoutMessage(Math.max(rateLimitStatus.retryAfterSeconds, globalRateLimitStatus.retryAfterSeconds))
    );
  }
  if (!(await validateAdminLogin(username, password))) {
    recordAdminAuthFailure("login", rateLimitIdentifier);
    recordAdminAuthFailure("login", globalRateLimitIdentifier);
    redirectWithError("Invalid admin credentials.");
  }

  clearAdminAuthRateLimit("login", rateLimitIdentifier);
  clearAdminAuthRateLimit("login", globalRateLimitIdentifier);
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

function redirectResetError(message: string) {
  const encoded = encodeURIComponent(message);
  redirect(`/admin/reset-password?error=${encoded}`);
}

export async function resetAdminPasswordAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const resetKey = String(formData.get("resetKey") ?? "");
  const nextPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const rateLimitIdentifier = username || "unknown";
  const globalRateLimitIdentifier = "__global_reset__";

  const configuredUsername = process.env.ADMIN_USERNAME ?? "admin";
  const configuredResetKey = process.env.ADMIN_RESET_KEY ?? "";

  if (!configuredResetKey) {
    redirectResetError("Password reset is not enabled. Set ADMIN_RESET_KEY in environment variables.");
  }
  const rateLimitStatus = checkAdminAuthRateLimit("reset", rateLimitIdentifier);
  const globalRateLimitStatus = checkAdminAuthRateLimit("reset", globalRateLimitIdentifier);
  if (!rateLimitStatus.allowed || !globalRateLimitStatus.allowed) {
    redirectResetError(
      formatLockoutMessage(Math.max(rateLimitStatus.retryAfterSeconds, globalRateLimitStatus.retryAfterSeconds))
    );
  }
  if (!username || !resetKey || !nextPassword || !confirmPassword) {
    redirectResetError("Complete all fields.");
  }
  if (!constantTimeMatch(username, configuredUsername) || !constantTimeMatch(resetKey, configuredResetKey)) {
    recordAdminAuthFailure("reset", rateLimitIdentifier);
    recordAdminAuthFailure("reset", globalRateLimitIdentifier);
    redirectResetError("Invalid reset credentials.");
  }
  const passwordStrengthIssue = validatePasswordStrength(nextPassword);
  if (passwordStrengthIssue) {
    redirectResetError(passwordStrengthIssue);
  }
  if (nextPassword !== confirmPassword) {
    redirectResetError("Password confirmation does not match.");
  }

  try {
    await resetAdminPassword(nextPassword, "admin-reset-form");
    clearAdminAuthRateLimit("reset", rateLimitIdentifier);
    clearAdminAuthRateLimit("reset", globalRateLimitIdentifier);
    await clearAdminSession();
    redirectWithNotice("Password reset complete. Sign in with your new password.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    redirectResetError(message);
  }
}
