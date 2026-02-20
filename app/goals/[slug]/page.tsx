import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { capitalizeLeadingLetter } from "@/lib/display-format";
import { buildHealthGoalCards, getHealthGoalBySlug, HEALTH_GOAL_DEFINITIONS } from "@/lib/health-goals";
import { listPeptides } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return HEALTH_GOAL_DEFINITIONS.map((goal) => ({ slug: goal.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const goal = getHealthGoalBySlug(slug);
  if (!goal) {
    return {
      title: "Goal Not Found",
      robots: { index: false, follow: false }
    };
  }

  const title = `${goal.title} Peptides: Evidence, Safety, and Regulatory Status`;
  return {
    title,
    description: goal.description,
    openGraph: {
      type: "article",
      url: absoluteUrl(`/goals/${goal.slug}`),
      title,
      description: goal.description
    },
    alternates: {
      canonical: `/goals/${goal.slug}`
    }
  };
}

export default async function GoalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const peptides = await listPeptides();
  const goalCards = buildHealthGoalCards(peptides, 50, 200);
  const goalCard = goalCards.find((entry) => entry.slug === slug);

  if (!goalCard) {
    notFound();
  }

  const topEvidencePeptides = goalCard.peptides.slice(0, 24);
  const faqItems = goalCard.keyQuestions.map((question) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: `Use the linked peptide profiles in this ${goalCard.title.toLowerCase()} category to compare evidence grade, jurisdiction status, dosing context, and safety notes with source-level references.`
    }
  }));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${goalCard.title} Peptides`,
      url: absoluteUrl(`/goals/${goalCard.slug}`),
      description: goalCard.description,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: topEvidencePeptides.length,
        itemListElement: topEvidencePeptides.map((peptide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: capitalizeLeadingLetter(peptide.name),
          url: absoluteUrl(`/peptides/${peptide.slug}`)
        }))
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems
    }
  ];

  return (
    <article className="grid" itemScope itemType="https://schema.org/CollectionPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Health Goals", href: "/goals" },
          { label: goalCard.title }
        ]}
      />

      <section className="card hero">
        <h1>{goalCard.title} Peptides</h1>
        <p className="muted">{goalCard.subtitle}</p>
        <p>{goalCard.description}</p>
        <div className="meta-row">
          <span className="kpi-pill">{goalCard.peptideCount} mapped peptides</span>
          <span className="kpi-pill">{goalCard.matchedUseCases.length} mapped use cases</span>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" href={`/peptides?useCase=${encodeURIComponent(goalCard.primaryUseCase)}`}>
            Browse This Goal
          </Link>
          <Link className="btn" href="/goals">
            All Goals
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Mapped Use Cases</h2>
        <div>
          {goalCard.matchedUseCases.map((useCase) => (
            <Link key={useCase} className="chip chip-link" href={`/peptides?useCase=${encodeURIComponent(useCase)}`}>
              {useCase}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Top Evidence-Mapped Peptides</h2>
        <p className="muted">
          Sorted by evidence grade first, then name. Use each profile for regulatory status, safety, long description,
          and source-linked references.
        </p>
        <div className="grid two">
          {topEvidencePeptides.map((peptide) => (
            <article key={peptide.slug} className="card">
              <h3>
                <Link href={`/peptides/${peptide.slug}?from=${encodeURIComponent(`/goals/${goalCard.slug}`)}`}>
                  {capitalizeLeadingLetter(peptide.name)}
                </Link>
              </h3>
              <p className="muted">Class: {peptide.className}</p>
              <p className="muted">
                Evidence grade: <strong>{peptide.evidenceGrade}</strong>
              </p>
              <div>
                {peptide.useCases.slice(0, 4).map((useCase) => (
                  <span key={`${peptide.slug}-${useCase}`} className="chip">
                    {useCase}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Common Questions</h2>
        <ul>
          {goalCard.keyQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
