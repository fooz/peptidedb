import Link from "next/link";
import { notFound } from "next/navigation";
import { getPeptideDetail } from "@/lib/repository";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: "consumer" | "clinical" } | undefined>;
};

function statusLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function PeptideDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams?.view === "clinical" ? "clinical" : "consumer";
  const peptide = await getPeptideDetail(slug);

  if (!peptide) {
    notFound();
  }

  return (
    <div className="grid">
      <section className="card hero">
        <h1>{peptide.name}</h1>
        <div className="meta-row">
          {Object.entries(peptide.statusByJurisdiction).map(([jurisdiction, status]) => (
            <span key={jurisdiction} className="chip">
              {jurisdiction}: {statusLabel(status)}
            </span>
          ))}
        </div>
        <p>{view === "consumer" ? peptide.intro : peptide.mechanism}</p>
        <div className="hero-actions">
          <Link className={`btn ${view === "consumer" ? "active" : ""}`} href={`/peptides/${peptide.slug}?view=consumer`}>
            Consumer View
          </Link>
          <Link className={`btn ${view === "clinical" ? "active" : ""}`} href={`/peptides/${peptide.slug}?view=clinical`}>
            Clinical View
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Features</h2>
        <table>
          <tbody>
            {Object.entries(peptide.featureTable).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Use Cases</h2>
        {peptide.useCases.map((useCase) => (
          <span key={useCase} className="chip">
            {useCase}
          </span>
        ))}
      </section>

      <section className="card">
        <h2>Effectiveness</h2>
        <p>{peptide.effectivenessSummary}</p>
      </section>

      <section className="card">
        <h2>Dosing</h2>
        <table>
          <thead>
            <tr>
              <th>Context</th>
              <th>Population</th>
              <th>Route</th>
              <th>Start</th>
              <th>Maintenance</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {peptide.dosing.map((dosing) => (
              <tr key={`${dosing.context}-${dosing.population}`}>
                <td>{statusLabel(dosing.context)}</td>
                <td>{dosing.population}</td>
                <td>{dosing.route}</td>
                <td>{dosing.startingDose}</td>
                <td>{dosing.maintenanceDose}</td>
                <td>{dosing.frequency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Safety</h2>
        <p>{peptide.safety}</p>
      </section>

      <section className="card">
        <h2>Vendors</h2>
        <div className="grid two">
          {peptide.vendors.map((vendor) => (
            <article className="card" key={vendor.slug}>
              <h3>{vendor.name}</h3>
              <p>
                Rating:{" "}
                <strong>
                  {vendor.rating === null || vendor.confidence === null
                    ? "No rating"
                    : `${vendor.rating.toFixed(1)} stars`}
                </strong>
              </p>
              <p className="muted">
                Confidence:{" "}
                {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
              </p>
              <p className="muted">Signals: {vendor.reasonTags.join(", ")}</p>
              {vendor.isAffiliate ? <span className="chip">Affiliate</span> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Long Description</h2>
        <p>{peptide.longDescription}</p>
      </section>
    </div>
  );
}
