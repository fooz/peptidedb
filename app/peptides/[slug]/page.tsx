import { notFound } from "next/navigation";
import { getPeptideDetail } from "@/lib/repository";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function statusLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function PeptideDetailPage({ params }: PageProps) {
  const { slug } = await params;
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
        <p>{peptide.intro}</p>
        <h3>Clinical view:</h3>
        <p>{peptide.mechanism}</p>
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

      <section className="card">
        <h2>Evidence And References</h2>
        {peptide.evidenceClaims.length === 0 ? (
          <p className="empty-state">No curated citations have been added for this peptide yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Claim</th>
                <th>Evidence Grade</th>
                <th>Source</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {peptide.evidenceClaims.map((claim, index) => (
                <tr key={`${claim.sourceUrl}-${index}`}>
                  <td>{claim.section}</td>
                  <td>{claim.claimText}</td>
                  <td>{claim.evidenceGrade ?? "N/A"}</td>
                  <td>
                    <a href={claim.sourceUrl} target="_blank" rel="noreferrer">
                      {claim.sourceTitle ?? "Open source"}
                    </a>
                  </td>
                  <td>{formatDate(claim.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
