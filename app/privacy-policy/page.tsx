import type { Metadata } from "next";
import { Breadcrumbs } from "@/app/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for PeptideDB.",
  alternates: {
    canonical: "/privacy-policy"
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className="grid">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <section className="card">
        <h1>Privacy Policy</h1>
        <p>
          PeptideDB is designed to minimize personal data collection. We do not run user-submitted public profiles or
          community posting features on this site.
        </p>
        <p>
          Standard web logs and platform analytics may process technical data such as IP address, browser type, and
          page requests for security, reliability, and performance monitoring.
        </p>
        <p>
          If affiliate links are present, outbound clicks may be tracked by partner programs. We do not sell personal
          data.
        </p>
        <p>
          Third-party infrastructure providers (for example hosting and database services) may process operational data
          under their own privacy terms.
        </p>
        <p>
          For privacy requests or policy questions, contact the site operator through your published business contact
          channel.
        </p>
      </section>
    </div>
  );
}
