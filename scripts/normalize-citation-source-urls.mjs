#!/usr/bin/env node

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function hostEquals(hostname, expected) {
  return hostname === expected || hostname === `www.${expected}`;
}

function hostMatches(hostname, expected) {
  return hostEquals(hostname, expected) || hostname.endsWith(`.${expected}`);
}

function buildClinicalTrialsSearchUrl(term) {
  const normalized = term.trim();
  return normalized ? `https://clinicaltrials.gov/search?term=${encodeURIComponent(normalized)}` : "https://clinicaltrials.gov/";
}

function buildPubMedSearchUrl(term) {
  const normalized = term.trim();
  return normalized ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(normalized)}` : "https://pubmed.ncbi.nlm.nih.gov/";
}

function buildFdaDrugLabelSearchUrl(term) {
  const normalized = term.trim();
  if (!normalized) return "https://www.accessdata.fda.gov/scripts/cder/daf/";
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process&searchterm=${encodeURIComponent(normalized)}&search=Search`;
}

function buildPubChemCompoundUrl(cid) {
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(String(cid))}`;
}

function buildChemblCompoundUrl(chemblId) {
  return `https://www.ebi.ac.uk/chembl/compound_report_card/${encodeURIComponent(String(chemblId).trim())}/`;
}

function buildGrokipediaSearchUrl(term) {
  const normalized = term.trim();
  return normalized ? `https://grokipedia.com/search?q=${encodeURIComponent(normalized)}` : "https://grokipedia.com/";
}

function buildHubermanAiSearchUrl(term) {
  const normalized = term.trim();
  return normalized ? `https://ai.hubermanlab.com/search?q=${encodeURIComponent(normalized)}` : "https://ai.hubermanlab.com/";
}

function buildPeptiWikiSearchUrl(term) {
  const normalized = term.trim();
  return normalized ? `https://pepti.wiki/search?q=${encodeURIComponent(normalized)}` : "https://pepti.wiki/";
}

function extractQuotedToken(value) {
  const quoted = value.match(/"([^"]+)"/)?.[1]?.trim();
  if (quoted) return quoted;
  return value.replace(/\s+OR\s+/gi, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function toHumanReadableSourceUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (hostEquals(host, "clinicaltrials.gov") && path.startsWith("/api/v2/studies")) {
    const term = firstNonEmpty(parsed.searchParams.get("query.term"), parsed.searchParams.get("query.cond"));
    return buildClinicalTrialsSearchUrl(term);
  }

  if (hostEquals(host, "eutils.ncbi.nlm.nih.gov") && path.includes("/entrez/eutils/")) {
    const db = (parsed.searchParams.get("db") || "").toLowerCase();
    if (db === "pubmed") {
      const id = firstNonEmpty(parsed.searchParams.get("id"));
      if (id && !id.includes(",")) {
        return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`;
      }
      const term = firstNonEmpty(parsed.searchParams.get("term"));
      return buildPubMedSearchUrl(term);
    }
    return "https://www.ncbi.nlm.nih.gov/";
  }

  if (hostEquals(host, "api.fda.gov") && path === "/drug/label.json") {
    const search = firstNonEmpty(parsed.searchParams.get("search"));
    const term = extractQuotedToken(search);
    return buildFdaDrugLabelSearchUrl(term);
  }

  if (host === "www.ebi.ac.uk" || host === "ebi.ac.uk") {
    const chemblIdFromPath = parsed.pathname.match(/\/chembl\/api\/data\/molecule\/([^/.]+)\.json/i)?.[1];
    if (chemblIdFromPath) {
      return buildChemblCompoundUrl(chemblIdFromPath);
    }
    const chemblIdFromQuery = firstNonEmpty(parsed.searchParams.get("molecule_chembl_id"));
    if (chemblIdFromQuery) {
      return buildChemblCompoundUrl(chemblIdFromQuery);
    }
  }

  if (hostEquals(host, "pubchem.ncbi.nlm.nih.gov") && path.includes("/rest/")) {
    const cid = parsed.pathname.match(/\/compound\/(?:cid\/)?(\d+)/i)?.[1];
    if (cid) {
      return buildPubChemCompoundUrl(cid);
    }
  }

  if (hostMatches(host, "reddit.com")) {
    if (path.endsWith(".json")) {
      parsed.pathname = parsed.pathname.replace(/\.json$/i, "");
      if (parsed.pathname.endsWith("/search")) {
        parsed.pathname = `${parsed.pathname}/`;
      }
      return parsed.toString();
    }
    return parsed.toString();
  }

  if (hostEquals(host, "hn.algolia.com") && path.startsWith("/api/v1/")) {
    const query = firstNonEmpty(parsed.searchParams.get("query"));
    if (!query) {
      return "https://hn.algolia.com/";
    }
    return `https://hn.algolia.com/?query=${encodeURIComponent(query)}&sort=byDate&type=story`;
  }

  if (hostEquals(host, "grokipedia.com")) {
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    if (!normalizedPath || normalizedPath === "/search") {
      const query = firstNonEmpty(parsed.searchParams.get("q"), parsed.searchParams.get("query"));
      return buildGrokipediaSearchUrl(query);
    }
    parsed.protocol = "https:";
    parsed.hash = "";
    return parsed.toString();
  }

  if (hostEquals(host, "ai.hubermanlab.com")) {
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    if (!normalizedPath || normalizedPath === "/search") {
      const query = firstNonEmpty(parsed.searchParams.get("q"), parsed.searchParams.get("query"));
      return buildHubermanAiSearchUrl(query);
    }
    parsed.protocol = "https:";
    parsed.hash = "";
    return parsed.toString();
  }

  if (hostEquals(host, "pepti.wiki")) {
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    if (!normalizedPath || normalizedPath === "/search") {
      const query = firstNonEmpty(parsed.searchParams.get("q"), parsed.searchParams.get("query"));
      return buildPeptiWikiSearchUrl(query);
    }
    parsed.protocol = "https:";
    parsed.hash = "";
    return parsed.toString();
  }

  return parsed.toString();
}

async function main() {
  const envFile = parseEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envFile.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: citations, error } = await supabase.from("citations").select("id,source_url").order("id", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  let scanned = 0;
  let updated = 0;
  let unchanged = 0;
  let invalid = 0;

  for (const row of citations || []) {
    scanned += 1;
    const id = Number(row.id || 0);
    const current = typeof row.source_url === "string" ? row.source_url : "";
    if (!id || !current) {
      unchanged += 1;
      continue;
    }

    const next = toHumanReadableSourceUrl(current);
    if (!next) {
      invalid += 1;
      continue;
    }
    if (next === current) {
      unchanged += 1;
      continue;
    }

    const { error: updateError } = await supabase.from("citations").update({ source_url: next }).eq("id", id);
    if (updateError) {
      throw new Error(updateError.message);
    }
    updated += 1;
  }

  console.log(JSON.stringify({ scanned, updated, unchanged, invalid }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
