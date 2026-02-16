import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, getSiteUrl, safeJsonLd } from "@/lib/seo";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PeptideDB | Evidence-First Peptide Reference",
    template: "%s | PeptideDB"
  },
  description:
    "Reference database of peptides with consumer and clinical context, evidence grading, and research-derived vendor reliability.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "PeptideDB | Evidence-First Peptide Reference",
    description:
      "Reference database of peptides with consumer and clinical context, evidence grading, and research-derived vendor reliability.",
    siteName: "PeptideDB"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PeptideDB",
      url: siteUrl,
      description:
        "Reference database of peptides with consumer and clinical context, evidence grading, and research-derived vendor reliability.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/peptides")}?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PeptideDB",
      url: siteUrl,
      sameAs: [siteUrl]
    }
  ];

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
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
