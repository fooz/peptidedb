export type JurisdictionCode = "US" | "EU" | "UK" | "CA" | "AU";

export type RegulatoryStatus =
  | "US_FDA_APPROVED"
  | "NON_US_APPROVED"
  | "INVESTIGATIONAL"
  | "RESEARCH_ONLY";

export type EvidenceGrade = "A" | "B" | "C" | "D" | "I";

export type DosingContext = "APPROVED_LABEL" | "STUDY_REPORTED" | "EXPERT_CONSENSUS";

export interface PeptideSummary {
  slug: string;
  name: string;
  aliases: string[];
  className: string;
  routes: string[];
  useCases: string[];
  statusByJurisdiction: Record<JurisdictionCode, RegulatoryStatus>;
  evidenceGrade: EvidenceGrade;
}

export interface DosingEntry {
  context: DosingContext;
  population: string;
  route: string;
  startingDose: string;
  maintenanceDose: string;
  frequency: string;
  notes: string;
}

export interface VendorCard {
  slug: string;
  name: string;
  rating: number | null;
  confidence: number | null;
  reasonTags: string[];
  isAffiliate: boolean;
}

export interface VendorPeptideListing {
  slug: string;
  name: string;
  className: string;
}

export interface VendorReviewQuote {
  source: string;
  community: string;
  quote: string;
  sourceUrl: string;
  createdAt: string;
  author: string | null;
  sentimentLabel: "positive" | "mixed" | "negative" | "neutral";
  sentimentScore: number | null;
  upvotes: number | null;
  commentCount: number | null;
}

export interface VendorDetail extends VendorCard {
  websiteUrl: string;
  description: string;
  features: string[];
  trustSignals: string[];
  availablePeptides: VendorPeptideListing[];
  reviews: VendorReviewQuote[];
  socialSentimentScore: number | null;
  socialSentimentLabel: "positive" | "mixed" | "negative" | "neutral" | null;
}

export interface EvidenceClaim {
  section: string;
  claimText: string;
  evidenceGrade: EvidenceGrade | null;
  sourceUrl: string;
  sourceTitle: string | null;
  publishedAt: string;
  retrievedAt: string | null;
}

export interface SafetyProfile {
  adverseEffects: string;
  contraindications: string;
  interactions: string;
  monitoring: string;
}

export interface PeptideDetail extends PeptideSummary {
  intro: string;
  featureTable: Record<string, string>;
  mechanism: string;
  effectivenessSummary: string;
  safety: SafetyProfile;
  longDescription: string;
  dosing: DosingEntry[];
  vendors: VendorCard[];
  evidenceClaims: EvidenceClaim[];
}
