import type { SupabaseClient } from "@supabase/supabase-js";

type TrialPeptideCandidate = {
  slug: string;
  name: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  trialMentions: number;
};

type CatalogIngestResult = {
  scannedStudies: number;
  candidatesFound: number;
  inserted: number;
  skippedExisting: number;
  target: number;
};

const JURISDICTION_CODES = ["US", "EU", "UK", "CA", "AU"] as const;
const MAX_TITLE_LENGTH = 170;

const ALLOWED_INTERVENTION_TYPES = new Set([
  "DRUG",
  "BIOLOGICAL",
  "DIETARY_SUPPLEMENT",
  "COMBINATION_PRODUCT",
  "OTHER"
]);

const EXCLUDE_TERMS = [
  "placebo",
  "saline",
  "exercise",
  "diet",
  "lifestyle",
  "usual care",
  "standard care",
  "surgery",
  "device",
  "sham",
  "observation",
  "counseling",
  "education"
];

const PEPTIDE_HINTS = [
  "peptide",
  "semaglutide",
  "tirzepatide",
  "liraglutide",
  "dulaglutide",
  "exenatide",
  "lixisenatide",
  "cagrilintide",
  "retatrutide",
  "insulin",
  "amylin",
  "calcitonin",
  "desmopressin",
  "oxytocin",
  "vasopressin",
  "terlipressin",
  "gonadorelin",
  "triptorelin",
  "leuprolide",
  "histrelin",
  "thymosin",
  "thymalin",
  "bpc-157",
  "tb-500",
  "ghrp",
  "cjc-1295",
  "ipamorelin",
  "hexarelin",
  "sermorelin",
  "tesamorelin",
  "kisspeptin",
  "selank",
  "semax",
  "mots-c",
  "aod-9604"
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? `${year}-01-01` : new Date().toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trimTitle(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_TITLE_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_TITLE_LENGTH - 1)}...`;
}

function splitInterventionName(name: string): string[] {
  return name
    .split(/\s+(?:and|plus)\s+|[+,;/]/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function normalizeCandidateName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(\.\d+)?\s?(mg|mcg|ug|g|iu|ml)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasPeptideShape(name: string): boolean {
  const lower = name.toLowerCase();
  if (PEPTIDE_HINTS.some((hint) => lower.includes(hint))) {
    return true;
  }
  if (/^[a-z]{1,5}-\d{2,6}[a-z0-9-]*$/i.test(name)) {
    return true;
  }
  if (lower.endsWith("tide") || lower.endsWith("relin") || lower.endsWith("pressin") || lower.endsWith("tocin")) {
    return true;
  }
  return false;
}

function shouldRejectName(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.length < 4 || lower.length > 80) {
    return true;
  }
  if (EXCLUDE_TERMS.some((term) => lower.includes(term))) {
    return true;
  }
  if (/^\d+$/.test(lower)) {
    return true;
  }
  return false;
}

function buildGeneratedProfile(name: string) {
  return {
    intro: `${name} is a peptide entry auto-collected from active or archived clinical-trial intervention records and is treated as evidence-tracking content until editorial review is complete.`,
    mechanism:
      `${name} currently requires mechanism-level curation by editors. The listing indicates trial relevance, but molecular pathway claims should be considered provisional until source-verified summaries are added.`,
    effectiveness:
      `Effectiveness for ${name} is not assumed from listing volume alone. This record is intended to organize trial-linked evidence and prevent unsupported consumer-level certainty.`,
    longDescription:
      `${name} was imported from ClinicalTrials.gov intervention data to rapidly expand peptide coverage and support evidence-first navigation. This profile is intentionally conservative: it marks the entry as investigational by default across jurisdictions until manual review confirms approval pathways or higher-certainty outcomes. The purpose is to help users and clinicians find what is being studied, while clearly separating study presence from proven effectiveness. Dosing and safety details are stored as research-context placeholders and should be replaced with source-specific updates during editorial curation.`
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function collectClinicalTrialsCandidates(
  target: number,
  maxPages: number
): Promise<{ candidates: TrialPeptideCandidate[]; scannedStudies: number }> {
  const candidateBySlug = new Map<string, TrialPeptideCandidate>();
  let pageToken = "";
  let scannedStudies = 0;

  for (let page = 0; page < maxPages && candidateBySlug.size < target; page += 1) {
    const params = new URLSearchParams({
      "query.term": "peptide",
      pageSize: "100",
      format: "json"
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
    const payload = asRecord(await fetchJson(url));
    const studies = Array.isArray(payload?.studies) ? payload.studies : [];
    pageToken = asString(payload?.nextPageToken);

    for (const study of studies) {
      const studyRecord = asRecord(study);
      const protocol = asRecord(studyRecord?.protocolSection);
      const identification = asRecord(protocol?.identificationModule);
      const arms = asRecord(protocol?.armsInterventionsModule);
      const statusModule = asRecord(protocol?.statusModule);

      const nctId = asString(identification?.nctId);
      const briefTitle = trimTitle(asString(identification?.briefTitle));
      const dateStruct =
        asRecord(statusModule?.lastUpdatePostDateStruct) ?? asRecord(statusModule?.lastUpdateSubmitDateStruct);
      const updatedDate = toIsoDate(asString(dateStruct?.date));
      const interventions = Array.isArray(arms?.interventions) ? arms.interventions : [];

      scannedStudies += 1;
      for (const intervention of interventions) {
        const interventionRecord = asRecord(intervention);
        const interventionType = asString(interventionRecord?.type).toUpperCase();
        const rawName = asString(interventionRecord?.name);

        if (!ALLOWED_INTERVENTION_TYPES.has(interventionType) || !rawName) {
          continue;
        }

        const parts = splitInterventionName(rawName);
        for (const part of parts) {
          const normalized = normalizeCandidateName(part);
          if (!normalized || shouldRejectName(normalized) || !hasPeptideShape(normalized)) {
            continue;
          }

          const slug = slugify(normalized);
          if (!slug) {
            continue;
          }

          const sourceUrl = nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : "https://clinicaltrials.gov/";
          const sourceTitle = nctId && briefTitle ? `ClinicalTrials.gov ${nctId}: ${briefTitle}` : "ClinicalTrials.gov study record";
          const existing = candidateBySlug.get(slug);
          if (existing) {
            existing.trialMentions += 1;
            continue;
          }

          candidateBySlug.set(slug, {
            slug,
            name: normalized,
            sourceUrl,
            sourceTitle,
            publishedAt: updatedDate,
            trialMentions: 1
          });

          if (candidateBySlug.size >= target) {
            break;
          }
        }

        if (candidateBySlug.size >= target) {
          break;
        }
      }

      if (candidateBySlug.size >= target) {
        break;
      }
    }

    if (!pageToken) {
      break;
    }
  }

  return {
    candidates: Array.from(candidateBySlug.values()),
    scannedStudies
  };
}

async function fetchJurisdictionIdMap(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("jurisdictions").select("id,code").in("code", [...JURISDICTION_CODES]);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load jurisdictions.");
  }

  const map = new Map<string, number>();
  for (const row of data) {
    map.set(asString(row.code), Number(row.id));
  }
  return map;
}

export async function ingestClinicalTrialsCatalog(
  supabase: SupabaseClient,
  options?: { target?: number; maxPages?: number }
): Promise<CatalogIngestResult> {
  const target = Math.max(100, Math.min(600, Number(options?.target ?? 320)));
  const maxPages = Math.max(2, Math.min(12, Number(options?.maxPages ?? 8)));
  const { candidates, scannedStudies } = await collectClinicalTrialsCandidates(target, maxPages);

  if (candidates.length === 0) {
    return { scannedStudies, candidatesFound: 0, inserted: 0, skippedExisting: 0, target };
  }

  const slugs = candidates.map((candidate) => candidate.slug);
  const { data: existingRows, error: existingError } = await supabase.from("peptides").select("slug").in("slug", slugs);
  if (existingError) {
    throw new Error(existingError.message);
  }
  const existingSlugSet = new Set((existingRows ?? []).map((row) => asString(row.slug)).filter(Boolean));

  const peptidePayload = candidates.map((candidate) => ({
    slug: candidate.slug,
    canonical_name: candidate.name,
    peptide_class: "Clinical-trial peptide candidate",
    is_published: true
  }));
  const { error: peptideUpsertError } = await supabase.from("peptides").upsert(peptidePayload, { onConflict: "slug" });
  if (peptideUpsertError) {
    throw new Error(peptideUpsertError.message);
  }

  const { data: peptideRows, error: peptideRowsError } = await supabase.from("peptides").select("id,slug").in("slug", slugs);
  if (peptideRowsError || !peptideRows) {
    throw new Error(peptideRowsError?.message ?? "Failed to read catalog peptide ids.");
  }

  const peptideIdBySlug = new Map<string, number>();
  for (const row of peptideRows) {
    const slug = asString(row.slug);
    const id = Number(row.id ?? 0);
    if (slug && id > 0) {
      peptideIdBySlug.set(slug, id);
    }
  }

  const newCandidates = candidates.filter((candidate) => !existingSlugSet.has(candidate.slug));
  if (newCandidates.length === 0) {
    return {
      scannedStudies,
      candidatesFound: candidates.length,
      inserted: 0,
      skippedExisting: candidates.length,
      target
    };
  }

  const profilePayload = newCandidates
    .map((candidate) => {
      const peptideId = peptideIdBySlug.get(candidate.slug);
      if (!peptideId) {
        return null;
      }
      const generated = buildGeneratedProfile(candidate.name);
      return {
        peptide_id: peptideId,
        intro: generated.intro,
        mechanism: generated.mechanism,
        effectiveness_summary: generated.effectiveness,
        long_description: generated.longDescription
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (profilePayload.length > 0) {
    const { error: profileError } = await supabase.from("peptide_profiles").upsert(profilePayload, { onConflict: "peptide_id" });
    if (profileError) {
      throw new Error(profileError.message);
    }
  }

  const jurisdictionMap = await fetchJurisdictionIdMap(supabase);
  const usJurisdictionId = jurisdictionMap.get("US");
  if (!usJurisdictionId) {
    throw new Error("Missing US jurisdiction.");
  }

  const statusPayload = newCandidates.flatMap((candidate) => {
    const peptideId = peptideIdBySlug.get(candidate.slug);
    if (!peptideId) {
      return [];
    }

    return [...JURISDICTION_CODES]
      .map((code) => {
        const jurisdictionId = jurisdictionMap.get(code);
        if (!jurisdictionId) {
          return null;
        }
        return {
          peptide_id: peptideId,
          jurisdiction_id: jurisdictionId,
          status: "INVESTIGATIONAL",
          notes: "Auto-ingested from ClinicalTrials peptide catalog."
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  });

  if (statusPayload.length > 0) {
    const { error: statusError } = await supabase
      .from("peptide_regulatory_status")
      .upsert(statusPayload, { onConflict: "peptide_id,jurisdiction_id,status" });
    if (statusError) {
      throw new Error(statusError.message);
    }
  }

  const { data: useCaseRow, error: useCaseError } = await supabase
    .from("use_cases")
    .upsert({ slug: "evidence-tracking", name: "Evidence Tracking" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (useCaseError || !useCaseRow?.id) {
    throw new Error(useCaseError?.message ?? "Failed to upsert evidence-tracking use case.");
  }
  const useCaseId = Number(useCaseRow.id);

  const useCasePayload = newCandidates
    .map((candidate) => {
      const peptideId = peptideIdBySlug.get(candidate.slug);
      if (!peptideId) {
        return null;
      }
      return {
        peptide_id: peptideId,
        use_case_id: useCaseId,
        jurisdiction_id: usJurisdictionId,
        evidence_grade: "I",
        consumer_summary:
          "Auto-imported from clinical trial intervention records. Editorial review required before treatment-level interpretation.",
        clinical_summary:
          "Investigational evidence-tracking entry. Presence in trials should not be interpreted as established efficacy."
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (useCasePayload.length > 0) {
    const { error: useCaseInsertError } = await supabase
      .from("peptide_use_cases")
      .upsert(useCasePayload, { onConflict: "peptide_id,use_case_id,jurisdiction_id" });
    if (useCaseInsertError) {
      throw new Error(useCaseInsertError.message);
    }
  }

  const dosingPayload = newCandidates
    .map((candidate) => {
      const peptideId = peptideIdBySlug.get(candidate.slug);
      if (!peptideId) {
        return null;
      }
      return {
        peptide_id: peptideId,
        jurisdiction_id: usJurisdictionId,
        context: "STUDY_REPORTED",
        population: "Clinical trial participants",
        route: "Protocol dependent",
        starting_dose: "Protocol specific",
        maintenance_dose: "Protocol specific",
        frequency: "Protocol specific",
        notes: "Auto-generated placeholder. Replace with study-specific dosing during editorial review."
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (dosingPayload.length > 0) {
    const { error: dosingError } = await supabase.from("peptide_dosing_entries").insert(dosingPayload);
    if (dosingError) {
      throw new Error(dosingError.message);
    }
  }

  const safetyPayload = newCandidates
    .map((candidate) => {
      const peptideId = peptideIdBySlug.get(candidate.slug);
      if (!peptideId) {
        return null;
      }
      return {
        peptide_id: peptideId,
        jurisdiction_id: usJurisdictionId,
        adverse_effects: "Auto-generated placeholder: review trial safety outcomes before making practical conclusions.",
        contraindications: "Auto-generated placeholder: contraindication profile requires source-level review.",
        interactions: "Auto-generated placeholder: interaction profile not curated yet.",
        monitoring: "Auto-generated placeholder: monitoring should follow protocol-specific and clinician-directed standards."
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (safetyPayload.length > 0) {
    const { error: safetyError } = await supabase
      .from("peptide_safety_entries")
      .upsert(safetyPayload, { onConflict: "peptide_id,jurisdiction_id" });
    if (safetyError) {
      throw new Error(safetyError.message);
    }
  }

  const citationsPayload = newCandidates
    .map((candidate) => ({
      source_url: candidate.sourceUrl,
      source_title: candidate.sourceTitle,
      published_at: candidate.publishedAt
    }))
    .filter((citation) => citation.source_url.length > 0);

  const citationIdByUrl = new Map<string, number>();
  if (citationsPayload.length > 0) {
    const { error: citationInsertError } = await supabase.from("citations").insert(citationsPayload);
    if (citationInsertError && !citationInsertError.message.toLowerCase().includes("duplicate")) {
      throw new Error(citationInsertError.message);
    }

    const urls = Array.from(new Set(citationsPayload.map((citation) => citation.source_url)));
    const { data: citationRows, error: citationRowsError } = await supabase
      .from("citations")
      .select("id,source_url")
      .in("source_url", urls)
      .order("id", { ascending: false });

    if (citationRowsError) {
      throw new Error(citationRowsError.message);
    }

    for (const row of citationRows ?? []) {
      const sourceUrl = asString(row.source_url);
      const id = Number(row.id ?? 0);
      if (sourceUrl && id > 0 && !citationIdByUrl.has(sourceUrl)) {
        citationIdByUrl.set(sourceUrl, id);
      }
    }
  }

  const claimsPayload = newCandidates
    .map((candidate) => {
      const peptideId = peptideIdBySlug.get(candidate.slug);
      const citationId = citationIdByUrl.get(candidate.sourceUrl);
      if (!peptideId || !citationId) {
        return null;
      }
      return {
        peptide_id: peptideId,
        section: "Research",
        claim_text: `Auto-ingested from ClinicalTrials intervention catalog. ${candidate.name} appears in trial records and requires editorial evidence review.`,
        evidence_grade: "I",
        citation_id: citationId
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (claimsPayload.length > 0) {
    const { error: claimsError } = await supabase.from("peptide_claims").insert(claimsPayload);
    if (claimsError) {
      throw new Error(claimsError.message);
    }
  }

  return {
    scannedStudies,
    candidatesFound: candidates.length,
    inserted: newCandidates.length,
    skippedExisting: candidates.length - newCandidates.length,
    target
  };
}
