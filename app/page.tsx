import type { Metadata } from "next";
import Link from "next/link";
import { StarRating } from "@/app/components/star-rating";
import { listPeptides, listVendors } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Consumer-first peptide reference with embedded clinical context, jurisdiction status badges, and research-derived vendor ratings.",
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const [peptides, vendors] = await Promise.all([listPeptides(), listVendors()]);
  const featuredPeptides = peptides.slice(0, 4);
  const ratedVendors = vendors.filter((vendor) => vendor.rating !== null);
  const unratedVendors = vendors.filter((vendor) => vendor.rating === null);
  const topRatedVendors = [...ratedVendors].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PeptideDB Home",
    url: absoluteUrl("/"),
    description:
      "Consumer-first peptide reference with embedded clinical context, jurisdiction status badges, and research-derived vendor ratings.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: featuredPeptides.map((peptide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/peptides/${peptide.slug}`),
        name: peptide.name
      }))
    }
  };

  return (
    <div className="grid" itemScope itemType="https://schema.org/WebPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <section className="card hero" itemProp="mainEntity" itemScope itemType="https://schema.org/WebSite">
        <h1>Peptide Reference Database</h1>
        <p className="muted" itemProp="description">
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
        <article className="card" itemScope itemType="https://schema.org/ItemList">
          <h2>Rating Policy</h2>
          <p className="muted">
            Ratings are research-derived and non-user-submitted: <strong>{ratedVendors.length}</strong> rated,{" "}
            <strong>{unratedVendors.length}</strong> no rating.
          </p>
          <div className="home-link-list">
            {topRatedVendors.map((vendor, index) => (
              <Link
                key={vendor.slug}
                href={`/vendors/${vendor.slug}`}
                className="subtle-link home-vendor-link"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <span itemProp="name">
                  {vendor.name} <StarRating rating={vendor.rating} idPrefix={`home-${vendor.slug}`} />
                </span>
                <meta itemProp="position" content={String(index + 1)} />
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
