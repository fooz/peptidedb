import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { capitalizeLeadingLetter } from "@/lib/display-format";
import { buildHealthGoalCards } from "@/lib/health-goals";
import { listPeptides } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Peptide Health Goals",
  description:
    "Browse peptides by health goal, including evidence quality, regulatory context, and linked condition-focused use-case pages.",
  openGraph: {
    type: "website",
    url: absoluteUrl("/goals"),
    title: "Peptide Health Goals | PeptideDB",
    description:
      "Browse peptides by health goal, including evidence quality, regulatory context, and linked condition-focused use-case pages."
  },
  alternates: {
    canonical: "/goals"
  }
};

export default async function GoalsIndexPage() {
  const peptides = await listPeptides();
  const goals = buildHealthGoalCards(peptides, 20, 4);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Peptide Health Goals",
    url: absoluteUrl("/goals"),
    description:
      "Browse peptides by health goal, including evidence quality, regulatory context, and linked condition-focused use-case pages.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: goals.length,
      itemListElement: goals.map((goal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: goal.title,
        url: absoluteUrl(`/goals/${goal.slug}`)
      }))
    }
  };

  return (
    <div className="grid" itemScope itemType="https://schema.org/CollectionPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Health Goals" }]} />
      <section className="card">
        <h1>Peptide Health Goals</h1>
        <p className="muted">
          Goal-focused pages are designed for search and quick decision support. Each goal links to evidence-ranked
          peptides and direct filter views.
        </p>
      </section>

      <section className="goal-grid">
        {goals.map((goal) => (
          <article key={goal.slug} className="goal-card">
            <div className="goal-head">
              <span className="goal-icon" aria-hidden="true">
                {goal.icon}
              </span>
              <div>
                <h2>{goal.title}</h2>
                <p className="muted">{goal.subtitle}</p>
              </div>
            </div>
            <p>{goal.description}</p>
            <div>
              {goal.matchedUseCases.map((useCase) => (
                <Link key={`${goal.slug}-${useCase}`} className="chip chip-link" href={`/peptides?useCase=${encodeURIComponent(useCase)}`}>
                  {useCase}
                </Link>
              ))}
            </div>
            <div className="home-link-list">
              {goal.peptides.map((peptide) => (
                <Link
                  key={`${goal.slug}-${peptide.slug}`}
                  href={`/peptides/${peptide.slug}`}
                  className="subtle-link"
                >
                  {capitalizeLeadingLetter(peptide.name)}
                </Link>
              ))}
            </div>
            <div className="hero-actions">
              <Link className="btn primary" href={`/goals/${goal.slug}`}>
                Open Goal Page
              </Link>
              <Link className="btn" href={`/peptides?useCase=${encodeURIComponent(goal.primaryUseCase)}`}>
                Browse {goal.peptideCount}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
