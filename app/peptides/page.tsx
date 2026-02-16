import type { Metadata } from "next";
import Link from "next/link";
import { EVIDENCE_GRADES, JURISDICTIONS, REGULATORY_STATUSES, labelFromSnake } from "@/lib/constants";
import { filterPeptides, parsePeptideFilters } from "@/lib/filtering";
import { listPeptides } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b)
  );
}

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

export const metadata: Metadata = {
  title: "Peptides",
  description:
    "Peptide directory with filters for use cases, evidence grade, jurisdiction, and regulatory status.",
  alternates: {
    canonical: "/peptides"
  }
};

export default async function PeptidesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parsePeptideFilters(resolvedSearchParams);
  const peptides = await listPeptides();
  const filtered = filterPeptides(peptides, filters);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Peptide Directory",
    url: absoluteUrl("/peptides"),
    description: "Peptide directory with filters for use cases, evidence grade, and regulatory status.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: filtered.length,
      itemListElement: filtered.slice(0, 100).map((peptide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/peptides/${peptide.slug}`),
        name: peptide.name
      }))
    }
  };

  const useCaseOptions = uniqueSorted(peptides.flatMap((peptide) => peptide.useCases));
  const routeOptions = uniqueSorted(peptides.flatMap((peptide) => peptide.routes));

  return (
    <div className="grid" itemScope itemType="https://schema.org/CollectionPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <section className="card">
        <h1>Peptide Directory</h1>
        <p className="muted">
          Filter by use case, evidence, jurisdiction, and status. This view is consumer-first and links to clinical
          detail on each page.
        </p>
        <p className="muted">
          Showing <strong>{filtered.length}</strong> of <strong>{peptides.length}</strong> peptides.
        </p>
      </section>

      <section className="card">
        <form action="/peptides" method="get" className="grid two">
          <label>
            Search
            <input name="q" defaultValue={filters.q} placeholder="Name or alias" />
          </label>

          <label>
            Use case
            <select name="useCase" defaultValue={filters.useCase}>
              <option value="">All</option>
              {useCaseOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Jurisdiction
            <select name="jurisdiction" defaultValue={filters.jurisdiction}>
              <option value="">All</option>
              {JURISDICTIONS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>

          <label>
            Regulatory status
            <select name="status" defaultValue={filters.status}>
              <option value="">All</option>
              {REGULATORY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelFromSnake(status)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Evidence grade
            <select name="evidence" defaultValue={filters.evidence}>
              <option value="">All</option>
              {EVIDENCE_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </label>

          <label>
            Route
            <select name="route" defaultValue={filters.route}>
              <option value="">All</option>
              {routeOptions.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </label>

          <div className="hero-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn">
              Apply Filters
            </button>
            <Link href="/peptides" className="btn">
              Clear
            </Link>
          </div>
        </form>
      </section>

      {filtered.map((peptide) => (
        <article key={peptide.slug} className="card" itemScope itemType="https://schema.org/MedicalEntity">
          <h2>
            <Link href={`/peptides/${peptide.slug}`} itemProp="url">
              <span itemProp="name">{peptide.name}</span>
            </Link>
          </h2>
          <p className="muted">
            Class: {peptide.className}
          </p>
          <div>
            {peptide.useCases.map((u) => (
              <span className="chip" key={u}>
                {u}
              </span>
            ))}
          </div>
          <p className="muted">
            Evidence grade: <strong>{peptide.evidenceGrade}</strong>
          </p>
        </article>
      ))}

      {filtered.length === 0 ? (
        <section className="card">
          <p className="empty-state">No peptides matched these filters.</p>
        </section>
      ) : null}
    </div>
  );
}
