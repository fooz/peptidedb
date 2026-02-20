import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resetAdminPasswordAction } from "@/app/admin/auth-actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function getFirst(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

export const metadata: Metadata = {
  title: "Reset Admin Password",
  alternates: {
    canonical: "/admin/reset-password"
  },
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminResetPasswordPage({ searchParams }: PageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const error = getFirst(resolvedSearchParams?.error);
  const defaultUsername = process.env.ADMIN_USERNAME ?? "admin";

  return (
    <div className="auth-wrap grid">
      <section className="card hero">
        <h1>Reset Admin Password</h1>
        <p className="muted">
          Enter your admin username, reset key, and a new password. Reset keys are configured via{" "}
          <code>ADMIN_RESET_KEY</code>.
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        <form action={resetAdminPasswordAction} className="form-grid">
          <label>
            Username
            <input name="username" defaultValue={defaultUsername} autoComplete="username" required />
          </label>
          <label>
            Reset key
            <input name="resetKey" type="password" autoComplete="one-time-code" required />
          </label>
          <label>
            New password
            <input name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <button className="btn primary" type="submit">
            Reset Password
          </button>
        </form>
        <p className="muted">
          Back to <Link href="/admin/login">admin login</Link>.
        </p>
      </section>
    </div>
  );
}
