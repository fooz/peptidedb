import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceGrade } from "@/lib/types";

type LiveClaimCandidate = {
  section: "Live Research (PubMed)" | "Live Research (ClinicalTrials)";
  claimText: string;
  evidenceGrade: EvidenceGrade;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
};

type RefreshRow = {
  id: number;
  canonicalName: string;
};

type RefreshResult = {
  peptidesScanned: number;
  claimsUpserted: number;
  peptidesWithNoHits: number;
  failures: number;
};

const PUBMED_SECTION: LiveClaimCandidate["section"] = "Live Research (PubMed)";
const CLINICAL_TRIALS_SECTION: LiveClaimCandidate["section"] = "Live Research (ClinicalTrials)";
const LIVE_SECTIONS: LiveClaimCandidate["section"][] = [PUBMED_SECTION, CLINICAL_TRIALS_SECTION];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function truncateText(value: string, max = 220): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}...`;
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

function inferPubmedGrade(title: string): EvidenceGrade {
  const lower = title.toLowerCase();
  if (
    lower.includes("meta-analysis") ||
    lower.includes("systematic review") ||
    lower.includes("randomized") ||
    lower.includes("randomised") ||
    lower.includes("phase 3")
  ) {
    return "B";
  }
  return "C";
}

function inferTrialsGrade(studyType: string, overallStatus: string): EvidenceGrade {
  const normalizedType = studyType.toUpperCase();
  const normalizedStatus = overallStatus.toUpperCase();
  if (normalizedType.includes("INTERVENTIONAL") && normalizedStatus.includes("COMPLETED")) {
    return "B";
  }
  return "C";
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getRecentPubmedClaims(peptideName: string, maxItems: number): Promise<LiveClaimCandidate[]> {
  const apiKey = process.env.NCBI_API_KEY?.trim() || "";
  const searchParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    retmax: String(maxItems),
    sort: "pub+date",
    term: `${peptideName}[Title/Abstract] AND (trial OR randomized OR meta-analysis OR review)`
  });
  if (apiKey) {
    searchParams.set("api_key", apiKey);
  }

  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams.toString()}`;
  const searchData = asRecord(await fetchJson(searchUrl));
  const searchResult = asRecord(searchData?.esearchresult);
  const ids = Array.isArray(searchResult?.idlist)
    ? searchResult?.idlist.map((value) => asString(value)).filter((value) => value.length > 0)
    : [];

  if (ids.length === 0) {
    return [];
  }

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json"
  });
  if (apiKey) {
    summaryParams.set("api_key", apiKey);
  }

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams.toString()}`;
  const summaryData = asRecord(await fetchJson(summaryUrl));
  const summaryResult = asRecord(summaryData?.result);

  const claims: LiveClaimCandidate[] = [];
  for (const id of ids) {
    const entry = asRecord(summaryResult?.[id]);
    if (!entry) {
      continue;
    }
    const title = truncateText(asString(entry.title));
    if (!title) {
      continue;
    }
    const pubDate = toIsoDate(asString(entry.pubdate));
    claims.push({
      section: PUBMED_SECTION,
      claimText: `Live refresh: Recent PubMed publication (PMID ${id}) reports "${title}".`,
      evidenceGrade: inferPubmedGrade(title),
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`,
      sourceTitle: `PubMed PMID ${id}`,
      publishedAt: pubDate
    });
  }

  return claims;
}

async function getRecentClinicalTrialsClaims(peptideName: string, maxItems: number): Promise<LiveClaimCandidate[]> {
  const params = new URLSearchParams({
    "query.term": peptideName,
    pageSize: String(maxItems),
    format: "json"
  });

  const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
  const data = asRecord(await fetchJson(url));
  const studies = Array.isArray(data?.studies) ? data.studies : [];

  const claims: LiveClaimCandidate[] = [];
  for (const study of studies) {
    const studyRecord = asRecord(study);
    const protocolSection = asRecord(studyRecord?.protocolSection);
    const identification = asRecord(protocolSection?.identificationModule);
    const statusModule = asRecord(protocolSection?.statusModule);
    const designModule = asRecord(protocolSection?.designModule);

    const nctId = asString(identification?.nctId);
    const briefTitle = truncateText(asString(identification?.briefTitle));
    const overallStatus = asString(statusModule?.overallStatus);
    const updateStruct =
      asRecord(statusModule?.lastUpdatePostDateStruct) ?? asRecord(statusModule?.lastUpdateSubmitDateStruct);
    const updatedDate = toIsoDate(asString(updateStruct?.date));
    const studyType = asString(designModule?.studyType);

    if (!nctId || !briefTitle) {
      continue;
    }

    const statusText = overallStatus || "Status not reported";
    claims.push({
      section: CLINICAL_TRIALS_SECTION,
      claimText: `Live refresh: ClinicalTrials.gov study ${nctId} ("${briefTitle}") is listed as ${statusText}.`,
      evidenceGrade: inferTrialsGrade(studyType, statusText),
      sourceUrl: `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}`,
      sourceTitle: `ClinicalTrials.gov ${nctId}`,
      publishedAt: updatedDate
    });
  }

  return claims;
}

async function findOrCreateCitationId(supabase: SupabaseClient, claim: LiveClaimCandidate): Promise<number> {
  const { data: existingRows, error: existingError } = await supabase
    .from("citations")
    .select("id,source_title")
    .eq("source_url", claim.sourceUrl)
    .eq("published_at", claim.publishedAt)
    .order("id", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  const existingId = Number(existing?.id ?? 0);
  if (existingId) {
    const existingTitle = asString(existing?.source_title);
    if (!existingTitle && claim.sourceTitle) {
      await supabase.from("citations").update({ source_title: claim.sourceTitle }).eq("id", existingId);
    }
    return existingId;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("citations")
    .insert({
      source_url: claim.sourceUrl,
      source_title: claim.sourceTitle,
      published_at: claim.publishedAt
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed to insert citation.");
  }
  return Number(inserted.id);
}

async function upsertLiveClaimsForPeptide(
  supabase: SupabaseClient,
  peptideId: number,
  claims: LiveClaimCandidate[]
): Promise<number> {
  if (claims.length === 0) {
    return 0;
  }

  const { error: clearError } = await supabase
    .from("peptide_claims")
    .delete()
    .eq("peptide_id", peptideId)
    .in("section", LIVE_SECTIONS)
    .like("claim_text", "Live refresh:%");

  if (clearError) {
    throw new Error(clearError.message);
  }

  let insertedCount = 0;
  for (const claim of claims) {
    const citationId = await findOrCreateCitationId(supabase, claim);
    const { error: insertError } = await supabase.from("peptide_claims").insert({
      peptide_id: peptideId,
      section: claim.section,
      claim_text: claim.claimText,
      evidence_grade: claim.evidenceGrade,
      citation_id: citationId
    });
    if (insertError) {
      throw new Error(insertError.message);
    }
    insertedCount += 1;
  }

  return insertedCount;
}

async function loadPeptidesForRefresh(supabase: SupabaseClient, batchSize: number): Promise<RefreshRow[]> {
  const { data, error } = await supabase
    .from("peptides")
    .select("id,canonical_name,last_live_refresh_at")
    .eq("is_published", true)
    .order("last_live_refresh_at", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true })
    .limit(batchSize);

  if (error) {
    if (error.message.includes("last_live_refresh_at")) {
      throw new Error("Missing peptides.last_live_refresh_at. Re-run db/bootstrap.sql and try again.");
    }
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => ({
      id: Number(row.id ?? 0),
      canonicalName: asString(row.canonical_name)
    }))
    .filter((row) => row.id > 0 && row.canonicalName.length > 0);
}

export async function refreshLiveEvidenceClaims(
  supabase: SupabaseClient,
  options?: { batchSize?: number; sourcesPerPeptide?: number }
): Promise<RefreshResult> {
  const batchSize = Math.max(1, Math.min(50, Number(options?.batchSize ?? 12)));
  const sourcesPerPeptide = Math.max(1, Math.min(3, Number(options?.sourcesPerPeptide ?? 2)));
  const rows = await loadPeptidesForRefresh(supabase, batchSize);

  let peptidesScanned = 0;
  let claimsUpserted = 0;
  let peptidesWithNoHits = 0;
  let failures = 0;

  for (const row of rows) {
    peptidesScanned += 1;
    try {
      const [pubmedClaims, trialClaims] = await Promise.all([
        getRecentPubmedClaims(row.canonicalName, sourcesPerPeptide),
        getRecentClinicalTrialsClaims(row.canonicalName, sourcesPerPeptide)
      ]);

      const claims = [...pubmedClaims, ...trialClaims];
      if (claims.length === 0) {
        peptidesWithNoHits += 1;
      } else {
        claimsUpserted += await upsertLiveClaimsForPeptide(supabase, row.id, claims);
      }

      await supabase.from("peptides").update({ last_live_refresh_at: new Date().toISOString() }).eq("id", row.id);
    } catch {
      failures += 1;
    }
  }

  return {
    peptidesScanned,
    claimsUpserted,
    peptidesWithNoHits,
    failures
  };
}
