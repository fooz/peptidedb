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
    <div className="grid" style={{ maxWidth: 560, margin: "0 auto" }}>
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p className="muted">This area controls peptide and vendor content.</p>
        {error ? (
          <p style={{ color: "#b91c1c", marginTop: 0 }}>
            <strong>{error}</strong>
          </p>
        ) : null}
        <form action={loginAdminAction} className="grid">
          <label>
            Username
            <input name="username" autoComplete="username" style={{ width: "100%", marginTop: "0.35rem" }} />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <button className="btn" type="submit">
            Sign In
          </button>
        </form>
      </section>
    </div>
  );
}
