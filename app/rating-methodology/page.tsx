import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Rating Methodology",
  description: "How PeptideDB calculates vendor ratings and confidence.",
  openGraph: {
    type: "article",
    url: absoluteUrl("/rating-methodology"),
    title: "Rating Methodology | PeptideDB",
    description: "How PeptideDB calculates vendor ratings and confidence."
  },
  alternates: {
    canonical: "/rating-methodology"
  }
};

export default function RatingMethodologyPage() {
  return (
    <div className="grid">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Rating Methodology" }]} />
      <section className="card">
        <h1>Rating Methodology</h1>
        <p>
          Vendor ratings are research-derived and not user-submitted. Scores are generated from documented trust
          signals and evidence quality.
        </p>
        <h2>Inputs Considered</h2>
        <ul>
          <li>Verification signals such as CoA availability, independent lab testing, and transparent policies.</li>
          <li>Vendor profile quality, listing coverage, and consistency across data sources.</li>
          <li>Community-source review evidence where available, including sentiment and source diversity.</li>
        </ul>
        <h2>How Scores Are Shown</h2>
        <ul>
          <li>A single star rating is displayed when enough evidence is available.</li>
          <li>
            Confidence indicates how complete and reliable the supporting evidence appears for that current snapshot.
          </li>
          <li>When evidence is too limited, vendors are shown as No rating.</li>
        </ul>
        <p>
          Ratings are periodically refreshed as new data is ingested. See the <Link href="/vendors">Vendor Directory</Link>{" "}
          for current tags and status.
        </p>
        <h2 id="evidence-hierarchy">Evidence Source Hierarchy</h2>
        <p>
          Peptide claims are interpreted using a source-priority model: regulatory labeling and high-quality
          randomized/meta-analytic evidence are weighted above observational reports, mechanistic preclinical studies,
          and community discussions.
        </p>
        <ul>
          <li>Tier 1: Regulatory labeling and high-quality controlled human outcome evidence.</li>
          <li>Tier 2: Smaller human studies, observational evidence, and protocol-level clinical reports.</li>
          <li>Tier 3: Preclinical/mechanistic evidence and expert-context summaries.</li>
          <li>Tier 4: Community signal data used as context, not primary efficacy proof.</li>
        </ul>
      </section>
    </div>
  );
}
