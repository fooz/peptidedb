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
  },
  {
    slug: "unknown-source-vendor",
    name: "Unknown Source Vendor",
    rating: null,
    confidence: null,
    reasonTags: ["insufficient_data"],
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
    safety:
      "Frequent gastrointestinal adverse effects; monitor for pancreatitis signs and contraindications based on patient history.",
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
    vendors
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
    safety:
      "Safety profile is not well established in large controlled human studies; product quality variability is a major practical risk.",
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
    vendors
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
