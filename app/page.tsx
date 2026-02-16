import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid">
      <section className="card hero">
        <h1>Peptide Reference Database</h1>
        <p className="muted">
          Consumer-first peptide reference with a clinical toggle, evidence grading, jurisdiction badges
          (US/EU/UK/CA/AU), and research-based vendor reliability scoring.
        </p>
        <div className="meta-row" style={{ marginBottom: "0.9rem" }}>
          <span className="kpi-pill">US and non-US status separation</span>
          <span className="kpi-pill">Research-derived vendor ratings</span>
          <span className="kpi-pill">Consumer and clinical views</span>
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
          <p className="muted">
            Intro, feature table, use cases, research, effectiveness, dosing, safety, vendors, long monograph,
            and references.
          </p>
        </article>
        <article className="card">
          <h2>Rating Policy</h2>
          <p className="muted">
            Vendor ratings are internal research scores only. If evidence is limited, vendors are shown as
            <strong> No rating</strong>.
          </p>
        </article>
        <article className="card">
          <h2>Trust Signals</h2>
          <p className="muted">
            Regulatory status badges and evidence grades are displayed before affiliate/vendor availability.
          </p>
        </article>
      </section>
    </div>
  );
}
