import type { Metadata } from "next";
import Link from "next/link";
import { StarRating } from "@/app/components/star-rating";
import { filterVendors, parseVendorFilters } from "@/lib/filtering";
import { listVendors } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

export const metadata: Metadata = {
  title: "Vendors",
  description:
    "Vendor directory with research-derived reliability ratings, confidence levels, and affiliate transparency.",
  alternates: {
    canonical: "/vendors"
  }
};

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVendorFilters(resolvedSearchParams);
  const vendors = await listVendors();
  const filtered = filterVendors(vendors, filters);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Vendor Directory",
    url: absoluteUrl("/vendors"),
    description: "Research-derived vendor reliability ratings and confidence scores.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: filtered.length,
      itemListElement: filtered.slice(0, 100).map((vendor, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Organization",
          name: vendor.name,
          url: absoluteUrl(`/vendors?q=${encodeURIComponent(vendor.name)}`),
          ...(vendor.rating !== null
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: vendor.rating.toFixed(1),
                  bestRating: "5",
                  worstRating: "0"
                }
              }
            : {})
        }
      }))
    }
  };

  return (
    <div className="grid" itemScope itemType="https://schema.org/CollectionPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <section className="card">
        <h1>Vendor Directory</h1>
        <p className="muted">
          Ratings are research-derived and non-user-submitted. Affiliate status does not affect score.
        </p>
        <p className="muted">
          Showing <strong>{filtered.length}</strong> of <strong>{vendors.length}</strong> vendors.
        </p>
      </section>

      <section className="card">
        <form action="/vendors" method="get" className="grid two">
          <label>
            Search
            <input name="q" defaultValue={filters.q} placeholder="Vendor name" />
          </label>

          <label>
            Minimum rating
            <select
              name="minRating"
              defaultValue={filters.minRating === null ? "" : String(filters.minRating)}
            >
              <option value="">Any</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
              <option value="2">2.0+</option>
            </select>
          </label>

          <label>
            Affiliate
            <select name="affiliate" defaultValue={filters.affiliate}>
              <option value="all">All</option>
              <option value="yes">Affiliate only</option>
              <option value="no">Non-affiliate only</option>
            </select>
          </label>

          <label>
            Rating state
            <select name="ratingState" defaultValue={filters.ratingState}>
              <option value="all">All</option>
              <option value="rated">Rated only</option>
              <option value="unrated">No rating only</option>
            </select>
          </label>

          <div className="hero-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn">
              Apply Filters
            </button>
            <Link href="/vendors" className="btn">
              Clear
            </Link>
          </div>
        </form>
      </section>

      <div className="grid two">
        {filtered.map((vendor) => (
          <article key={vendor.slug} className="card" itemScope itemType="https://schema.org/Organization">
            <h2 itemProp="name">{vendor.name}</h2>
            <p>
              Rating: <strong><StarRating rating={vendor.rating} idPrefix={`vendor-${vendor.slug}`} /></strong>
            </p>
            <p className="muted">
              Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
            </p>
            <p className="muted">{vendor.reasonTags.join(", ")}</p>
            {vendor.rating !== null ? (
              <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                <meta itemProp="ratingValue" content={vendor.rating.toFixed(1)} />
                <meta itemProp="bestRating" content="5" />
                <meta itemProp="worstRating" content="0" />
              </div>
            ) : null}
            {vendor.isAffiliate ? <span className="chip">Affiliate</span> : null}
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <p className="empty-state">No vendors matched these filters.</p>
        </section>
      ) : null}
    </div>
  );
}
