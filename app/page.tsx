import type { Metadata } from "next";
import Link from "next/link";
import { StarRating } from "@/app/components/star-rating";
import { listPeptides, listVendors } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";
import type { PeptideSummary } from "@/lib/types";

const EVIDENCE_RANK: Record<PeptideSummary["evidenceGrade"], number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  I: 4
};

type HealthGoalDefinition = {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  mappedUseCases: string[];
};

type HealthGoalCard = HealthGoalDefinition & {
  matchedUseCases: string[];
  primaryUseCase: string;
  peptideCount: number;
  peptides: PeptideSummary[];
};

const HEALTH_GOAL_DEFINITIONS: HealthGoalDefinition[] = [
  {
    slug: "weight-loss-metabolic",
    icon: "🏃",
    title: "Weight Loss",
    subtitle: "Fat loss and metabolic support",
    mappedUseCases: ["Weight Management", "Type 2 Diabetes", "Cardiometabolic Risk Reduction"]
  },
  {
    slug: "muscle-strength",
    icon: "💪",
    title: "Muscle & Strength",
    subtitle: "Muscle maintenance and performance support",
    mappedUseCases: ["Growth Hormone Deficiency", "Growth Hormone Secretagogue", "Recovery Support", "Tissue Repair"]
  },
  {
    slug: "anti-aging-longevity",
    icon: "✨",
    title: "Anti-Aging & Longevity",
    subtitle: "Skin health, vitality, and inflammatory balance",
    mappedUseCases: ["Dermatology & Aesthetics", "Inflammatory & Immune Modulation", "Immune Modulation"]
  },
  {
    slug: "recovery-healing",
    icon: "🩹",
    title: "Recovery & Healing",
    subtitle: "Tissue support and post-stress recovery",
    mappedUseCases: ["Tissue Repair", "Recovery Support", "GI Symptoms"]
  },
  {
    slug: "cognitive",
    icon: "🧠",
    title: "Cognitive Enhancement",
    subtitle: "Focus, memory, and neurological support",
    mappedUseCases: ["Neurology & Cognition"]
  },
  {
    slug: "hormone-reproductive",
    icon: "⚖️",
    title: "Hormone & Reproductive Health",
    subtitle: "Endocrine and reproductive support",
    mappedUseCases: ["Reproductive Health", "Sexual Health", "Endocrine Suppression"]
  },
  {
    slug: "renal-metabolic",
    icon: "🩺",
    title: "Kidney & Metabolic Care",
    subtitle: "Renal and broad metabolic management",
    mappedUseCases: ["Kidney & Renal Care", "Type 1 Diabetes", "Type 2 Diabetes"]
  }
];

function uniqueBySlug(peptides: PeptideSummary[]): PeptideSummary[] {
  const deduped = new Map<string, PeptideSummary>();
  for (const peptide of peptides) {
    if (!deduped.has(peptide.slug)) {
      deduped.set(peptide.slug, peptide);
    }
  }
  return Array.from(deduped.values());
}

function sortForPreview(peptides: PeptideSummary[]): PeptideSummary[] {
  return [...peptides].sort((a, b) => {
    const gradeRank = EVIDENCE_RANK[a.evidenceGrade] - EVIDENCE_RANK[b.evidenceGrade];
    if (gradeRank !== 0) {
      return gradeRank;
    }
    return a.name.localeCompare(b.name);
  });
}

function toDisplayName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  const hasUppercase = /[A-Z]/.test(trimmed);
  if (hasUppercase) {
    return trimmed;
  }
  return trimmed.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function buildHealthGoalCards(peptides: PeptideSummary[]): HealthGoalCard[] {
  const useCaseSet = new Set(peptides.flatMap((peptide) => peptide.useCases));

  return HEALTH_GOAL_DEFINITIONS.map((definition) => {
    const matchedUseCases = definition.mappedUseCases.filter((useCase) => useCaseSet.has(useCase));
    if (matchedUseCases.length === 0) {
      return null;
    }

    const matchedPeptides = sortForPreview(
      uniqueBySlug(peptides.filter((peptide) => peptide.useCases.some((useCase) => matchedUseCases.includes(useCase))))
    );

    return {
      ...definition,
      matchedUseCases,
      primaryUseCase: matchedUseCases[0],
      peptideCount: matchedPeptides.length,
      peptides: matchedPeptides.slice(0, 4)
    } satisfies HealthGoalCard;
  })
    .filter((goal): goal is HealthGoalCard => goal !== null && goal.peptideCount > 0)
    .sort((a, b) => b.peptideCount - a.peptideCount)
    .slice(0, 6);
}

export const metadata: Metadata = {
  title: "Home",
  description:
    "Consumer-friendly peptide reference organized by health goals, with embedded clinical context, jurisdiction status badges, and research-derived vendor ratings.",
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const [peptides, vendors] = await Promise.all([listPeptides(), listVendors()]);
  const healthGoals = buildHealthGoalCards(peptides);
  const uniqueUseCases = new Set(peptides.flatMap((peptide) => peptide.useCases));
  const featuredPeptides = uniqueBySlug(healthGoals.flatMap((goal) => goal.peptides)).slice(0, 8);
  const ratedVendors = vendors.filter((vendor) => vendor.rating !== null);
  const unratedVendors = vendors.filter((vendor) => vendor.rating === null);
  const topRatedVendors = [...ratedVendors].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PeptideDB Home",
    url: absoluteUrl("/"),
    description:
      "Consumer-first peptide reference with embedded clinical context, jurisdiction status badges, and research-derived vendor ratings.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: featuredPeptides.map((peptide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/peptides/${peptide.slug}`),
        name: peptide.name
      }))
    }
  };

  return (
    <div className="grid" itemScope itemType="https://schema.org/WebPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <section className="card hero" itemProp="mainEntity" itemScope itemType="https://schema.org/WebSite">
        <h1>Peptide Reference Database</h1>
        <p className="muted" itemProp="description">
          Consumer-first peptide reference with embedded clinical context, evidence grading, jurisdiction badges
          (US/EU/UK/CA/AU), and research-based vendor reliability scoring.
        </p>
        <div className="meta-row" style={{ marginBottom: "0.9rem" }}>
          <span className="kpi-pill">US/EU/UK/CA/AU status badges</span>
          <span className="kpi-pill">Research-derived vendor ratings</span>
          <span className="kpi-pill">Human-readable evidence links</span>
          <span className="kpi-pill">{peptides.length} published peptides</span>
        </div>
        <form action="/peptides" method="get" className="home-search">
          <label htmlFor="home-q">Search peptides</label>
          <div className="home-search-row">
            <input id="home-q" name="q" placeholder="Try: Ipamorelin, BPC-157, Semaglutide" />
            <button type="submit" className="btn primary">
              Search
            </button>
          </div>
        </form>
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
        <article className="card stat-card">
          <h2>{peptides.length}</h2>
          <p className="muted">Published peptide profiles</p>
        </article>
        <article className="card stat-card">
          <h2>{uniqueUseCases.size}</h2>
          <p className="muted">Use-case categories</p>
        </article>
        <article className="card stat-card">
          <h2>{ratedVendors.length}</h2>
          <p className="muted">Vendors with ratings</p>
        </article>
      </section>

      <section className="card">
        <h2>Browse by Health Goal</h2>
        <p className="muted">
          Start with a goal, then drill down to peptides and evidence details. Each goal maps to your existing use case
          taxonomy.
        </p>
        <div className="goal-grid">
          {healthGoals.map((goal) => (
            <article key={goal.slug} className="goal-card">
              <div className="goal-head">
                <span className="goal-icon" aria-hidden="true">
                  {goal.icon}
                </span>
                <div>
                  <h3>{goal.title}</h3>
                  <p className="muted">{goal.subtitle}</p>
                </div>
              </div>
              <div style={{ marginBottom: "0.6rem" }}>
                {goal.matchedUseCases.map((useCase) => (
                  <Link key={`${goal.slug}-${useCase}`} className="chip chip-link" href={`/peptides?useCase=${encodeURIComponent(useCase)}`}>
                    {useCase}
                  </Link>
                ))}
              </div>
              <div className="home-link-list">
                {goal.peptides.slice(0, 3).map((peptide) => {
                  const sourceUseCase = goal.matchedUseCases.find((useCase) => peptide.useCases.includes(useCase)) ?? goal.primaryUseCase;
                  const returnTo = `/peptides?useCase=${encodeURIComponent(sourceUseCase)}`;
                  return (
                    <Link
                      key={`${goal.slug}-${peptide.slug}`}
                      href={`/peptides/${peptide.slug}?from=${encodeURIComponent(returnTo)}`}
                      className="subtle-link"
                    >
                      {toDisplayName(peptide.name)}
                    </Link>
                  );
                })}
              </div>
              <Link className="btn" href={`/peptides?useCase=${encodeURIComponent(goal.primaryUseCase)}`}>
                View {goal.peptideCount} {goal.peptideCount === 1 ? "peptide" : "peptides"}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Popular Peptides</h2>
          <p className="muted">Quick links into high-traffic peptide profiles.</p>
          <div className="home-link-list">
            {featuredPeptides.map((peptide) => (
              <Link
                key={peptide.slug}
                href={`/peptides/${peptide.slug}?from=${encodeURIComponent("/peptides")}`}
                className="subtle-link"
              >
                {toDisplayName(peptide.name)}
              </Link>
            ))}
          </div>
        </article>
        <article className="card" itemScope itemType="https://schema.org/ItemList">
          <h2>Top Rated Vendors</h2>
          <p className="muted">
            Ratings are research-derived and non-user-submitted: <strong>{ratedVendors.length}</strong> rated,{" "}
            <strong>{unratedVendors.length}</strong> no rating.
          </p>
          <div className="home-link-list">
            {topRatedVendors.map((vendor, index) => (
              <Link
                key={vendor.slug}
                href={`/vendors/${vendor.slug}`}
                className="subtle-link home-vendor-link"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <span itemProp="name">
                  {vendor.name} <StarRating rating={vendor.rating} idPrefix={`home-${vendor.slug}`} />
                </span>
                <meta itemProp="position" content={String(index + 1)} />
              </Link>
            ))}
          </div>
          <Link className="btn" href="/vendors?ratingState=rated">
            Browse Rated Vendors
          </Link>
        </article>
      </section>
    </div>
  );
}
