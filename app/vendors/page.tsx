import Link from "next/link";
import { filterVendors, parseVendorFilters } from "@/lib/filtering";
import { listVendors } from "@/lib/repository";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function renderStars(value: number | null): string {
  if (value === null) {
    return "No rating";
  }
  return `${value.toFixed(1)} stars`;
}

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVendorFilters(resolvedSearchParams);
  const vendors = await listVendors();
  const filtered = filterVendors(vendors, filters);

  return (
    <div className="grid">
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
          <article key={vendor.slug} className="card">
            <h2>{vendor.name}</h2>
            <p>
              Rating: <strong>{renderStars(vendor.rating)}</strong>
            </p>
            <p className="muted">
              Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
            </p>
            <p className="muted">{vendor.reasonTags.join(", ")}</p>
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
