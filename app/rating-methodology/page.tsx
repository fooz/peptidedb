import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Rating Methodology",
  description: "How PeptideDB calculates vendor ratings and confidence.",
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
      </section>
    </div>
  );
}
