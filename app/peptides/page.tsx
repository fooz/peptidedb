import Link from "next/link";
import { listPeptides } from "@/lib/repository";

export default async function PeptidesPage() {
  const peptides = await listPeptides();

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Peptide Directory</h1>
        <p className="muted">Live data from Supabase with fallback content while data is being curated.</p>
      </section>

      {peptides.map((peptide) => (
        <article key={peptide.slug} className="card">
          <h2 style={{ marginTop: 0 }}>
            <Link href={`/peptides/${peptide.slug}`}>{peptide.name}</Link>
          </h2>
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
    </div>
  );
}
