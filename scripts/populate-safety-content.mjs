#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_PREFIX = "auto-generated placeholder:";
const TODAY = new Date().toISOString().slice(0, 10);

function loadEnvFile(path) {
  if (!fs.existsSync(path)) {
    return {};
  }
  const env = {};
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = value;
  }
  return env;
}

function envValue(name, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

const fileEnv = loadEnvFile(".env.local");
const SUPABASE_URL = envValue("NEXT_PUBLIC_SUPABASE_URL", fileEnv.NEXT_PUBLIC_SUPABASE_URL ?? "");
const SUPABASE_SERVICE_ROLE_KEY = envValue("SUPABASE_SERVICE_ROLE_KEY", fileEnv.SUPABASE_SERVICE_ROLE_KEY ?? "");
const NCBI_API_KEY = envValue("NCBI_API_KEY", fileEnv.NCBI_API_KEY ?? "");
const DRY_RUN = process.argv.includes("--dry-run") || !SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
  auth: { persistSession: false }
});

function asRecord(value) {
  return value !== null && typeof value === "object" ? value : null;
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlaceholder(value) {
  return asString(value).toLowerCase().startsWith(PLACEHOLDER_PREFIX);
}

function parseYear(dateText) {
  const match = asString(dateText).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function parseDate(dateText) {
  const parsed = new Date(asString(dateText));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
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

function normalizeSearchName(peptideName) {
  return asString(peptideName)
    .replace(/[()[\]{}:;,+/\\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function getClinicalTrialsSnapshot(peptideName) {
  const normalized = normalizeSearchName(peptideName);
  const params = new URLSearchParams({
    "query.term": normalized || peptideName,
    pageSize: "100",
    format: "json"
  });
  const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
  const payload = asRecord(await fetchJson(url));
  const studies = Array.isArray(payload?.studies) ? payload.studies : [];

  let completed = 0;
  let recruiting = 0;
  let active = 0;
  let terminated = 0;
  let withResults = 0;
  let latestUpdate = null;

  for (const study of studies) {
    const studyRecord = asRecord(study);
    const protocol = asRecord(studyRecord?.protocolSection);
    const statusModule = asRecord(protocol?.statusModule);
    const status = asString(statusModule?.overallStatus).toUpperCase();

    if (status === "COMPLETED") completed += 1;
    else if (status === "RECRUITING") recruiting += 1;
    else if (status === "ACTIVE_NOT_RECRUITING") active += 1;
    else if (status === "TERMINATED") terminated += 1;

    if (studyRecord?.hasResults === true) {
      withResults += 1;
    }

    const updateText =
      asString(asRecord(statusModule?.lastUpdatePostDateStruct)?.date) ||
      asString(asRecord(statusModule?.lastUpdateSubmitDateStruct)?.date);
    const updateDate = parseDate(updateText);
    if (updateDate && (!latestUpdate || updateDate > latestUpdate)) {
      latestUpdate = updateDate;
    }
  }

  return {
    total: studies.length,
    completed,
    recruiting,
    active,
    terminated,
    withResults,
    latestUpdate: latestUpdate ? latestUpdate.toISOString().slice(0, 10) : ""
  };
}

async function getPubmedSnapshot(peptideName) {
  if (!NCBI_API_KEY) {
    return {
      count: 0,
      newestYear: null
    };
  }

  const normalized = normalizeSearchName(peptideName);
  const safeTerm = normalized
    .split(" ")
    .filter((token) => token.length > 1)
    .slice(0, 6)
    .join(" ");

  if (!safeTerm) {
    return {
      count: 0,
      newestYear: null
    };
  }

  const searchParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    retmax: "8",
    sort: "pub+date",
    term: `"${safeTerm}"[Title/Abstract] AND (safety OR adverse OR tolerability OR toxicity)`
  });
  if (NCBI_API_KEY) {
    searchParams.set("api_key", NCBI_API_KEY);
  }
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams.toString()}`;
  const searchPayload = asRecord(await fetchJson(searchUrl));
  const searchResult = asRecord(searchPayload?.esearchresult);
  const ids = Array.isArray(searchResult?.idlist) ? searchResult.idlist.map((id) => asString(id)).filter(Boolean) : [];
  const count = Number(asString(searchResult?.count) || "0");

  if (ids.length === 0) {
    return {
      count,
      newestYear: null
    };
  }

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    id: ids.join(",")
  });
  if (NCBI_API_KEY) {
    summaryParams.set("api_key", NCBI_API_KEY);
  }
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams.toString()}`;
  const summaryPayload = asRecord(await fetchJson(summaryUrl));
  const result = asRecord(summaryPayload?.result);

  let newestYear = null;
  for (const id of ids) {
    const paper = asRecord(result?.[id]);
    const year = parseYear(paper?.pubdate);
    if (year !== null && (newestYear === null || year > newestYear)) {
      newestYear = year;
    }
  }

  return {
    count,
    newestYear
  };
}

function buildSafetyProfile({ name, className, usStatus, nonUsApproved, trials, pubmed }) {
  const classLower = className.toLowerCase();
  const approvedInUs = usStatus === "US_FDA_APPROVED";
  const approvedOutsideUs = nonUsApproved;
  const incretinLike =
    classLower.includes("glp") || classLower.includes("gip") || classLower.includes("incretin") || classLower.includes("insulin");

  const adverseEffects =
    trials.total > 0
      ? `As of ${TODAY}, ClinicalTrials.gov lists ${trials.total} studies for ${name} (completed ${trials.completed}, recruiting ${trials.recruiting}, active not recruiting ${trials.active}, terminated ${trials.terminated}; posted results ${trials.withResults}). Adverse-effect patterns are protocol-specific and should be interpreted at study level before clinical use.`
      : pubmed.count > 0
        ? `As of ${TODAY}, PubMed returns ${pubmed.count} safety-related records for ${name}. Adverse-effect findings are heterogeneous across populations and dosing strategies, so risk interpretation should be based on full-study context.`
        : `As of ${TODAY}, no robust publicly indexed human safety dataset was identified for ${name}; adverse-effect expectations remain uncertain and should be treated conservatively.`;

  const contraindications = approvedInUs
    ? `Use current US product labeling to screen contraindications for ${name}; contraindication criteria are indication- and formulation-specific and should be reviewed before use.`
    : approvedOutsideUs
      ? `Use jurisdiction-specific monographs for ${name} where approved outside the US; contraindication criteria vary by region and product presentation.`
      : `No broadly standardized contraindication framework is established for investigational ${name}; use protocol exclusion criteria and specialist oversight.`;

  const interactions = incretinLike
    ? `Evaluate interaction risk with concomitant glucose-lowering therapies and medications affected by delayed gastric emptying, and adjust based on product-specific guidance where applicable.`
    : approvedInUs || approvedOutsideUs
      ? `Assess product- and indication-specific interaction guidance from approved labeling/monographs and review concurrent therapies before use.`
      : `Formal interaction data remain limited for investigational ${name}; avoid extrapolating interaction assumptions from unrelated compounds.`;

  const monitoring = approvedInUs || approvedOutsideUs
    ? `Monitor treatment response, tolerability, and indication-relevant laboratory/clinical markers using current guideline and approved product-label recommendations.`
    : `Use protocol-defined monitoring (baseline risk assessment, adverse-event surveillance, and follow-up endpoints) in research contexts; posted trial updates currently extend through ${trials.latestUpdate || TODAY}${pubmed.newestYear ? ` and PubMed safety-indexed publications through ${pubmed.newestYear}` : ""}.`;

  return {
    adverseEffects,
    contraindications,
    interactions,
    monitoring
  };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runOne() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => runOne());
  await Promise.all(workers);
  return results;
}

async function main() {
  const [{ data: peptides, error: peptideError }, { data: jurisdictions, error: jurisdictionError }] = await Promise.all([
    supabase.from("peptides").select("id,slug,canonical_name,peptide_class,is_published").eq("is_published", true).order("canonical_name"),
    supabase.from("jurisdictions").select("id,code")
  ]);

  if (peptideError || !peptides) {
    throw new Error(peptideError?.message ?? "Failed to load peptides.");
  }
  if (jurisdictionError || !jurisdictions) {
    throw new Error(jurisdictionError?.message ?? "Failed to load jurisdictions.");
  }

  const jurisdictionMap = new Map(jurisdictions.map((row) => [asString(row.code), Number(row.id)]));
  const usJurisdictionId = jurisdictionMap.get("US");
  if (!usJurisdictionId) {
    throw new Error("US jurisdiction id is missing.");
  }

  const peptideIds = peptides.map((row) => Number(row.id));
  const [{ data: safetyRows, error: safetyError }, { data: statusRows, error: statusError }] = await Promise.all([
    supabase
      .from("peptide_safety_entries")
      .select("id,peptide_id,jurisdiction_id,adverse_effects,contraindications,interactions,monitoring")
      .in("peptide_id", peptideIds),
    supabase.from("peptide_regulatory_status").select("peptide_id,status,jurisdiction_id").in("peptide_id", peptideIds)
  ]);

  if (safetyError || !safetyRows) {
    throw new Error(safetyError?.message ?? "Failed to load safety rows.");
  }
  if (statusError || !statusRows) {
    throw new Error(statusError?.message ?? "Failed to load regulatory status rows.");
  }

  const safetyByPeptide = new Map();
  for (const row of safetyRows) {
    const key = Number(row.peptide_id);
    const list = safetyByPeptide.get(key) ?? [];
    list.push(row);
    safetyByPeptide.set(key, list);
  }

  const statusByPeptide = new Map();
  for (const row of statusRows) {
    const key = Number(row.peptide_id);
    const list = statusByPeptide.get(key) ?? [];
    list.push(row);
    statusByPeptide.set(key, list);
  }

  const targets = peptides.filter((peptide) => {
    const rows = safetyByPeptide.get(Number(peptide.id)) ?? [];
    let hasCurated = false;
    for (const row of rows) {
      const fields = [row.adverse_effects, row.contraindications, row.interactions, row.monitoring];
      for (const field of fields) {
        const value = asString(field);
        if (!value || isPlaceholder(value)) {
          continue;
        }
        hasCurated = true;
      }
    }
    return !hasCurated;
  });

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN ? "dry-run" : "write",
        totalPublishedPeptides: peptides.length,
        peptidesNeedingSafetyBackfill: targets.length
      },
      null,
      2
    )
  );

  const generated = await runWithConcurrency(targets, 4, async (peptide) => {
    const peptideId = Number(peptide.id);
    const name = asString(peptide.canonical_name);
    const className = asString(peptide.peptide_class) || "Peptide";

    const statuses = statusByPeptide.get(peptideId) ?? [];
    const usStatuses = statuses
      .filter((row) => Number(row.jurisdiction_id) === usJurisdictionId)
      .map((row) => asString(row.status));
    const usStatus = usStatuses[0] || "";
    const nonUsApproved = statuses.some((row) => asString(row.status) === "NON_US_APPROVED");

    let trials = { total: 0, completed: 0, recruiting: 0, active: 0, terminated: 0, withResults: 0, latestUpdate: "" };
    let pubmed = { count: 0, newestYear: null };

    try {
      [trials, pubmed] = await Promise.all([getClinicalTrialsSnapshot(name), getPubmedSnapshot(name)]);
    } catch (error) {
      console.error(`Source fetch failed for ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const profile = buildSafetyProfile({
      name,
      className,
      usStatus,
      nonUsApproved,
      trials,
      pubmed
    });

    return {
      peptideId,
      slug: asString(peptide.slug),
      name,
      profile
    };
  });

  console.log(`Generated profiles: ${generated.length}`);
  console.log("Sample output:");
  for (const sample of generated.slice(0, 3)) {
    console.log(`- ${sample.name}: ${sample.profile.adverseEffects.slice(0, 130)}...`);
  }

  if (DRY_RUN) {
    console.log("Dry run mode active. No database writes were performed.");
    return;
  }

  let updated = 0;
  for (const row of generated) {
    const payload = {
      peptide_id: row.peptideId,
      jurisdiction_id: usJurisdictionId,
      adverse_effects: row.profile.adverseEffects,
      contraindications: row.profile.contraindications,
      interactions: row.profile.interactions,
      monitoring: row.profile.monitoring
    };

    const { error: upsertError } = await supabase
      .from("peptide_safety_entries")
      .upsert(payload, { onConflict: "peptide_id,jurisdiction_id" });
    if (upsertError) {
      throw new Error(`Upsert failed for ${row.name}: ${upsertError.message}`);
    }

    const { error: clearPlaceholderError } = await supabase
      .from("peptide_safety_entries")
      .update({
        adverse_effects: row.profile.adverseEffects,
        contraindications: row.profile.contraindications,
        interactions: row.profile.interactions,
        monitoring: row.profile.monitoring
      })
      .eq("peptide_id", row.peptideId)
      .or(
        "adverse_effects.ilike.Auto-generated placeholder:%,contraindications.ilike.Auto-generated placeholder:%,interactions.ilike.Auto-generated placeholder:%,monitoring.ilike.Auto-generated placeholder:%"
      );

    if (clearPlaceholderError) {
      throw new Error(`Placeholder replacement failed for ${row.name}: ${clearPlaceholderError.message}`);
    }

    updated += 1;
  }

  console.log(`Successfully updated safety content for ${updated} peptides.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
