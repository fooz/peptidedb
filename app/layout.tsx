import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PeptideDB",
  description: "Reference database for peptides, evidence, and vendors."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="container">
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/">
              <strong>PeptideDB</strong>
            </Link>
            <nav style={{ display: "flex", gap: "0.8rem" }}>
              <Link href="/peptides">Peptides</Link>
              <Link href="/vendors">Vendors</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
