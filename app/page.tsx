import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid" style={{ gap: "1.2rem" }}>
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Peptide Reference Database</h1>
        <p className="muted">
          Consumer-first peptide reference with a clinical toggle, evidence grading, jurisdiction badges
          (US/EU/UK/CA/AU), and research-based vendor reliability scoring.
        </p>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <Link className="btn" href="/peptides">
            Browse Peptides
          </Link>
          <Link className="btn" href="/vendors">
            Browse Vendors
          </Link>
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Template Sections</h2>
          <p className="muted">
            Intro, feature table, use cases, research, effectiveness, dosing, safety, vendors, long monograph,
            and references.
          </p>
        </article>
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Rating Policy</h2>
          <p className="muted">
            Vendor ratings are internal research scores only. If evidence is limited, vendors are shown as
            <strong> No rating</strong>.
          </p>
        </article>
      </section>
    </div>
  );
}
