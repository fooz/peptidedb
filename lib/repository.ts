import { getAllPeptides, getAllVendors, getPeptideBySlug } from "@/lib/mock-data";
import { getSupabaseClient } from "@/lib/supabase";
import { getVendorSeedMetadata } from "@/lib/vendor-website-ingest";
import type {
  DosingEntry,
  EvidenceClaim,
  EvidenceGrade,
  JurisdictionCode,
  PeptideDetail,
  PeptideSummary,
  RegulatoryStatus,
  SafetyProfile,
  VendorCard,
  VendorDetail,
  VendorPeptideListing
} from "@/lib/types";

const JURISDICTION_CODES: JurisdictionCode[] = ["US", "EU", "UK", "CA", "AU"];
const DEFAULT_STATUS: RegulatoryStatus = "RESEARCH_ONLY";

const EVIDENCE_RANK: Record<EvidenceGrade, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  I: 4
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function ensureEvidenceGrade(value: unknown): EvidenceGrade {
  if (value === "A" || value === "B" || value === "C" || value === "D" || value === "I") {
    return value;
  }
  return "I";
}

function ensureStatus(value: unknown): RegulatoryStatus {
  if (
    value === "US_FDA_APPROVED" ||
    value === "NON_US_APPROVED" ||
    value === "INVESTIGATIONAL" ||
    value === "RESEARCH_ONLY"
  ) {
    return value;
  }
  return DEFAULT_STATUS;
}

function emptyStatusMap(): Record<JurisdictionCode, RegulatoryStatus> {
  return {
    US: DEFAULT_STATUS,
    EU: DEFAULT_STATUS,
    UK: DEFAULT_STATUS,
    CA: DEFAULT_STATUS,
    AU: DEFAULT_STATUS
  };
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }
  return asRecord(value);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function collectStatusMap(statusRows: unknown[]): Record<JurisdictionCode, RegulatoryStatus> {
  const statusByJurisdiction = emptyStatusMap();

  for (const row of statusRows) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }

    const status = ensureStatus(record.status);
    const jurisdiction = firstRelation(record.jurisdictions);
    const code = asString(jurisdiction?.code) as JurisdictionCode | null;

    if (code && JURISDICTION_CODES.includes(code)) {
      statusByJurisdiction[code] = status;
    }
  }

  return statusByJurisdiction;
}

function collectUseCaseData(useCaseRows: unknown[]): { useCases: string[]; bestGrade: EvidenceGrade; consumerSummary: string | null; clinicalSummary: string | null } {
  let bestGrade: EvidenceGrade = "I";
  let consumerSummary: string | null = null;
  let clinicalSummary: string | null = null;
  const useCases: string[] = [];

  for (const row of useCaseRows) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }

    const grade = ensureEvidenceGrade(record.evidence_grade);
    if (EVIDENCE_RANK[grade] < EVIDENCE_RANK[bestGrade]) {
      bestGrade = grade;
    }

    if (!consumerSummary) {
      consumerSummary = asString(record.consumer_summary);
    }
    if (!clinicalSummary) {
      clinicalSummary = asString(record.clinical_summary);
    }

    const useCaseRelation = firstRelation(record.use_cases);
    const useCaseName = asString(useCaseRelation?.name);
    if (useCaseName) {
      useCases.push(useCaseName);
    }
  }

  return {
    useCases: uniqueStrings(useCases),
    bestGrade,
    consumerSummary,
    clinicalSummary
  };
}

function collectRoutes(dosingRows: unknown[]): string[] {
  const routes: string[] = [];
  for (const row of dosingRows) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }
    routes.push(asString(record.route) ?? "");
  }
  return uniqueStrings(routes);
}

function mapSummaryFromRow(row: unknown): PeptideSummary | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const slug = asString(record.slug);
  const name = asString(record.canonical_name);
  if (!slug || !name) {
    return null;
  }

  const aliases = uniqueStrings(
    asArray(record.peptide_aliases).map((entry) => {
      const aliasRecord = asRecord(entry);
      return asString(aliasRecord?.alias);
    })
  );

  const useCaseData = collectUseCaseData(asArray(record.peptide_use_cases));
  const routes = collectRoutes(asArray(record.peptide_dosing_entries));
  const statusByJurisdiction = collectStatusMap(asArray(record.peptide_regulatory_status));

  return {
    slug,
    name,
    aliases,
    className: asString(record.peptide_class) ?? "Not specified",
    routes,
    useCases: useCaseData.useCases,
    statusByJurisdiction,
    evidenceGrade: useCaseData.bestGrade
  };
}

function mapDosing(rows: unknown[]): DosingEntry[] {
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) {
        return null;
      }

      const context = asString(record.context);
      if (context !== "APPROVED_LABEL" && context !== "STUDY_REPORTED" && context !== "EXPERT_CONSENSUS") {
        return null;
      }

      return {
        context,
        population: asString(record.population) ?? "Not specified",
        route: asString(record.route) ?? "Not specified",
        startingDose: asString(record.starting_dose) ?? "Not specified",
        maintenanceDose: asString(record.maintenance_dose) ?? "Not specified",
        frequency: asString(record.frequency) ?? "Not specified",
        notes: asString(record.notes) ?? ""
      } satisfies DosingEntry;
    })
    .filter((entry): entry is DosingEntry => entry !== null);
}

const SAFETY_NOT_CURATED = "Not curated yet.";

function normalizeSafetyField(value: string | null): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith("auto-generated placeholder:")) {
    return "";
  }
  return trimmed;
}

function mapSafetyProfile(rows: unknown[]): SafetyProfile {
  const candidates = rows
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => {
      const adverseEffects = normalizeSafetyField(asString(row.adverse_effects));
      const contraindications = normalizeSafetyField(asString(row.contraindications));
      const interactions = normalizeSafetyField(asString(row.interactions));
      const monitoring = normalizeSafetyField(asString(row.monitoring));
      const score = [adverseEffects, contraindications, interactions, monitoring].filter((field) => field.length > 0)
        .length;

      return {
        adverseEffects,
        contraindications,
        interactions,
        monitoring,
        score
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best || best.score === 0) {
    return {
      adverseEffects: SAFETY_NOT_CURATED,
      contraindications: SAFETY_NOT_CURATED,
      interactions: SAFETY_NOT_CURATED,
      monitoring: SAFETY_NOT_CURATED
    };
  }

  return {
    adverseEffects: best.adverseEffects || SAFETY_NOT_CURATED,
    contraindications: best.contraindications || SAFETY_NOT_CURATED,
    interactions: best.interactions || SAFETY_NOT_CURATED,
    monitoring: best.monitoring || SAFETY_NOT_CURATED
  };
}

type VendorRatingMap = Map<number, { rating: number | null; confidence: number | null; reasonTags: string[] }>;

function mapEvidenceClaims(rows: unknown[]): EvidenceClaim[] {
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) {
        return null;
      }
      const citation = Array.isArray(record.citations) ? asRecord(record.citations[0]) : asRecord(record.citations);
      const section = asString(record.section);
      const claimText = asString(record.claim_text);
      const sourceUrl = asString(citation?.source_url);
      const publishedAt = asString(citation?.published_at);
      if (!section || !claimText || !sourceUrl || !publishedAt) {
        return null;
      }

      return {
        section,
        claimText,
        evidenceGrade: asString(record.evidence_grade) ? ensureEvidenceGrade(record.evidence_grade) : null,
        sourceUrl,
        sourceTitle: asString(citation?.source_title),
        publishedAt,
        retrievedAt: asString(citation?.retrieved_at)
      } satisfies EvidenceClaim;
    })
    .filter((claim): claim is EvidenceClaim => claim !== null);
}

async function getRatingMap(vendorIds: number[]): Promise<VendorRatingMap> {
  const map: VendorRatingMap = new Map();
  if (vendorIds.length === 0) {
    return map;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from("vendor_rating_snapshots")
    .select("vendor_id,rating,confidence,reason_tags")
    .in("vendor_id", vendorIds)
    .eq("is_current", true);

  if (error || !data) {
    return map;
  }

  for (const row of data as unknown[]) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }

    const vendorId = asNumber(record.vendor_id);
    if (vendorId === null) {
      continue;
    }

    const reasonTags = asArray(record.reason_tags)
      .map((tag) => asString(tag))
      .filter((tag): tag is string => Boolean(tag));

    map.set(vendorId, {
      rating: asNumber(record.rating),
      confidence: asNumber(record.confidence),
      reasonTags
    });
  }

  return map;
}

export async function listPeptides(): Promise<PeptideSummary[]> {
  const fallback = getAllPeptides();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("peptides")
    .select(
      "id,slug,canonical_name,peptide_class,peptide_aliases(alias),peptide_use_cases(evidence_grade,consumer_summary,clinical_summary,use_cases(name)),peptide_dosing_entries(route),peptide_regulatory_status(status,jurisdictions(code))"
    )
    .eq("is_published", true)
    .order("canonical_name", { ascending: true });

  if (error || !data || data.length === 0) {
    return fallback;
  }

  const mapped = (data as unknown[])
    .map((row) => mapSummaryFromRow(row))
    .filter((row): row is PeptideSummary => row !== null);

  return mapped.length > 0 ? mapped : fallback;
}

export async function getPeptideDetail(slug: string): Promise<PeptideDetail | null> {
  const fallback = getPeptideBySlug(slug) ?? null;
  const supabase = getSupabaseClient();
  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("peptides")
    .select(
      "id,slug,canonical_name,sequence,peptide_class,peptide_aliases(alias),peptide_profiles(intro,mechanism,effectiveness_summary,long_description),peptide_use_cases(evidence_grade,consumer_summary,clinical_summary,use_cases(name)),peptide_dosing_entries(context,population,route,starting_dose,maintenance_dose,frequency,notes),peptide_safety_entries(adverse_effects,contraindications,interactions,monitoring),peptide_regulatory_status(status,jurisdictions(code))"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const row = asRecord(data);
  if (!row) {
    return fallback;
  }

  const summary = mapSummaryFromRow(row);
  if (!summary) {
    return fallback;
  }

  const peptideId = asNumber(row.id);
  if (peptideId === null) {
    return fallback;
  }

  const profile = firstRelation(row.peptide_profiles);
  const useCaseData = collectUseCaseData(asArray(row.peptide_use_cases));
  const dosing = mapDosing(asArray(row.peptide_dosing_entries));
  const safety = mapSafetyProfile(asArray(row.peptide_safety_entries));
  const { data: claimRows } = await supabase
    .from("peptide_claims")
    .select("section,claim_text,evidence_grade,citations(source_url,source_title,published_at,retrieved_at)")
    .eq("peptide_id", peptideId)
    .order("id", { ascending: false });
  const evidenceClaims = mapEvidenceClaims(asArray(claimRows));

  const { data: listingRows } = await supabase
    .from("vendor_peptide_listings")
    .select("is_affiliate,vendors(id,slug,name,is_published)")
    .eq("peptide_id", peptideId);

  const vendorIdList = uniqueStrings(
    asArray(listingRows).map((rowItem) => {
      const listing = asRecord(rowItem);
      const vendor = firstRelation(listing?.vendors);
      const vendorId = asNumber(vendor?.id);
      return vendorId === null ? null : String(vendorId);
    })
  ).map((id) => Number(id));

  const ratings = await getRatingMap(vendorIdList);

  const vendors: VendorCard[] = asArray(listingRows)
    .map((rowItem) => {
      const listing = asRecord(rowItem);
      if (!listing) {
        return null;
      }
      const vendor = firstRelation(listing.vendors);
      if (!vendor) {
        return null;
      }

      const vendorId = asNumber(vendor.id);
      const vendorName = asString(vendor.name);
      const vendorSlug = asString(vendor.slug);
      const isPublished = Boolean(vendor.is_published);

      if (vendorId === null || !vendorName || !vendorSlug || !isPublished) {
        return null;
      }

      const rating = ratings.get(vendorId);
      return {
        slug: vendorSlug,
        name: vendorName,
        rating: rating?.rating ?? null,
        confidence: rating?.confidence ?? null,
        reasonTags: rating?.reasonTags ?? ["insufficient_data"],
        isAffiliate: Boolean(listing.is_affiliate)
      } satisfies VendorCard;
    })
    .filter((vendor): vendor is VendorCard => vendor !== null);

  const intro =
    asString(profile?.intro) ??
    useCaseData.consumerSummary ??
    "This peptide entry is available, but a consumer summary has not been finalized yet.";

  const mechanism =
    asString(profile?.mechanism) ??
    useCaseData.clinicalSummary ??
    "Clinical mechanism summary has not been finalized yet.";

  const effectivenessSummary =
    asString(profile?.effectiveness_summary) ??
    `Current overall evidence grade: ${summary.evidenceGrade}.`;

  const longDescription =
    asString(profile?.long_description) ??
    "Long-form monograph content is in progress for this peptide.";

  const commonConcerns =
    safety.adverseEffects && safety.adverseEffects !== SAFETY_NOT_CURATED ? safety.adverseEffects : "Not specified";

  return {
    ...summary,
    intro,
    mechanism,
    effectivenessSummary,
    safety,
    longDescription,
    dosing,
    vendors,
    evidenceClaims,
    featureTable: {
      "Peptide class": summary.className,
      "Typical route": summary.routes.join(", ") || "Not specified",
      "Evidence strength": `Grade ${summary.evidenceGrade}`,
      "Common concerns": commonConcerns
    }
  };
}

export async function listVendors(): Promise<VendorCard[]> {
  const fallback = getAllVendors();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return fallback;
  }

  const [{ data: vendorsData, error: vendorsError }, { data: listingData }, ratings] = await Promise.all([
    supabase.from("vendors").select("id,slug,name").eq("is_published", true).order("name", { ascending: true }),
    supabase.from("vendor_peptide_listings").select("vendor_id,is_affiliate"),
    supabase.from("vendor_rating_snapshots").select("vendor_id,rating,confidence,reason_tags").eq("is_current", true)
  ]);

  if (vendorsError || !vendorsData || vendorsData.length === 0) {
    return fallback;
  }

  const affiliateMap = new Map<number, boolean>();
  for (const row of asArray(listingData)) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }
    const vendorId = asNumber(record.vendor_id);
    if (vendorId === null) {
      continue;
    }
    const existing = affiliateMap.get(vendorId) ?? false;
    affiliateMap.set(vendorId, existing || Boolean(record.is_affiliate));
  }

  const ratingMap: VendorRatingMap = new Map();
  for (const row of asArray(ratings.data)) {
    const record = asRecord(row);
    if (!record) {
      continue;
    }
    const vendorId = asNumber(record.vendor_id);
    if (vendorId === null) {
      continue;
    }
    ratingMap.set(vendorId, {
      rating: asNumber(record.rating),
      confidence: asNumber(record.confidence),
      reasonTags: asArray(record.reason_tags)
        .map((tag) => asString(tag))
        .filter((tag): tag is string => Boolean(tag))
    });
  }

  const mapped = asArray(vendorsData)
    .map((row) => {
      const vendor = asRecord(row);
      if (!vendor) {
        return null;
      }
      const vendorId = asNumber(vendor.id);
      const slug = asString(vendor.slug);
      const name = asString(vendor.name);
      if (vendorId === null || !slug || !name) {
        return null;
      }

      const score = ratingMap.get(vendorId);
      return {
        slug,
        name,
        rating: score?.rating ?? null,
        confidence: score?.confidence ?? null,
        reasonTags: score?.reasonTags ?? ["insufficient_data"],
        isAffiliate: affiliateMap.get(vendorId) ?? false
      } satisfies VendorCard;
    })
    .filter((vendor): vendor is VendorCard => vendor !== null);

  return mapped.length > 0 ? mapped : fallback;
}

export async function getVendorDetail(slug: string): Promise<VendorDetail | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: vendorRow, error: vendorError } = await supabase
    .from("vendors")
    .select("id,slug,name,website_url,is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (vendorError || !vendorRow) {
    return null;
  }

  const vendorId = Number(vendorRow.id ?? 0);
  if (!vendorId) {
    return null;
  }

  const [{ data: profileRow }, { data: listingRows }, { data: ratingRows }, { data: verificationRows }] = await Promise.all([
    supabase
      .from("vendor_profiles")
      .select("description,features,trust_signals,source_urls,regions")
      .eq("vendor_id", vendorId)
      .maybeSingle(),
    supabase
      .from("vendor_peptide_listings")
      .select("peptide_id,peptides(slug,canonical_name,peptide_class,is_published)")
      .eq("vendor_id", vendorId),
    supabase
      .from("vendor_rating_snapshots")
      .select("rating,confidence,reason_tags")
      .eq("vendor_id", vendorId)
      .eq("is_current", true)
      .limit(1),
    supabase.from("vendor_verifications").select("verification_type,value").eq("vendor_id", vendorId)
  ]);

  const profile = asRecord(profileRow);
  const seedMetadata = getVendorSeedMetadata(slug);
  const rating = asRecord(asArray(ratingRows)[0]);

  const ratingTags = asArray(rating?.reason_tags)
    .map((tag) => asString(tag))
    .filter((tag): tag is string => Boolean(tag));

  const trustSignals = uniqueStrings([
    ...asArray(profile?.trust_signals).map((signal) => asString(signal)).filter((signal): signal is string => Boolean(signal)),
    ...(seedMetadata?.trustSignals ?? []),
    ...ratingTags,
    ...asArray(verificationRows)
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => row !== null)
      .map((row) => asString(row.verification_type))
      .filter((signal): signal is string => Boolean(signal))
  ]);

  const availablePeptides: VendorPeptideListing[] = asArray(listingRows)
    .map((row) => {
      const listing = asRecord(row);
      const peptide = firstRelation(listing?.peptides);
      const peptideSlug = asString(peptide?.slug);
      const peptideName = asString(peptide?.canonical_name);
      const peptideClass = asString(peptide?.peptide_class) ?? "Not specified";
      const peptidePublished = peptide?.is_published === true;
      if (!peptideSlug || !peptideName || !peptidePublished) {
        return null;
      }
      return {
        slug: peptideSlug,
        name: peptideName,
        className: peptideClass
      } satisfies VendorPeptideListing;
    })
    .filter((item): item is VendorPeptideListing => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    slug: asString(vendorRow.slug) ?? slug,
    name: asString(vendorRow.name) ?? "Unknown vendor",
    websiteUrl: asString(vendorRow.website_url) ?? "",
    description:
      asString(profile?.description) ??
      seedMetadata?.description ??
      "Vendor profile text has not been curated yet for this listing.",
    features: uniqueStrings([
      ...asArray(profile?.features)
      .map((feature) => asString(feature))
      .filter((feature): feature is string => Boolean(feature)),
      ...(seedMetadata?.features ?? [])
    ]),
    trustSignals,
    availablePeptides,
    rating: asNumber(rating?.rating),
    confidence: asNumber(rating?.confidence),
    reasonTags: ratingTags.length > 0 ? ratingTags : trustSignals,
    isAffiliate: false
  };
}
