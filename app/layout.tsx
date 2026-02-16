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
        <header className="site-header">
          <div className="container">
            <div className="site-header-inner">
              <Link href="/" className="brand-link">
                <span className="brand-mark">PeptideDB</span>
                <span className="brand-subtle">Evidence-first reference</span>
              </Link>
              <nav className="top-nav">
                <Link href="/peptides">Peptides</Link>
                <Link href="/vendors">Vendors</Link>
                <Link href="/admin" prefetch={false}>
                  Admin
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="container site-main">{children}</main>
      </body>
    </html>
  );
}
