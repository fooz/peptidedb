"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  hasAdminConfig,
  setAdminSession,
  validateAdminLogin
} from "@/lib/admin-auth";

function redirectWithError(message: string) {
  const encoded = encodeURIComponent(message);
  redirect(`/admin/login?error=${encoded}`);
}

export async function loginAdminAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!hasAdminConfig()) {
    redirectWithError("ADMIN_PASSWORD is not configured on the server.");
  }
  if (!username || !password) {
    redirectWithError("Enter both username and password.");
  }
  if (!validateAdminLogin(username, password)) {
    redirectWithError("Invalid admin credentials.");
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
