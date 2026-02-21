import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { capitalizeLeadingLetter } from "@/lib/display-format";
import { buildHealthGoalCards, getHealthGoalBySlug, HEALTH_GOAL_DEFINITIONS } from "@/lib/health-goals";
import type { HealthGoalCard } from "@/lib/health-goals";
import { listPeptides } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type GoalFaqEntry = {
  question: string;
  answer: string;
};

const CROSS_GOAL_FAQ_QUESTIONS = [
  "How should I compare evidence grades across peptides in this goal?",
  "How should I use regulatory status badges when evaluating options?",
  "What should I check before discussing a peptide with a clinician?"
];

function buildGoalFaqAnswer(goalCard: HealthGoalCard, question: string): string {
  const questionLower = question.toLowerCase();
  const useCaseText = goalCard.matchedUseCases.join(", ");

  if (questionLower.includes("evidence grade")) {
    return `Use evidence grade as a confidence signal, not a standalone decision rule. In ${goalCard.title.toLowerCase()}, start with A/B evidence entries, then compare study design quality, population fit, and source-linked claims before drawing conclusions.`;
  }
  if (questionLower.includes("regulatory status")) {
    return `Check whether a peptide has approved status in your jurisdiction (US/EU/UK/CA/AU) for the specific intended use. Approval in one region or indication does not automatically validate broad consumer claims in ${goalCard.title.toLowerCase()}.`;
  }
  if (questionLower.includes("dosing")) {
    return `Compare route, frequency, and context across peptide profiles, then prioritize approved-label dosing where available. For investigational entries in ${goalCard.title.toLowerCase()}, dosing should be interpreted as study context rather than universal guidance.`;
  }
  if (questionLower.includes("safety") || questionLower.includes("adverse") || questionLower.includes("contraindication")) {
    return `Review adverse effects, contraindications, interactions, and monitoring together. For this goal, cross-check safety sections against comorbidities and concurrent therapies, then confirm the relevance of each risk signal to your profile.`;
  }
  if (questionLower.includes("monitoring")) {
    return `Monitoring should match peptide mechanism, goal-specific risks, and treatment context. Use profile monitoring guidance as a baseline, then align labs and follow-up intervals with clinician recommendations and jurisdiction-specific standards.`;
  }
  if (questionLower.includes("approved") || questionLower.includes("investigational")) {
    return `This goal includes both approved and investigational peptides. Use the regulatory badges and evidence claims to separate established indication pathways from exploratory use-case claims before comparing expected outcomes.`;
  }
  if (questionLower.includes("how quickly") || questionLower.includes("fast") || questionLower.includes("timeline")) {
    return `Response timing varies by peptide, endpoint, and study design. Use each peptide page to compare endpoint timing windows and durability signals rather than assuming a uniform time-to-benefit across this goal.`;
  }
  if (questionLower.includes("interactions")) {
    return `Interaction risk depends on mechanism and co-therapy context. In ${goalCard.title.toLowerCase()}, review interaction notes for each profile and prioritize clinician review when combining with endocrine, cardiometabolic, neurologic, or reproductive medications.`;
  }

  return `Use this goal page to compare peptides mapped to ${useCaseText}. Open each peptide profile to validate evidence links, regulatory context, dosing framework, and safety details before treating any single claim as definitive.`;
}

function buildGoalFaqEntries(goalCard: HealthGoalCard): GoalFaqEntry[] {
  const questions = Array.from(new Set([...goalCard.keyQuestions, ...CROSS_GOAL_FAQ_QUESTIONS]));
  return questions.map((question) => ({
    question,
    answer: buildGoalFaqAnswer(goalCard, question)
  }));
}

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
  const faqEntries = buildGoalFaqEntries(goalCard);
  const faqItems = faqEntries.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: entry.answer
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
                <Link href={`/peptides/${peptide.slug}`}>
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
        <p className="muted">
          Open each question to view a practical answer for comparing peptides in this goal category.
        </p>
        <div className="faq-slideout-list">
          {faqEntries.map((entry, index) => (
            <details key={entry.question} className="faq-slideout-item" open={index === 0}>
              <summary>{entry.question}</summary>
              <div className="faq-slideout-panel">
                <p>{entry.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
