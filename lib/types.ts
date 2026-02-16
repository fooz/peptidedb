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

export interface EvidenceClaim {
  section: string;
  claimText: string;
  evidenceGrade: EvidenceGrade | null;
  sourceUrl: string;
  sourceTitle: string | null;
  publishedAt: string;
  retrievedAt: string | null;
}

export interface PeptideDetail extends PeptideSummary {
  intro: string;
  featureTable: Record<string, string>;
  mechanism: string;
  effectivenessSummary: string;
  safety: string;
  longDescription: string;
  dosing: DosingEntry[];
  vendors: VendorCard[];
  evidenceClaims: EvidenceClaim[];
}
