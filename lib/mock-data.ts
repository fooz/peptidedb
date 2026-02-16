import type { PeptideDetail, VendorCard } from "./types";

const vendors: VendorCard[] = [
  {
    slug: "nova-peptide-labs",
    name: "Nova Peptide Labs",
    rating: 4.4,
    confidence: 0.82,
    reasonTags: ["third_party_lab_docs", "cold_chain_policy", "regulatory_clear_history"],
    isAffiliate: true
  },
  {
    slug: "atlas-biologics",
    name: "Atlas Biologics",
    rating: 3.6,
    confidence: 0.67,
    reasonTags: ["coa_available", "limited_recent_testing"],
    isAffiliate: false
  }
];

export const peptideData: PeptideDetail[] = [
  {
    slug: "semaglutide",
    name: "Semaglutide",
    aliases: ["Ozempic", "Wegovy", "Rybelsus"],
    className: "GLP-1 receptor agonist peptide",
    routes: ["Subcutaneous", "Oral"],
    useCases: ["Type 2 Diabetes", "Weight Management"],
    statusByJurisdiction: {
      US: "US_FDA_APPROVED",
      EU: "NON_US_APPROVED",
      UK: "NON_US_APPROVED",
      CA: "NON_US_APPROVED",
      AU: "NON_US_APPROVED"
    },
    evidenceGrade: "A",
    intro:
      "Semaglutide is a GLP-1 analog peptide used for glycemic control and chronic weight management in specific populations.",
    featureTable: {
      "Peptide class": "GLP-1 analog",
      "Typical route": "SC weekly, oral daily variants",
      "Evidence strength": "High for approved indications",
      "Common concerns": "GI effects, discontinuation relapse risk"
    },
    mechanism:
      "Activates GLP-1 receptors to improve insulin secretion, reduce glucagon output, slow gastric emptying, and influence satiety pathways.",
    effectivenessSummary:
      "Strong efficacy in approved indications with consistent RCT evidence; durability depends on adherence and long-term management context.",
    safety: {
      adverseEffects: "Frequent gastrointestinal adverse effects, especially during dose escalation.",
      contraindications: "Contraindications should be screened using current label guidance and patient history.",
      interactions: "Review concomitant glucose-lowering therapies and delayed gastric emptying considerations.",
      monitoring: "Track tolerability, adherence, glycemic response, and any severe or persistent symptoms."
    },
    longDescription:
      "Clinical evidence is strongest for approved use cases. Study-reported outcomes in additional populations should be interpreted with trial design and endpoint limitations in mind.",
    dosing: [
      {
        context: "APPROVED_LABEL",
        population: "Adults with approved indication",
        route: "Subcutaneous",
        startingDose: "Low initial dose per label titration",
        maintenanceDose: "Step-up to target label dose",
        frequency: "Weekly",
        notes: "Use official label for exact product-specific titration."
      },
      {
        context: "STUDY_REPORTED",
        population: "Investigational cohorts",
        route: "Subcutaneous",
        startingDose: "Varies by trial",
        maintenanceDose: "Varies by protocol",
        frequency: "Weekly",
        notes: "Research context only; not treatment guidance."
      }
    ],
    vendors,
    evidenceClaims: [
      {
        section: "Effectiveness",
        claimText: "Large randomized trials support efficacy in approved populations.",
        evidenceGrade: "A",
        sourceUrl: "https://clinicaltrials.gov/",
        sourceTitle: "ClinicalTrials evidence summary",
        publishedAt: "2024-01-15",
        retrievedAt: "2026-02-16T00:00:00Z"
      }
    ]
  },
  {
    slug: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound"],
    className: "Synthetic gastric peptide fragment",
    routes: ["Oral", "Subcutaneous"],
    useCases: ["Tissue Repair", "GI Symptoms"],
    statusByJurisdiction: {
      US: "INVESTIGATIONAL",
      EU: "INVESTIGATIONAL",
      UK: "INVESTIGATIONAL",
      CA: "INVESTIGATIONAL",
      AU: "INVESTIGATIONAL"
    },
    evidenceGrade: "C",
    intro:
      "BPC-157 is frequently discussed in consumer forums, but high-quality human evidence remains limited and regulatory status is generally investigational.",
    featureTable: {
      "Peptide class": "Synthetic fragment",
      "Typical route": "Study-dependent",
      "Evidence strength": "Limited human evidence",
      "Common concerns": "Variable product quality, uncertain long-term safety"
    },
    mechanism:
      "Proposed mechanisms include angiogenic and tissue signaling effects, but translational certainty in humans is still low.",
    effectivenessSummary:
      "Current data does not provide robust, broadly generalizable efficacy conclusions for most claimed consumer use cases.",
    safety: {
      adverseEffects: "Human adverse-effect profile is not well established in large controlled trials.",
      contraindications: "Definitive contraindication frameworks are not yet fully established.",
      interactions: "Interaction profile remains uncertain due to limited and heterogeneous evidence.",
      monitoring: "Use protocol-level monitoring and careful source-quality review in investigational contexts."
    },
    longDescription:
      "For investigational peptides, this database separates study findings from approved treatment guidance and flags lower-certainty evidence.",
    dosing: [
      {
        context: "STUDY_REPORTED",
        population: "Small investigational cohorts",
        route: "Varies",
        startingDose: "Protocol-specific",
        maintenanceDose: "Protocol-specific",
        frequency: "Varies",
        notes: "Research context only; not treatment guidance."
      }
    ],
    vendors,
    evidenceClaims: [
      {
        section: "Safety",
        claimText: "Human safety evidence remains limited and not yet definitive.",
        evidenceGrade: "C",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/",
        sourceTitle: "PubMed indexed review summary",
        publishedAt: "2023-11-10",
        retrievedAt: "2026-02-16T00:00:00Z"
      }
    ]
  }
];

export function getAllPeptides(): PeptideDetail[] {
  return peptideData;
}

export function getPeptideBySlug(slug: string): PeptideDetail | undefined {
  return peptideData.find((p) => p.slug === slug);
}

export function getAllVendors(): VendorCard[] {
  return vendors;
}
