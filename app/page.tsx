import Link from "next/link";
import { listPeptides, listVendors } from "@/lib/repository";

export default async function HomePage() {
  const [peptides, vendors] = await Promise.all([listPeptides(), listVendors()]);
  const featuredPeptides = peptides.slice(0, 4);
  const ratedVendors = vendors.filter((vendor) => vendor.rating !== null);
  const unratedVendors = vendors.filter((vendor) => vendor.rating === null);
  const topRatedVendors = [...ratedVendors].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);

  return (
    <div className="grid">
      <section className="card hero">
        <h1>Peptide Reference Database</h1>
        <p className="muted">
          Consumer-first peptide reference with embedded clinical context, evidence grading, jurisdiction badges
          (US/EU/UK/CA/AU), and research-based vendor reliability scoring.
        </p>
        <div className="meta-row" style={{ marginBottom: "0.9rem" }}>
          <span className="kpi-pill">US and non-US status separation</span>
          <span className="kpi-pill">Research-derived vendor ratings</span>
          <span className="kpi-pill">Consumer text plus clinical section</span>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" href="/peptides">
            Browse Peptides
          </Link>
          <Link className="btn" href="/vendors">
            Browse Vendors
          </Link>
        </div>
      </section>

      <section className="grid three">
        <article className="card">
          <h2>Template Sections</h2>
          <p className="muted">Jump into real peptide pages with full template sections.</p>
          <div className="home-link-list">
            {featuredPeptides.map((peptide) => (
              <Link key={peptide.slug} href={`/peptides/${peptide.slug}`} className="subtle-link">
                {peptide.name}
              </Link>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="btn" href="/peptides">
              Open Peptide Directory
            </Link>
          </div>
        </article>
        <article className="card">
          <h2>Rating Policy</h2>
          <p className="muted">
            Ratings are research-derived and non-user-submitted: <strong>{ratedVendors.length}</strong> rated,{" "}
            <strong>{unratedVendors.length}</strong> no rating.
          </p>
          <div className="home-link-list">
            {topRatedVendors.map((vendor) => (
              <Link key={vendor.slug} href={`/vendors?q=${encodeURIComponent(vendor.name)}`} className="subtle-link">
                {vendor.name} ({vendor.rating?.toFixed(1)} stars)
              </Link>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="btn" href="/vendors?ratingState=rated">
              View Rated Vendors
            </Link>
            <Link className="btn" href="/vendors?ratingState=unrated">
              View No-Rating Vendors
            </Link>
          </div>
        </article>
        <article className="card">
          <h2>Trust Signals</h2>
          <p className="muted">
            Browse filters that separate US-approved, non-US-approved, and investigational peptides with evidence
            grades.
          </p>
          <div className="home-link-list">
            <Link className="subtle-link" href="/peptides?jurisdiction=US&status=US_FDA_APPROVED">
              US FDA Approved (US filter)
            </Link>
            <Link className="subtle-link" href="/peptides?status=NON_US_APPROVED">
              Non-US Approved
            </Link>
            <Link className="subtle-link" href="/peptides?status=INVESTIGATIONAL">
              Investigational
            </Link>
            <Link className="subtle-link" href="/peptides?evidence=A">
              Evidence Grade A
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
