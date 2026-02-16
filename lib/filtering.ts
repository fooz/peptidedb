import { EVIDENCE_GRADES, JURISDICTIONS, REGULATORY_STATUSES } from "@/lib/constants";
import type { EvidenceGrade, JurisdictionCode, PeptideSummary, RegulatoryStatus, VendorCard } from "@/lib/types";

export type PeptideFilters = {
  q: string;
  useCase: string;
  jurisdiction: JurisdictionCode | "";
  status: RegulatoryStatus | "";
  evidence: EvidenceGrade | "";
  route: string;
};

export type VendorFilters = {
  q: string;
  minRating: number | null;
  affiliate: "all" | "yes" | "no";
  ratingState: "all" | "rated" | "unrated";
};

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function asSingle(value: SearchValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function toLower(value: string): string {
  return value.toLowerCase();
}

function includesText(haystack: string, needle: string): boolean {
  return toLower(haystack).includes(toLower(needle));
}

export function parsePeptideFilters(searchParams?: SearchParams): PeptideFilters {
  const q = asSingle(searchParams?.q);
  const useCase = asSingle(searchParams?.useCase);
  const jurisdictionRaw = asSingle(searchParams?.jurisdiction);
  const statusRaw = asSingle(searchParams?.status);
  const evidenceRaw = asSingle(searchParams?.evidence);
  const route = asSingle(searchParams?.route);

  const jurisdiction = JURISDICTIONS.includes(jurisdictionRaw as JurisdictionCode)
    ? (jurisdictionRaw as JurisdictionCode)
    : "";
  const status = REGULATORY_STATUSES.includes(statusRaw as RegulatoryStatus)
    ? (statusRaw as RegulatoryStatus)
    : "";
  const evidence = EVIDENCE_GRADES.includes(evidenceRaw as EvidenceGrade)
    ? (evidenceRaw as EvidenceGrade)
    : "";

  return { q, useCase, jurisdiction, status, evidence, route };
}

export function parseVendorFilters(searchParams?: SearchParams): VendorFilters {
  const q = asSingle(searchParams?.q);
  const minRatingRaw = asSingle(searchParams?.minRating);
  const affiliateRaw = asSingle(searchParams?.affiliate);
  const ratingStateRaw = asSingle(searchParams?.ratingState);

  const parsedMin = minRatingRaw ? Number(minRatingRaw) : null;
  const minRating =
    parsedMin !== null && Number.isFinite(parsedMin) && parsedMin >= 0 && parsedMin <= 5 ? parsedMin : null;

  const affiliate: VendorFilters["affiliate"] =
    affiliateRaw === "yes" || affiliateRaw === "no" ? affiliateRaw : "all";
  const ratingState: VendorFilters["ratingState"] =
    ratingStateRaw === "rated" || ratingStateRaw === "unrated" ? ratingStateRaw : "all";

  return { q, minRating, affiliate, ratingState };
}

export function filterPeptides(peptides: PeptideSummary[], filters: PeptideFilters): PeptideSummary[] {
  return peptides.filter((peptide) => {
    if (filters.q) {
      const aliasText = peptide.aliases.join(" ");
      if (!includesText(peptide.name, filters.q) && !includesText(aliasText, filters.q)) {
        return false;
      }
    }

    if (filters.useCase) {
      const hasUseCase = peptide.useCases.some((value) => value === filters.useCase);
      if (!hasUseCase) {
        return false;
      }
    }

    if (filters.jurisdiction && filters.status) {
      if (peptide.statusByJurisdiction[filters.jurisdiction] !== filters.status) {
        return false;
      }
    } else if (filters.status) {
      const statusMatch = Object.values(peptide.statusByJurisdiction).some((value) => value === filters.status);
      if (!statusMatch) {
        return false;
      }
    } else if (filters.jurisdiction) {
      const status = peptide.statusByJurisdiction[filters.jurisdiction];
      if (!status || status === "RESEARCH_ONLY") {
        return false;
      }
    }

    if (filters.evidence && peptide.evidenceGrade !== filters.evidence) {
      return false;
    }

    if (filters.route) {
      const routeMatch = peptide.routes.some((route) => route === filters.route);
      if (!routeMatch) {
        return false;
      }
    }

    return true;
  });
}

export function filterVendors(vendors: VendorCard[], filters: VendorFilters): VendorCard[] {
  return vendors.filter((vendor) => {
    if (filters.q && !includesText(vendor.name, filters.q)) {
      return false;
    }

    if (filters.affiliate === "yes" && !vendor.isAffiliate) {
      return false;
    }
    if (filters.affiliate === "no" && vendor.isAffiliate) {
      return false;
    }

    if (filters.ratingState === "rated" && vendor.rating === null) {
      return false;
    }
    if (filters.ratingState === "unrated" && vendor.rating !== null) {
      return false;
    }

    if (filters.minRating !== null) {
      if (vendor.rating === null || vendor.rating < filters.minRating) {
        return false;
      }
    }

    return true;
  });
}
