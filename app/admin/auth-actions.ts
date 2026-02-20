"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  hasAdminConfig,
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

export async function loginAdminAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    redirectWithError("Enter both username and password.");
  }
  if (!(await hasAdminConfig())) {
    redirectWithError("Admin login is not configured on the server.");
  }
  if (!(await validateAdminLogin(username, password))) {
    redirectWithError("Invalid admin credentials.");
  }

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
  const resetKey = String(formData.get("resetKey") ?? "").trim();
  const nextPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const configuredUsername = process.env.ADMIN_USERNAME ?? "admin";
  const configuredResetKey = process.env.ADMIN_RESET_KEY ?? "";

  if (!configuredResetKey) {
    redirectResetError("Password reset is not enabled. Set ADMIN_RESET_KEY in environment variables.");
  }
  if (!username || !resetKey || !nextPassword || !confirmPassword) {
    redirectResetError("Complete all fields.");
  }
  if (username !== configuredUsername) {
    redirectResetError("Invalid reset credentials.");
  }
  if (resetKey !== configuredResetKey) {
    redirectResetError("Invalid reset credentials.");
  }
  if (nextPassword.length < 12) {
    redirectResetError("Use at least 12 characters for the new password.");
  }
  if (nextPassword !== confirmPassword) {
    redirectResetError("Password confirmation does not match.");
  }

  try {
    await resetAdminPassword(nextPassword, "admin-reset-form");
    await clearAdminSession();
    redirectWithNotice("Password reset complete. Sign in with your new password.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    redirectResetError(message);
  }
}
