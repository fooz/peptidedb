import { sanitizeExternalUrl } from "@/lib/url-security";

function parseUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function hostEquals(hostname: string, expected: string): boolean {
  return hostname === expected || hostname === `www.${expected}`;
}

function hostMatches(hostname: string, expected: string): boolean {
  return hostEquals(hostname, expected) || hostname.endsWith(`.${expected}`);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function extractQuotedToken(value: string): string {
  const quoted = value.match(/"([^"]+)"/)?.[1]?.trim();
  if (quoted) {
    return quoted;
  }
  return value.replace(/\s+OR\s+/gi, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildClinicalTrialsSearchUrl(term: string): string {
  const normalized = term.trim();
  if (!normalized) {
    return "https://clinicaltrials.gov/";
  }
  return `https://clinicaltrials.gov/search?term=${encodeURIComponent(normalized)}`;
}

export function buildPubMedSearchUrl(term: string): string {
  const normalized = term.trim();
  if (!normalized) {
    return "https://pubmed.ncbi.nlm.nih.gov/";
  }
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(normalized)}`;
}

export function buildFdaDrugLabelSearchUrl(term: string): string {
  const normalized = term.trim();
  if (!normalized) {
    return "https://www.accessdata.fda.gov/scripts/cder/daf/";
  }
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process&searchterm=${encodeURIComponent(normalized)}&search=Search`;
}

export function buildPubChemCompoundUrl(cid: number): string {
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(String(cid))}`;
}

export function buildChemblCompoundUrl(chemblId: string): string {
  return `https://www.ebi.ac.uk/chembl/compound_report_card/${encodeURIComponent(chemblId.trim())}/`;
}

export function toHumanReadableSourceUrl(rawUrl: string | null | undefined): string | null {
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) {
    return null;
  }

  const parsed = parseUrl(safe);
  if (!parsed) {
    return safe;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (hostEquals(hostname, "clinicaltrials.gov")) {
    if (pathname.startsWith("/api/v2/studies")) {
      const term = firstNonEmpty(parsed.searchParams.get("query.term"), parsed.searchParams.get("query.cond"));
      return buildClinicalTrialsSearchUrl(term);
    }
    return safe;
  }

  if (hostEquals(hostname, "eutils.ncbi.nlm.nih.gov") && pathname.includes("/entrez/eutils/")) {
    const db = parsed.searchParams.get("db")?.toLowerCase() ?? "";
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

  if (hostEquals(hostname, "api.fda.gov") && pathname === "/drug/label.json") {
    const search = firstNonEmpty(parsed.searchParams.get("search"));
    const term = extractQuotedToken(search);
    return buildFdaDrugLabelSearchUrl(term);
  }

  if (hostEquals(hostname, "www.ebi.ac.uk") || hostEquals(hostname, "ebi.ac.uk")) {
    const chemblIdFromPath = parsed.pathname.match(/\/chembl\/api\/data\/molecule\/([^/.]+)\.json/i)?.[1];
    if (chemblIdFromPath) {
      return buildChemblCompoundUrl(chemblIdFromPath);
    }

    const chemblIdFromQuery = firstNonEmpty(parsed.searchParams.get("molecule_chembl_id"));
    if (chemblIdFromQuery) {
      return buildChemblCompoundUrl(chemblIdFromQuery);
    }
  }

  if (hostEquals(hostname, "pubchem.ncbi.nlm.nih.gov") && pathname.includes("/rest/")) {
    const cidFromPath = parsed.pathname.match(/\/compound\/(?:cid\/)?(\d+)/i)?.[1];
    if (cidFromPath) {
      return buildPubChemCompoundUrl(Number(cidFromPath));
    }
  }

  if (hostMatches(hostname, "reddit.com")) {
    if (pathname.endsWith(".json")) {
      const next = new URL(safe);
      next.pathname = next.pathname.replace(/\.json$/i, "");
      if (next.pathname.endsWith("/search")) {
        next.pathname = `${next.pathname}/`;
      }
      return next.toString();
    }
    return safe;
  }

  if (hostEquals(hostname, "hn.algolia.com") && pathname.startsWith("/api/v1/")) {
    const query = firstNonEmpty(parsed.searchParams.get("query"));
    if (!query) {
      return "https://hn.algolia.com/";
    }
    return `https://hn.algolia.com/?query=${encodeURIComponent(query)}&sort=byDate&type=story`;
  }

  return safe;
}
