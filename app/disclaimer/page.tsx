import type { Metadata } from "next";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Medical and informational disclaimer for PeptideDB.",
  openGraph: {
    type: "article",
    url: absoluteUrl("/disclaimer"),
    title: "Disclaimer | PeptideDB",
    description: "Medical and informational disclaimer for PeptideDB."
  },
  alternates: {
    canonical: "/disclaimer"
  }
};

export default function DisclaimerPage() {
  return (
    <div className="grid">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Disclaimer" }]} />
      <section className="card">
        <h1>Disclaimer</h1>
        <p>
          PeptideDB is an informational reference database. It does not provide medical diagnosis, treatment, or
          personalized healthcare recommendations.
        </p>
        <p>
          Content may include investigational and research-only compounds that are not approved for consumer use in
          one or more jurisdictions. Regulatory status can change; always verify current local rules.
        </p>
        <p>
          Dosing and safety content is presented for evidence context only and must not be interpreted as medical
          advice. Clinical decisions should be made by qualified licensed professionals.
        </p>
        <p>
          Vendor listings and ratings reflect editorial research methodology and are not endorsements, guarantees, or
          quality certifications.
        </p>
      </section>
    </div>
  );
}
