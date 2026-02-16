import { redirect } from "next/navigation";
import { loginAdminAction } from "@/app/admin/auth-actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function getFirst(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const error = getFirst(resolvedSearchParams?.error);

  return (
    <div className="auth-wrap grid">
      <section className="card hero">
        <h1>Admin Login</h1>
        <p className="muted">Secure area for publishing peptide and vendor content.</p>
        {error ? <p className="notice error">{error}</p> : null}
        <form action={loginAdminAction} className="form-grid">
          <label>
            Username
            <input name="username" autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" />
          </label>
          <button className="btn primary" type="submit">
            Sign In
          </button>
        </form>
      </section>
    </div>
  );
}
