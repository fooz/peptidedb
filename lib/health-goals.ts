import type { PeptideSummary } from "@/lib/types";

const EVIDENCE_RANK: Record<PeptideSummary["evidenceGrade"], number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  I: 4
};

export type HealthGoalDefinition = {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  mappedUseCases: string[];
  keyQuestions: string[];
};

export type HealthGoalCard = HealthGoalDefinition & {
  matchedUseCases: string[];
  primaryUseCase: string;
  peptideCount: number;
  peptides: PeptideSummary[];
};

export const HEALTH_GOAL_DEFINITIONS: HealthGoalDefinition[] = [
  {
    slug: "weight-loss-metabolic",
    icon: "🏃",
    title: "Weight Loss",
    subtitle: "Fat loss and metabolic support",
    description:
      "Evidence-first coverage of peptides studied for weight management and cardiometabolic outcomes, including regulatory status and practical safety context.",
    mappedUseCases: ["Weight Management", "Type 2 Diabetes", "Cardiometabolic Risk Reduction"],
    keyQuestions: [
      "Which peptides have the strongest human outcomes for weight reduction?",
      "How do trial populations and dosing approaches differ by peptide?",
      "What safety signals and contraindications are most relevant for metabolic use?",
      "How quickly do weight and glycemic effects appear in studies?",
      "Which peptides are approved in major regions versus investigational-only?",
      "How durable are outcomes after dose changes or discontinuation?"
    ]
  },
  {
    slug: "muscle-strength",
    icon: "💪",
    title: "Muscle & Strength",
    subtitle: "Muscle maintenance and performance support",
    description:
      "Compares growth-hormone-axis and recovery-linked peptides with emphasis on evidence quality, realistic outcomes, and risk interpretation.",
    mappedUseCases: ["Growth Hormone Deficiency", "Growth Hormone Secretagogue", "Recovery Support", "Tissue Repair"],
    keyQuestions: [
      "Are outcomes based on approved indications or investigational contexts?",
      "How consistent are performance and recovery claims across studies?",
      "Which safety and monitoring issues matter most for repeated use?",
      "What endpoints are objective versus self-reported in muscle studies?",
      "How often are compounds stacked, and what does evidence say about that?",
      "Which populations are most represented in published human data?"
    ]
  },
  {
    slug: "anti-aging-longevity",
    icon: "✨",
    title: "Anti-Aging & Longevity",
    subtitle: "Skin health, vitality, and inflammatory balance",
    description:
      "Tracks peptides discussed for skin, inflammatory tone, and healthy aging endpoints with clear grading of evidence certainty.",
    mappedUseCases: ["Dermatology & Aesthetics", "Inflammatory & Immune Modulation", "Immune Modulation"],
    keyQuestions: [
      "Which benefits are supported by controlled human data versus early-stage evidence?",
      "What endpoints are actually measured in studies?",
      "How should consumers interpret durability and long-term safety claims?",
      "Which anti-aging claims are mostly mechanistic rather than clinically proven?",
      "What monitoring is reasonable for longer-duration use?",
      "How different is regulatory treatment by jurisdiction for these claims?"
    ]
  },
  {
    slug: "recovery-healing",
    icon: "🩹",
    title: "Recovery & Healing",
    subtitle: "Tissue support and post-stress recovery",
    description:
      "Focuses on connective tissue, healing, and symptom-recovery contexts, with source-level references and practical monitoring guidance.",
    mappedUseCases: ["Tissue Repair", "Recovery Support", "GI Symptoms"],
    keyQuestions: [
      "What evidence exists for injury or surgery recovery endpoints?",
      "How fast do outcomes appear in controlled settings?",
      "Which adverse effects are most commonly reported in recovery protocols?",
      "Which recovery outcomes are strongest in human trials versus animal models?",
      "How should protocol quality influence confidence in a recovery claim?",
      "What follow-up timeline is typical before reassessing effectiveness?"
    ]
  },
  {
    slug: "cognitive",
    icon: "🧠",
    title: "Cognitive Enhancement",
    subtitle: "Focus, memory, and neurological support",
    description:
      "Catalogs neurocognitive peptide claims with strict separation between mechanistic rationale and reproducible clinical outcomes.",
    mappedUseCases: ["Neurology & Cognition"],
    keyQuestions: [
      "Which compounds have human cognition-related endpoints?",
      "How strong is evidence versus anecdotal community reporting?",
      "What risk factors require clinician oversight?",
      "What cognitive endpoints are measured objectively in trials?",
      "How should mood or sleep effects be interpreted in mixed-study populations?",
      "Which interactions matter most with psychiatric or neurologic medications?"
    ]
  },
  {
    slug: "hormone-reproductive",
    icon: "⚖️",
    title: "Hormone & Reproductive Health",
    subtitle: "Endocrine and reproductive support",
    description:
      "Summarizes peptides used in endocrine and reproductive settings, with jurisdiction-specific status, indication context, and evidence depth.",
    mappedUseCases: ["Reproductive Health", "Sexual Health", "Endocrine Suppression"],
    keyQuestions: [
      "Which uses are approved treatment pathways versus research contexts?",
      "How do efficacy endpoints vary by reproductive indication?",
      "What monitoring standards are important for endocrine-active peptides?",
      "How do outcomes differ between male and female study populations?",
      "Which adverse effects require prompt clinical review?",
      "How should fertility goals shape peptide selection and follow-up?"
    ]
  },
  {
    slug: "renal-metabolic",
    icon: "🩺",
    title: "Kidney & Metabolic Care",
    subtitle: "Renal and broad metabolic management",
    description:
      "Covers peptide use in renal and metabolic disease settings, highlighting study quality, indication fit, and safety profile maturity.",
    mappedUseCases: ["Kidney & Renal Care", "Type 1 Diabetes", "Type 2 Diabetes"],
    keyQuestions: [
      "Which compounds are tied to renal outcomes in human studies?",
      "How should evidence be interpreted across diabetes subgroups?",
      "What contraindications and interactions are most relevant clinically?",
      "How does renal function change dosing and monitoring decisions?",
      "Which endpoints best reflect kidney protection versus glycemic control alone?",
      "What population limits reduce generalizability of trial findings?"
    ]
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

export function buildHealthGoalCards(peptides: PeptideSummary[], maxGoals = 6, peptidesPerGoal = 4): HealthGoalCard[] {
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
      peptides: matchedPeptides.slice(0, peptidesPerGoal)
    } satisfies HealthGoalCard;
  })
    .filter((goal): goal is HealthGoalCard => goal !== null && goal.peptideCount > 0)
    .sort((a, b) => b.peptideCount - a.peptideCount)
    .slice(0, maxGoals);
}

export function getHealthGoalBySlug(slug: string): HealthGoalDefinition | null {
  return HEALTH_GOAL_DEFINITIONS.find((goal) => goal.slug === slug) ?? null;
}
