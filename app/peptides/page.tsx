import Link from "next/link";
import { EVIDENCE_GRADES, JURISDICTIONS, REGULATORY_STATUSES, labelFromSnake } from "@/lib/constants";
import { filterPeptides, parsePeptideFilters } from "@/lib/filtering";
import { listPeptides } from "@/lib/repository";

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

export default async function PeptidesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parsePeptideFilters(resolvedSearchParams);
  const peptides = await listPeptides();
  const filtered = filterPeptides(peptides, filters);

  const useCaseOptions = uniqueSorted(peptides.flatMap((peptide) => peptide.useCases));
  const routeOptions = uniqueSorted(peptides.flatMap((peptide) => peptide.routes));

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Peptide Directory</h1>
        <p className="muted">
          Filter by use case, evidence, jurisdiction, and status. This view is consumer-first and links to clinical
          detail on each page.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Showing <strong>{filtered.length}</strong> of <strong>{peptides.length}</strong> peptides.
        </p>
      </section>

      <section className="card">
        <form action="/peptides" method="get" className="grid two">
          <label>
            Search
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Name or alias"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>

          <label>
            Use case
            <select name="useCase" defaultValue={filters.useCase} style={{ width: "100%", marginTop: "0.35rem" }}>
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
            <select
              name="jurisdiction"
              defaultValue={filters.jurisdiction}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
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
            <select name="status" defaultValue={filters.status} style={{ width: "100%", marginTop: "0.35rem" }}>
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
            <select
              name="evidence"
              defaultValue={filters.evidence}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
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
            <select name="route" defaultValue={filters.route} style={{ width: "100%", marginTop: "0.35rem" }}>
              <option value="">All</option>
              {routeOptions.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
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
        <article key={peptide.slug} className="card">
          <h2 style={{ marginTop: 0 }}>
            <Link href={`/peptides/${peptide.slug}`}>{peptide.name}</Link>
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
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
          <p style={{ margin: 0 }}>No peptides matched these filters.</p>
        </section>
      ) : null}
    </div>
  );
}
