import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { StarRating } from "@/app/components/star-rating";
import { labelFromSnake } from "@/lib/constants";
import { filterVendors, parseVendorFilters } from "@/lib/filtering";
import { listVendors } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;
const PAGE_SIZE = 36;

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((a, b) =>
    labelFromSnake(a).localeCompare(labelFromSnake(b))
  );
}

function buildVendorFilterHref(
  filters: { q: string; minRating: number | null; ratingState: "all" | "rated" | "unrated"; reasonTag: string; page: number },
  patch?: { reasonTag?: string; clearReasonTag?: boolean; page?: number }
): string {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.minRating !== null) {
    params.set("minRating", String(filters.minRating));
  }
  if (filters.ratingState !== "all") {
    params.set("ratingState", filters.ratingState);
  }

  const nextReasonTag = patch?.clearReasonTag ? "" : (patch?.reasonTag ?? filters.reasonTag);
  if (nextReasonTag) {
    params.set("reasonTag", nextReasonTag);
  }
  const page = patch?.page ?? filters.page;
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/vendors?${query}` : "/vendors";
}

function parsePage(searchParams?: SearchParams): number {
  const raw = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const parsed = Number(raw ?? "");
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVendorFilters(resolvedSearchParams);
  const requestedPage = parsePage(resolvedSearchParams);
  const vendors = await listVendors();
  const filtered = filterVendors(vendors, filters);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const reasonTagOptions = uniqueSorted(vendors.flatMap((vendor) => vendor.reasonTags));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Vendor Directory",
    url: absoluteUrl("/vendors"),
    description: "Research-derived vendor reliability ratings and confidence scores.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: filtered.length,
      itemListElement: pageItems.map((vendor, index) => ({
        "@type": "ListItem",
        position: pageStart + index + 1,
        item: {
          "@type": "Organization",
          name: vendor.name,
          url: absoluteUrl(`/vendors/${vendor.slug}`),
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
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Vendors" }]} />
      <section className="card">
        <h1>Vendor Directory</h1>
        <p className="muted">Ratings are research-derived and non-user-submitted.</p>
        <p className="muted">
          Showing <strong>{filtered.length}</strong> of <strong>{vendors.length}</strong> vendors.
        </p>
        <p className="muted">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>.
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
            Rating state
            <select name="ratingState" defaultValue={filters.ratingState}>
              <option value="all">All</option>
              <option value="rated">Rated only</option>
              <option value="unrated">No rating only</option>
            </select>
          </label>

          {filters.reasonTag ? <input type="hidden" name="reasonTag" value={filters.reasonTag} /> : null}

          <div className="hero-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn">
              Apply Filters
            </button>
            <Link href="/vendors" className="btn">
              Clear
            </Link>
          </div>
        </form>

        <div className="home-link-list" style={{ marginTop: "0.75rem" }}>
          <p className="muted" style={{ marginBottom: "0.35rem" }}>
            Confidence tags:
          </p>
          <div>
            <Link
              href={buildVendorFilterHref({ ...filters, page: currentPage }, { clearReasonTag: true, page: 1 })}
              className={`chip chip-link ${filters.reasonTag ? "" : "active"}`}
            >
              All Tags
            </Link>
            {reasonTagOptions.map((reasonTag) => (
              <Link
                key={reasonTag}
                href={buildVendorFilterHref({ ...filters, page: currentPage }, { reasonTag, page: 1 })}
                className={`chip chip-link ${filters.reasonTag === reasonTag.toLowerCase() ? "active" : ""}`}
              >
                {labelFromSnake(reasonTag)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid two">
        {pageItems.map((vendor) => (
          <article key={vendor.slug} className="card" itemScope itemType="https://schema.org/Organization">
            <h2 itemProp="name">
              <Link href={`/vendors/${vendor.slug}`} itemProp="url">
                {vendor.name}
              </Link>
            </h2>
            <p>
              Rating: <strong><StarRating rating={vendor.rating} idPrefix={`vendor-${vendor.slug}`} /></strong>
            </p>
            <p className="muted">
              Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
            </p>
            <div>
              {vendor.reasonTags.map((reasonTag) => (
                <Link
                  key={`${vendor.slug}-${reasonTag}`}
                  href={buildVendorFilterHref({ ...filters, page: currentPage }, { reasonTag, page: 1 })}
                  className={`chip chip-link ${filters.reasonTag === reasonTag.toLowerCase() ? "active" : ""}`}
                >
                  {labelFromSnake(reasonTag)}
                </Link>
              ))}
            </div>
            {vendor.rating !== null ? (
              <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                <meta itemProp="ratingValue" content={vendor.rating.toFixed(1)} />
                <meta itemProp="bestRating" content="5" />
                <meta itemProp="worstRating" content="0" />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <p className="empty-state">No vendors matched these filters.</p>
        </section>
      ) : (
        <section className="card">
          <div className="pagination-bar">
            {currentPage > 1 ? (
              <Link
                className="btn"
                href={buildVendorFilterHref({ ...filters, page: currentPage }, { page: currentPage - 1 })}
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="muted">
              Page {currentPage} of {totalPages}
            </p>
            {currentPage < totalPages ? (
              <Link
                className="btn"
                href={buildVendorFilterHref({ ...filters, page: currentPage }, { page: currentPage + 1 })}
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const filters = parseVendorFilters(resolvedSearchParams);
  const requestedPage = parsePage(resolvedSearchParams);
  const hasFilter =
    Boolean(filters.q) || filters.minRating !== null || filters.ratingState !== "all" || Boolean(filters.reasonTag) || requestedPage > 1;

  return {
    title: "Vendor Directory",
    description:
      "Vendor directory with research-derived reliability ratings, confidence levels, and confidence-signal tags.",
    openGraph: {
      type: "website",
      url: absoluteUrl("/vendors"),
      title: "Vendor Directory | PeptideDB",
      description:
        "Vendor directory with research-derived reliability ratings, confidence levels, and confidence-signal tags."
    },
    alternates: {
      canonical: "/vendors"
    },
    robots: hasFilter ? { index: false, follow: true } : { index: true, follow: true }
  };
}
