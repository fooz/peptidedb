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
        <h1 style={{ marginTop: 0 }}>Vendor Directory</h1>
        <p className="muted">
          Ratings are research-derived and non-user-submitted. Affiliate status does not affect score.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Showing <strong>{filtered.length}</strong> of <strong>{vendors.length}</strong> vendors.
        </p>
      </section>

      <section className="card">
        <form action="/vendors" method="get" className="grid two">
          <label>
            Search
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Vendor name"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>

          <label>
            Minimum rating
            <select
              name="minRating"
              defaultValue={filters.minRating === null ? "" : String(filters.minRating)}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
              <option value="">Any</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
              <option value="2">2.0+</option>
            </select>
          </label>

          <label>
            Affiliate
            <select
              name="affiliate"
              defaultValue={filters.affiliate}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
              <option value="all">All</option>
              <option value="yes">Affiliate only</option>
              <option value="no">Non-affiliate only</option>
            </select>
          </label>

          <label>
            Rating state
            <select
              name="ratingState"
              defaultValue={filters.ratingState}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
              <option value="all">All</option>
              <option value="rated">Rated only</option>
              <option value="unrated">No rating only</option>
            </select>
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
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
            <h2 style={{ marginTop: 0 }}>{vendor.name}</h2>
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
          <p style={{ margin: 0 }}>No vendors matched these filters.</p>
        </section>
      ) : null}
    </div>
  );
}
