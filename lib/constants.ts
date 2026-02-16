import type { EvidenceGrade, JurisdictionCode, RegulatoryStatus } from "@/lib/types";

export const JURISDICTIONS: JurisdictionCode[] = ["US", "EU", "UK", "CA", "AU"];

export const REGULATORY_STATUSES: RegulatoryStatus[] = [
  "US_FDA_APPROVED",
  "NON_US_APPROVED",
  "INVESTIGATIONAL",
  "RESEARCH_ONLY"
];

export const EVIDENCE_GRADES: EvidenceGrade[] = ["A", "B", "C", "D", "I"];

export function labelFromSnake(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
