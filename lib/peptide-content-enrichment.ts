import type { SupabaseClient } from "@supabase/supabase-js";
import type { DosingContext, EvidenceGrade } from "@/lib/types";

type JurisdictionCode = "US" | "EU" | "UK" | "CA" | "AU";

type UseCaseRule = {
  slug: string;
  name: string;
  keywords: string[];
};

type EnrichmentSourceHits = {
  openFda: number;
  pubChem: number;
  chembl: number;
  clinicalTrials: number;
  pubMed: number;
};

type EnrichmentResult = {
  peptidesScanned: number;
  peptidesUpdated: number;
  profileUpdates: number;
  useCaseUpdates: number;
  safetyUpdates: number;
  dosingUpdates: number;
  claimUpdates: number;
  failures: number;
  sourceHits: EnrichmentSourceHits;
};

type EnrichmentOptions = {
  limit?: number;
  onlyPublished?: boolean;
  peptideSlugs?: string[];
  delayMs?: number;
};

type PeptideRow = {
  id: number;
  slug: string;
  name: string;
  className: string;
  aliases: string[];
};

type ClinicalTrialsSnapshot = {
  total: number;
  completed: number;
  recruiting: number;
  active: number;
  terminated: number;
  withResults: number;
  latestUpdate: string;
  topConditions: string[];
  searchUrl: string;
};

type PubMedSnapshot = {
  count: number;
  newestYear: number | null;
  recentTitles: string[];
  searchUrl: string;
};

type OpenFdaLabel = {
  found: boolean;
  matchedTerm: string;
  indications: string;
  dosage: string;
  contraindications: string;
  warnings: string;
  adverseReactions: string;
  interactions: string;
  clinicalPharmacology: string;
  routeHints: string[];
  frequencyHints: string[];
  sourceUrl: string;
};

type PubChemData = {
  found: boolean;
  cid: number | null;
  title: string;
  description: string;
  molecularFormula: string;
  molecularWeight: string;
  synonyms: string[];
  sourceUrl: string;
};

type ChemblData = {
  found: boolean;
  chemblId: string;
  prefName: string;
  moleculeType: string;
  maxPhase: number | null;
  firstApproval: number | null;
  mechanisms: string[];
  indications: string[];
  sourceUrl: string;
};

type SourceBundle = {
  clinicalTrials: ClinicalTrialsSnapshot;
  pubMed: PubMedSnapshot;
  openFda: OpenFdaLabel;
  pubChem: PubChemData;
  chembl: ChemblData;
};

type GeneratedContent = {
  intro: string;
  mechanism: string;
  effectivenessSummary: string;
  longDescription: string;
  safety: {
    adverseEffects: string;
    contraindications: string;
    interactions: string;
    monitoring: string;
  };
  dosing: {
    context: DosingContext;
    population: string;
    route: string;
    startingDose: string;
    maintenanceDose: string;
    frequency: string;
    notes: string;
  };
  useCases: {
    slug: string;
    name: string;
    evidenceGrade: EvidenceGrade;
    consumerSummary: string;
    clinicalSummary: string;
  }[];
  claims: {
    section: string;
    claimText: string;
    evidenceGrade: EvidenceGrade;
    sourceUrl: string;
    sourceTitle: string;
    publishedAt: string;
  }[];
  usStatus: "US_FDA_APPROVED" | "INVESTIGATIONAL";
};

const TODAY = new Date().toISOString().slice(0, 10);
const JURISDICTION_CODES: JurisdictionCode[] = ["US", "EU", "UK", "CA", "AU"];
const ENRICHMENT_CLAIM_SECTIONS = [
  "External Sources: ClinicalTrials",
  "External Sources: PubMed",
  "External Sources: openFDA",
  "External Sources: ChEMBL/PubChem"
];

const USE_CASE_RULES: UseCaseRule[] = [
  {
    slug: "type-2-diabetes",
    name: "Type 2 Diabetes",
    keywords: ["type 2 diabetes", "diabetes mellitus type 2", "glycemic", "hyperglycemia", "a1c"]
  },
  {
    slug: "weight-management",
    name: "Weight Management",
    keywords: ["obesity", "overweight", "weight management", "weight loss", "body mass index"]
  },
  {
    slug: "type-1-diabetes",
    name: "Type 1 Diabetes",
    keywords: ["type 1 diabetes", "diabetes mellitus type 1"]
  },
  {
    slug: "cardiometabolic-risk-reduction",
    name: "Cardiometabolic Risk Reduction",
    keywords: ["cardiovascular", "heart failure", "cardiorenal", "stroke", "major adverse cardiovascular"]
  },
  {
    slug: "growth-hormone-deficiency",
    name: "Growth Hormone Deficiency",
    keywords: ["growth hormone deficiency", "gh deficiency", "pituitary deficiency"]
  },
  {
    slug: "acromegaly",
    name: "Acromegaly",
    keywords: ["acromegaly"]
  },
  {
    slug: "reproductive-health",
    name: "Reproductive Health",
    keywords: ["infertility", "ivf", "ovarian", "reproductive", "fertility", "endometriosis"]
  },
  {
    slug: "sexual-health",
    name: "Sexual Health",
    keywords: ["erectile dysfunction", "sexual dysfunction", "hypoactive sexual desire", "libido"]
  },
  {
    slug: "tissue-repair",
    name: "Tissue Repair",
    keywords: ["wound", "tendon", "ligament", "muscle injury", "tissue repair", "healing"]
  },
  {
    slug: "gi-symptoms",
    name: "GI Symptoms",
    keywords: ["gastrointestinal", "crohn", "ulcerative colitis", "ibd", "ibs", "colitis", "ulcer"]
  },
  {
    slug: "neurology-cognition",
    name: "Neurology & Cognition",
    keywords: ["alzheimer", "parkinson", "cognitive", "memory", "neuro", "depression", "anxiety", "migraine"]
  },
  {
    slug: "inflammatory-immune",
    name: "Inflammatory & Immune Modulation",
    keywords: ["inflammation", "immune", "autoimmune", "arthritis", "psoriasis", "dermatitis"]
  },
  {
    slug: "kidney-renal-care",
    name: "Kidney & Renal Care",
    keywords: ["kidney", "renal", "nephropathy", "albuminuria", "ckd", "chronic kidney disease"]
  },
  {
    slug: "dermatology-aesthetics",
    name: "Dermatology & Aesthetics",
    keywords: ["skin", "dermatology", "aesthetic", "wrinkle", "collagen", "photoaging"]
  },
  {
    slug: "evidence-tracking",
    name: "Evidence Tracking",
    keywords: []
  }
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max = 420): string {
  const cleaned = compact(text);
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}...`;
}

function firstNonEmpty(values: string[]): string {
  for (const value of values) {
    if (value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferRoute(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("subcutaneous")) return "Subcutaneous";
  if (lower.includes("intravenous")) return "Intravenous";
  if (lower.includes("intramuscular")) return "Intramuscular";
  if (lower.includes("intranasal") || lower.includes("nasal")) return "Intranasal";
  if (lower.includes("oral")) return "Oral";
  if (lower.includes("topical")) return "Topical";
  if (lower.includes("injection")) return "Injection";
  return "Protocol dependent";
}

function inferFrequency(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("once weekly") || lower.includes("weekly")) return "Weekly";
  if (lower.includes("once daily") || lower.includes("daily")) return "Daily";
  if (lower.includes("twice daily")) return "Twice daily";
  if (lower.includes("monthly")) return "Monthly";
  return "Protocol dependent";
}

function extractDosePhrase(text: string): string[] {
  const matches = text.match(/\b\d+(\.\d+)?\s?(mg|mcg|ug|g|unit|units|iu|ml)\b[^.;]{0,70}/gi) ?? [];
  return uniqueStrings(matches.map((entry) => truncate(entry, 120)));
}

function pickSentence(text: string, max = 220): string {
  const cleaned = compact(text);
  if (!cleaned) {
    return "";
  }
  const sentence = cleaned.split(/(?<=[.?!])\s+/)[0] ?? cleaned;
  return truncate(sentence, max);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, retries = 2): Promise<unknown> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
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
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          attempt += 1;
          await sleep(450 * attempt);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await sleep(450 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown fetch error.");
}

function normalizeSearchName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[()[\]{}:;,+/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchClinicalTrialsSnapshot(name: string): Promise<ClinicalTrialsSnapshot> {
  const normalizedName = normalizeSearchName(name) || name;
  const params = new URLSearchParams({
    "query.term": normalizedName,
    pageSize: "100",
    format: "json"
  });
  const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;

  let total = 0;
  let completed = 0;
  let recruiting = 0;
  let active = 0;
  let terminated = 0;
  let withResults = 0;
  let latestUpdate = "";
  const conditionCounts = new Map<string, number>();

  try {
    const payload = asRecord(await fetchJson(url));
    const studies = asArray(payload?.studies);
    total = studies.length;

    for (const study of studies) {
      const studyRecord = asRecord(study);
      const protocol = asRecord(studyRecord?.protocolSection);
      const statusModule = asRecord(protocol?.statusModule);
      const conditionsModule = asRecord(protocol?.conditionsModule);
      const status = asString(statusModule?.overallStatus).toUpperCase();

      if (status === "COMPLETED") completed += 1;
      else if (status === "RECRUITING") recruiting += 1;
      else if (status === "ACTIVE_NOT_RECRUITING") active += 1;
      else if (status === "TERMINATED") terminated += 1;

      if (studyRecord?.hasResults === true) {
        withResults += 1;
      }

      const updateDate =
        asString(asRecord(statusModule?.lastUpdatePostDateStruct)?.date) ||
        asString(asRecord(statusModule?.lastUpdateSubmitDateStruct)?.date);
      if (updateDate) {
        const iso = new Date(updateDate);
        if (!Number.isNaN(iso.getTime())) {
          const next = iso.toISOString().slice(0, 10);
          if (!latestUpdate || next > latestUpdate) {
            latestUpdate = next;
          }
        }
      }

      for (const condition of asArray(conditionsModule?.conditions).map((entry) => asString(entry)).filter(Boolean)) {
        conditionCounts.set(condition, (conditionCounts.get(condition) ?? 0) + 1);
      }
    }
  } catch {
    return {
      total: 0,
      completed: 0,
      recruiting: 0,
      active: 0,
      terminated: 0,
      withResults: 0,
      latestUpdate: "",
      topConditions: [],
      searchUrl: url
    };
  }

  const topConditions = Array.from(conditionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([condition]) => condition);

  return {
    total,
    completed,
    recruiting,
    active,
    terminated,
    withResults,
    latestUpdate,
    topConditions,
    searchUrl: url
  };
}

async function fetchPubMedSnapshot(name: string): Promise<PubMedSnapshot> {
  const normalizedName = normalizeSearchName(name) || name;
  const searchParams = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    retmax: "6",
    sort: "pub+date",
    term: `"${normalizedName}"[Title/Abstract] AND (clinical OR trial OR randomized OR review)`
  });
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams.toString()}`;

  try {
    const searchPayload = asRecord(await fetchJson(searchUrl));
    const searchResult = asRecord(searchPayload?.esearchresult);
    const idList = asArray(searchResult?.idlist).map((entry) => asString(entry)).filter(Boolean);
    const count = Number(asString(searchResult?.count) || "0");

    if (idList.length === 0) {
      return {
        count,
        newestYear: null,
        recentTitles: [],
        searchUrl
      };
    }

    const summaryParams = new URLSearchParams({
      db: "pubmed",
      retmode: "json",
      id: idList.join(",")
    });
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams.toString()}`;
    const summaryPayload = asRecord(await fetchJson(summaryUrl));
    const summaryResult = asRecord(summaryPayload?.result);

    const recentTitles: string[] = [];
    let newestYear: number | null = null;
    for (const id of idList) {
      const row = asRecord(summaryResult?.[id]);
      const title = asString(row?.title);
      const pubDate = asString(row?.pubdate);
      const yearMatch = pubDate.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = Number(yearMatch[0]);
        if (!newestYear || year > newestYear) {
          newestYear = year;
        }
      }
      if (title) {
        recentTitles.push(truncate(title, 180));
      }
    }

    return {
      count,
      newestYear,
      recentTitles,
      searchUrl
    };
  } catch {
    return {
      count: 0,
      newestYear: null,
      recentTitles: [],
      searchUrl
    };
  }
}

function parseOpenFdaText(record: Record<string, unknown>, key: string): string {
  const values = asArray(record[key]).map((entry) => asString(entry)).filter(Boolean);
  if (values.length === 0) {
    return "";
  }
  return truncate(values.join(" "), 600);
}

async function fetchOpenFdaLabel(name: string, aliases: string[]): Promise<OpenFdaLabel> {
  const terms = uniqueStrings([name, ...aliases]).slice(0, 7);
  const emptyResult: OpenFdaLabel = {
    found: false,
    matchedTerm: "",
    indications: "",
    dosage: "",
    contraindications: "",
    warnings: "",
    adverseReactions: "",
    interactions: "",
    clinicalPharmacology: "",
    routeHints: [],
    frequencyHints: [],
    sourceUrl: ""
  };

  for (const term of terms) {
    const query = `openfda.generic_name:"${term}" OR openfda.brand_name:"${term}" OR openfda.substance_name:"${term}"`;
    const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`;
    try {
      const payload = asRecord(await fetchJson(url));
      const results = asArray(payload?.results);
      const row = asRecord(results[0]);
      if (!row) {
        continue;
      }

      const indications = parseOpenFdaText(row, "indications_and_usage");
      const dosage = parseOpenFdaText(row, "dosage_and_administration");
      const contraindications = firstNonEmpty([
        parseOpenFdaText(row, "contraindications"),
        parseOpenFdaText(row, "warnings_and_cautions")
      ]);
      const warnings = parseOpenFdaText(row, "warnings_and_cautions");
      const adverseReactions = parseOpenFdaText(row, "adverse_reactions");
      const interactions = parseOpenFdaText(row, "drug_interactions");
      const clinicalPharmacology = parseOpenFdaText(row, "clinical_pharmacology");

      const routeHints = uniqueStrings(
        [indications, dosage, clinicalPharmacology]
          .map((text) => inferRoute(text))
          .filter((route) => route !== "Protocol dependent")
      );
      const frequencyHints = uniqueStrings(
        [dosage, indications].map((text) => inferFrequency(text)).filter((freq) => freq !== "Protocol dependent")
      );

      return {
        found: true,
        matchedTerm: term,
        indications,
        dosage,
        contraindications,
        warnings,
        adverseReactions,
        interactions,
        clinicalPharmacology,
        routeHints,
        frequencyHints,
        sourceUrl: url
      };
    } catch {
      continue;
    }
  }

  return emptyResult;
}

function findPubChemRecordDescription(payload: Record<string, unknown> | null): string {
  const root = asRecord(payload?.Record);
  const sections = asArray(root?.Section);
  for (const section of sections) {
    const sectionRecord = asRecord(section);
    const sectionBlocks = asArray(sectionRecord?.Section);
    for (const block of sectionBlocks) {
      const blockRecord = asRecord(block);
      const infoRows = asArray(blockRecord?.Information);
      for (const info of infoRows) {
        const infoRecord = asRecord(info);
        const value = asRecord(infoRecord?.Value);
        const markup = asArray(value?.StringWithMarkup);
        for (const item of markup) {
          const itemRecord = asRecord(item);
          const text = asString(itemRecord?.String);
          if (text) {
            return text;
          }
        }
      }
    }
  }
  return "";
}

async function fetchPubChemData(name: string): Promise<PubChemData> {
  const normalizedName = normalizeSearchName(name) || name;
  const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(normalizedName)}/cids/JSON`;
  const emptyResult: PubChemData = {
    found: false,
    cid: null,
    title: "",
    description: "",
    molecularFormula: "",
    molecularWeight: "",
    synonyms: [],
    sourceUrl: ""
  };

  try {
    const cidPayload = asRecord(await fetchJson(cidUrl));
    const cids = asArray(cidPayload?.IdentifierList ? asRecord(cidPayload.IdentifierList)?.CID : [])
      .map((value) => asNumber(value))
      .filter((value): value is number => value !== null);
    const cid = cids[0];
    if (!cid) {
      return emptyResult;
    }

    const descriptionUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Record+Description`;
    const synonymUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
    const propertyUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight/JSON`;

    const [descriptionPayload, synonymPayload, propertyPayload] = await Promise.all([
      fetchJson(descriptionUrl).catch(() => null),
      fetchJson(synonymUrl).catch(() => null),
      fetchJson(propertyUrl).catch(() => null)
    ]);

    const description = truncate(findPubChemRecordDescription(asRecord(descriptionPayload)), 500);
    const synonymRecord = asRecord(synonymPayload);
    const synonymInfo = asArray(asRecord(synonymRecord?.InformationList)?.Information)[0];
    const synonyms = uniqueStrings(
      asArray(asRecord(synonymInfo)?.Synonym)
        .map((entry) => asString(entry))
        .filter(Boolean)
        .slice(0, 18)
    );

    const propertyRecord = asRecord(propertyPayload);
    const propertyRow = asArray(asRecord(propertyRecord?.PropertyTable)?.Properties)[0];
    const molecularFormula = asString(asRecord(propertyRow)?.MolecularFormula);
    const molecularWeightRaw = asString(asRecord(propertyRow)?.MolecularWeight);
    const molecularWeight = molecularWeightRaw ? `${molecularWeightRaw}` : "";

    return {
      found: true,
      cid,
      title: normalizedName,
      description,
      molecularFormula,
      molecularWeight,
      synonyms,
      sourceUrl: descriptionUrl
    };
  } catch {
    return emptyResult;
  }
}

function scoreChemblCandidate(row: Record<string, unknown>, query: string): number {
  const prefName = asString(row.pref_name).toLowerCase();
  const queryLower = query.toLowerCase();
  let score = 0;
  if (prefName && prefName === queryLower) {
    score += 100;
  }
  if (prefName && prefName.includes(queryLower)) {
    score += 40;
  }
  const maxPhase = asNumber(row.max_phase) ?? 0;
  score += maxPhase * 10;
  const moleculeType = asString(row.molecule_type).toLowerCase();
  if (moleculeType.includes("protein") || moleculeType.includes("oligonucleotide")) {
    score += 20;
  }
  return score;
}

async function fetchChemblData(name: string): Promise<ChemblData> {
  const query = normalizeSearchName(name) || name;
  const searchUrl = `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(query)}&limit=8`;
  const emptyResult: ChemblData = {
    found: false,
    chemblId: "",
    prefName: "",
    moleculeType: "",
    maxPhase: null,
    firstApproval: null,
    mechanisms: [],
    indications: [],
    sourceUrl: ""
  };

  try {
    const payload = asRecord(await fetchJson(searchUrl));
    const molecules = asArray(payload?.molecules)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    if (molecules.length === 0) {
      return emptyResult;
    }

    const sorted = molecules
      .map((row) => ({ row, score: scoreChemblCandidate(row, query) }))
      .sort((a, b) => b.score - a.score);
    const best = sorted[0]?.row;
    if (!best) {
      return emptyResult;
    }

    const chemblId = asString(best.molecule_chembl_id);
    if (!chemblId) {
      return emptyResult;
    }

    const detailUrl = `https://www.ebi.ac.uk/chembl/api/data/molecule/${encodeURIComponent(chemblId)}.json`;
    const mechanismUrl = `https://www.ebi.ac.uk/chembl/api/data/mechanism.json?molecule_chembl_id=${encodeURIComponent(chemblId)}&limit=10`;
    const indicationUrl = `https://www.ebi.ac.uk/chembl/api/data/drug_indication.json?molecule_chembl_id=${encodeURIComponent(chemblId)}&limit=12`;

    const [detailPayload, mechanismPayload, indicationPayload] = await Promise.all([
      fetchJson(detailUrl).catch(() => null),
      fetchJson(mechanismUrl).catch(() => null),
      fetchJson(indicationUrl).catch(() => null)
    ]);

    const detail = asRecord(detailPayload);
    const maxPhase = asNumber(detail?.max_phase);
    const firstApproval = asNumber(detail?.first_approval);
    const prefName = asString(detail?.pref_name) || asString(best.pref_name);
    const moleculeType = asString(detail?.molecule_type) || asString(best.molecule_type);

    const mechanisms = uniqueStrings(
      asArray(asRecord(mechanismPayload)?.mechanisms)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) =>
          firstNonEmpty([
            [asString(entry.mechanism_of_action), asString(entry.target_pref_name), asString(entry.action_type)]
              .filter(Boolean)
              .join(" | "),
            asString(entry.mechanism_of_action)
          ])
        )
        .filter(Boolean)
        .slice(0, 4)
    );

    const indications = uniqueStrings(
      asArray(asRecord(indicationPayload)?.drug_indications)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => firstNonEmpty([asString(entry.mesh_heading), asString(entry.efo_term)]))
        .filter(Boolean)
        .slice(0, 10)
    );

    return {
      found: true,
      chemblId,
      prefName,
      moleculeType,
      maxPhase,
      firstApproval,
      mechanisms,
      indications,
      sourceUrl: detailUrl
    };
  } catch {
    return emptyResult;
  }
}

async function collectSourceBundle(name: string, aliases: string[]): Promise<SourceBundle> {
  const [clinicalTrials, pubMed, openFda, pubChem, chembl] = await Promise.all([
    fetchClinicalTrialsSnapshot(name),
    fetchPubMedSnapshot(name),
    fetchOpenFdaLabel(name, aliases),
    fetchPubChemData(name),
    fetchChemblData(name)
  ]);
  return {
    clinicalTrials,
    pubMed,
    openFda,
    pubChem,
    chembl
  };
}

function inferEvidenceGrade(source: SourceBundle): EvidenceGrade {
  if (source.openFda.found && source.clinicalTrials.completed >= 5) {
    return "A";
  }
  if ((source.chembl.maxPhase ?? 0) >= 4 && source.clinicalTrials.total >= 8) {
    return "A";
  }
  if ((source.chembl.maxPhase ?? 0) >= 3 || source.clinicalTrials.completed >= 3 || source.pubMed.count >= 40) {
    return "B";
  }
  if (source.clinicalTrials.total >= 5 || source.pubMed.count >= 12) {
    return "C";
  }
  if (source.clinicalTrials.total > 0 || source.pubMed.count > 0) {
    return "D";
  }
  return "I";
}

function inferUseCases(name: string, source: SourceBundle, grade: EvidenceGrade): GeneratedContent["useCases"] {
  const weightedText = [
    source.openFda.indications,
    source.openFda.matchedTerm,
    source.chembl.indications.join(" | "),
    source.clinicalTrials.topConditions.join(" | "),
    source.pubMed.recentTitles.join(" | ")
  ]
    .join(" | ")
    .toLowerCase();

  const matches = USE_CASE_RULES.filter((rule) => {
    if (rule.slug === "evidence-tracking") {
      return false;
    }
    return rule.keywords.some((keyword) => weightedText.includes(keyword));
  }).slice(0, 3);

  if (matches.length === 0) {
    return [
      {
        slug: "evidence-tracking",
        name: "Evidence Tracking",
        evidenceGrade: source.clinicalTrials.total > 0 || source.pubMed.count > 0 ? "D" : "I",
        consumerSummary:
          `As of ${TODAY}, this ${name} record is tracked primarily for evidence discovery, with ${source.clinicalTrials.total} indexed ClinicalTrials.gov studies and ${source.pubMed.count} PubMed records.`,
        clinicalSummary:
          `Current indexed data are not sufficient for indication-specific certainty; this entry remains evidence-tracking while source-level synthesis matures.`
      }
    ];
  }

  return matches.map((match) => {
    const approvedFlag = source.openFda.found ? "US label evidence is available" : "No US approved label was identified";
    return {
      slug: match.slug,
      name: match.name,
      evidenceGrade: grade,
      consumerSummary: truncate(
        `${name} appears in external datasets for ${match.name.toLowerCase()}. ${approvedFlag}, and current indexed evidence includes ${source.clinicalTrials.total} ClinicalTrials.gov studies plus ${source.pubMed.count} PubMed records.`,
        300
      ),
      clinicalSummary: truncate(
        `Mapped from openFDA/ChEMBL/ClinicalTrials terms for ${match.name.toLowerCase()}. Trial status snapshot: completed ${source.clinicalTrials.completed}, recruiting ${source.clinicalTrials.recruiting}, active not recruiting ${source.clinicalTrials.active}; inferred evidence grade ${grade}.`,
        320
      )
    };
  });
}

function generateMechanism(name: string, className: string, source: SourceBundle): string {
  const mechanismSnippet = source.chembl.mechanisms[0] ? truncate(source.chembl.mechanisms[0], 240) : "";
  const labelSnippet = source.openFda.clinicalPharmacology ? pickSentence(source.openFda.clinicalPharmacology, 220) : "";
  const pubChemSnippet = source.pubChem.description ? pickSentence(source.pubChem.description, 220) : "";

  return firstNonEmpty([
    [mechanismSnippet, labelSnippet].filter(Boolean).join(" "),
    mechanismSnippet,
    labelSnippet,
    pubChemSnippet,
    `${name} is listed as ${className || "a peptide"} with mechanism information still evolving across public sources.`
  ]);
}

function generateLongDescription(name: string, className: string, source: SourceBundle, grade: EvidenceGrade): string {
  const paragraphs: string[] = [];

  const sourceIdentityBits = [
    source.pubChem.found && source.pubChem.molecularFormula
      ? `PubChem lists molecular formula ${source.pubChem.molecularFormula}${source.pubChem.molecularWeight ? ` with molecular weight ${source.pubChem.molecularWeight}` : ""}.`
      : "",
    source.chembl.found
      ? `ChEMBL record ${source.chembl.chemblId}${source.chembl.maxPhase !== null ? ` reports max phase ${source.chembl.maxPhase}` : ""}${source.chembl.firstApproval ? ` and first approval year ${source.chembl.firstApproval}` : ""}.`
      : ""
  ].filter(Boolean);

  if (sourceIdentityBits.length > 0) {
    paragraphs.push(truncate(`${name} is categorized as ${className || "a peptide"} in this reference. ${sourceIdentityBits.join(" ")}`, 520));
  }

  const evidenceParagraph = truncate(
    `Evidence snapshot (${TODAY}): ClinicalTrials.gov returns ${source.clinicalTrials.total} studies for ${name} (completed ${source.clinicalTrials.completed}, recruiting ${source.clinicalTrials.recruiting}, active ${source.clinicalTrials.active}, terminated ${source.clinicalTrials.terminated}, posted results ${source.clinicalTrials.withResults}). PubMed indexes ${source.pubMed.count} related records${source.pubMed.newestYear ? ` with recent publication years through ${source.pubMed.newestYear}` : ""}.`,
    560
  );
  paragraphs.push(evidenceParagraph);

  const conditionList = source.clinicalTrials.topConditions.slice(0, 4).join(", ");
  const indicationList = source.chembl.indications.slice(0, 4).join(", ");
  const indicationParagraph = truncate(
    `${source.openFda.found ? `openFDA label records were identified for ${source.openFda.matchedTerm || name}.` : `No openFDA label match was identified for ${name} using primary name and aliases.`} ${conditionList ? `Most frequent trial-linked conditions include ${conditionList}.` : ""} ${indicationList ? `ChEMBL indication terms include ${indicationList}.` : ""} Overall evidence grade is currently ${grade}.`,
    560
  );
  paragraphs.push(indicationParagraph);

  return paragraphs.filter(Boolean).join("\n\n");
}

function generateSafety(source: SourceBundle, name: string) {
  const adverseEffects = firstNonEmpty([
    pickSentence(source.openFda.adverseReactions, 320),
    truncate(
      `ClinicalTrials snapshot for ${name} (${TODAY}): ${source.clinicalTrials.total} studies indexed with ${source.clinicalTrials.withResults} posted results. Reported adverse-event patterns are study- and dose-specific.`,
      320
    )
  ]);
  const contraindications = firstNonEmpty([
    pickSentence(source.openFda.contraindications, 320),
    pickSentence(source.openFda.warnings, 320),
    `No consolidated contraindication label text was found in openFDA for ${name}; evaluate protocol exclusions and specialist guidance before use.`
  ]);
  const interactions = firstNonEmpty([
    pickSentence(source.openFda.interactions, 320),
    `Public interaction data for ${name} remain limited; review concurrent therapy risk and protocol-specific exclusions before use.`
  ]);
  const monitoring = firstNonEmpty([
    pickSentence(source.openFda.warnings, 320),
    truncate(
      `Monitoring should align to indication and protocol context, using current trial status (${source.clinicalTrials.completed} completed / ${source.clinicalTrials.recruiting} recruiting) and recent publication activity${source.pubMed.newestYear ? ` through ${source.pubMed.newestYear}` : ""}.`,
      320
    )
  ]);
  return {
    adverseEffects,
    contraindications,
    interactions,
    monitoring
  };
}

function generateDosing(source: SourceBundle, name: string): GeneratedContent["dosing"] {
  const hasLabel = source.openFda.found && source.openFda.dosage.length > 0;
  const dosePhrases = extractDosePhrase(source.openFda.dosage);
  const route = firstNonEmpty([
    source.openFda.routeHints[0] ?? "",
    inferRoute(source.openFda.dosage),
    inferRoute(source.openFda.indications)
  ]);
  const frequency = firstNonEmpty([
    source.openFda.frequencyHints[0] ?? "",
    inferFrequency(source.openFda.dosage),
    inferFrequency(source.openFda.indications)
  ]);

  if (hasLabel) {
    return {
      context: "APPROVED_LABEL",
      population: "Adults with label-aligned indication",
      route: route || "Per approved label",
      startingDose: dosePhrases[0] ?? "Use current approved label starting dose.",
      maintenanceDose: dosePhrases[1] ?? "Escalate to labeled maintenance dose as tolerated.",
      frequency: frequency || "Per approved label",
      notes: `Generated from openFDA dosage and administration text for ${source.openFda.matchedTerm || name}; verify exact product-specific titration on the current label.`
    };
  }

  return {
    context: "STUDY_REPORTED",
    population: "Clinical trial participants",
    route: route || "Protocol dependent",
    startingDose: "Protocol-specific dosing",
    maintenanceDose: "Protocol-specific titration",
    frequency: frequency || "Protocol dependent",
    notes: `No openFDA dosing label was matched. Generated from trial/publication evidence snapshot (${source.clinicalTrials.total} studies; ${source.pubMed.count} PubMed records).`
  };
}

function buildClaims(name: string, source: SourceBundle, grade: EvidenceGrade): GeneratedContent["claims"] {
  const claims: GeneratedContent["claims"] = [];

  if (source.clinicalTrials.total > 0) {
    claims.push({
      section: "External Sources: ClinicalTrials",
      claimText: truncate(
        `ClinicalTrials.gov search for ${name} currently returns ${source.clinicalTrials.total} studies (${source.clinicalTrials.completed} completed, ${source.clinicalTrials.recruiting} recruiting, ${source.clinicalTrials.active} active not recruiting, ${source.clinicalTrials.terminated} terminated).`,
        250
      ),
      evidenceGrade: grade,
      sourceUrl: source.clinicalTrials.searchUrl,
      sourceTitle: `ClinicalTrials.gov search results for ${name}`,
      publishedAt: source.clinicalTrials.latestUpdate || TODAY
    });
  }

  if (source.pubMed.count > 0) {
    const titleSnippet = source.pubMed.recentTitles[0] ? ` Recent indexed title: "${source.pubMed.recentTitles[0]}".` : "";
    claims.push({
      section: "External Sources: PubMed",
      claimText: truncate(
        `PubMed query for ${name} returns ${source.pubMed.count} records${source.pubMed.newestYear ? ` with publication years through ${source.pubMed.newestYear}` : ""}.${titleSnippet}`,
        250
      ),
      evidenceGrade: grade,
      sourceUrl: source.pubMed.searchUrl,
      sourceTitle: `PubMed search results for ${name}`,
      publishedAt: source.pubMed.newestYear ? `${source.pubMed.newestYear}-01-01` : TODAY
    });
  }

  if (source.openFda.found) {
    claims.push({
      section: "External Sources: openFDA",
      claimText: truncate(
        `openFDA label records were found for ${source.openFda.matchedTerm || name}${source.openFda.indications ? `; indication text includes: ${pickSentence(source.openFda.indications, 140)}` : "."}`,
        250
      ),
      evidenceGrade: source.openFda.indications ? "A" : grade,
      sourceUrl: source.openFda.sourceUrl,
      sourceTitle: `openFDA drug label query for ${source.openFda.matchedTerm || name}`,
      publishedAt: TODAY
    });
  }

  if (source.chembl.found || source.pubChem.found) {
    const chemblSnippet = source.chembl.found
      ? `ChEMBL ${source.chembl.chemblId}${source.chembl.maxPhase !== null ? ` reports max phase ${source.chembl.maxPhase}` : ""}.`
      : "";
    const pubChemSnippet = source.pubChem.found
      ? `PubChem CID ${source.pubChem.cid}${source.pubChem.molecularFormula ? ` lists molecular formula ${source.pubChem.molecularFormula}` : ""}.`
      : "";
    claims.push({
      section: "External Sources: ChEMBL/PubChem",
      claimText: truncate(`${chemblSnippet} ${pubChemSnippet}`.trim(), 240),
      evidenceGrade: grade,
      sourceUrl: source.chembl.sourceUrl || source.pubChem.sourceUrl,
      sourceTitle: source.chembl.sourceUrl ? `ChEMBL record for ${name}` : `PubChem record for ${name}`,
      publishedAt: TODAY
    });
  }

  return claims.slice(0, 4);
}

function generateContent(name: string, className: string, source: SourceBundle): GeneratedContent {
  const evidenceGrade = inferEvidenceGrade(source);
  const useCases = inferUseCases(name, source, evidenceGrade);
  const mechanism = generateMechanism(name, className, source);
  const effectivenessSummary = truncate(
    `Current evidence synthesis for ${name} is grade ${evidenceGrade}, based on ${source.clinicalTrials.total} indexed ClinicalTrials.gov studies and ${source.pubMed.count} PubMed records${source.openFda.found ? ", with openFDA label data available." : "."}`,
    320
  );
  const intro = truncate(
    `${name} is listed as ${className || "a peptide reference entry"}, with current consumer and clinical summaries synthesized from regulatory records, trial registries, and indexed publications.`,
    260
  );

  return {
    intro,
    mechanism,
    effectivenessSummary,
    longDescription: generateLongDescription(name, className, source, evidenceGrade),
    safety: generateSafety(source, name),
    dosing: generateDosing(source, name),
    useCases,
    claims: buildClaims(name, source, evidenceGrade),
    usStatus: source.openFda.found ? "US_FDA_APPROVED" : "INVESTIGATIONAL"
  };
}

async function ensureJurisdictions(supabase: SupabaseClient): Promise<Map<JurisdictionCode, number>> {
  await supabase.from("jurisdictions").upsert(
    [
      { code: "US", name: "United States" },
      { code: "EU", name: "European Union" },
      { code: "UK", name: "United Kingdom" },
      { code: "CA", name: "Canada" },
      { code: "AU", name: "Australia" }
    ],
    { onConflict: "code" }
  );

  const { data, error } = await supabase.from("jurisdictions").select("id,code").in("code", JURISDICTION_CODES);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed loading jurisdictions.");
  }

  const map = new Map<JurisdictionCode, number>();
  for (const row of data) {
    const code = asString(row.code) as JurisdictionCode;
    const id = Number(row.id ?? 0);
    if (code && id > 0) {
      map.set(code, id);
    }
  }
  return map;
}

async function loadPeptides(supabase: SupabaseClient, options?: EnrichmentOptions): Promise<PeptideRow[]> {
  let query = supabase
    .from("peptides")
    .select("id,slug,canonical_name,peptide_class,is_published,peptide_aliases(alias)")
    .order("canonical_name", { ascending: true });

  if (options?.onlyPublished ?? true) {
    query = query.eq("is_published", true);
  }
  if (options?.peptideSlugs && options.peptideSlugs.length > 0) {
    query = query.in("slug", options.peptideSlugs);
  }
  if (options?.limit && Number(options.limit) > 0) {
    query = query.limit(Number(options.limit));
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "Failed loading peptides for enrichment.");
  }

  return asArray(data)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((row) => ({
      id: Number(row.id ?? 0),
      slug: asString(row.slug),
      name: asString(row.canonical_name),
      className: asString(row.peptide_class) || "Peptide reference entry",
      aliases: asArray(row.peptide_aliases)
        .map((aliasRow) => asString(asRecord(aliasRow)?.alias))
        .filter(Boolean)
    }))
    .filter((row) => row.id > 0 && row.slug && row.name);
}

async function findOrCreateCitationId(
  supabase: SupabaseClient,
  sourceUrl: string,
  sourceTitle: string,
  publishedAt: string
): Promise<number> {
  const { data: existingRows, error: existingError } = await supabase
    .from("citations")
    .select("id,source_title")
    .eq("source_url", sourceUrl)
    .eq("published_at", publishedAt)
    .order("id", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = asArray(existingRows)[0];
  const existingId = Number(asRecord(existing)?.id ?? 0);
  if (existingId) {
    return existingId;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("citations")
    .insert({
      source_url: sourceUrl,
      source_title: sourceTitle || null,
      published_at: publishedAt
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed inserting citation.");
  }
  return Number(inserted.id);
}

async function upsertDosingEntry(
  supabase: SupabaseClient,
  peptideId: number,
  jurisdictionId: number,
  dosing: GeneratedContent["dosing"]
) {
  const { data: existingRows, error: existingError } = await supabase
    .from("peptide_dosing_entries")
    .select("id,context")
    .eq("peptide_id", peptideId)
    .eq("jurisdiction_id", jurisdictionId)
    .order("id", { ascending: true });

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload = {
    peptide_id: peptideId,
    jurisdiction_id: jurisdictionId,
    context: dosing.context,
    population: dosing.population,
    route: dosing.route,
    starting_dose: dosing.startingDose,
    maintenance_dose: dosing.maintenanceDose,
    frequency: dosing.frequency,
    notes: dosing.notes
  };

  const preferred = asArray(existingRows)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .find((entry) => asString(entry.context) === dosing.context);
  const fallback = asArray(existingRows)[0];
  const targetId = Number(asRecord(preferred ?? fallback)?.id ?? 0);

  if (targetId > 0) {
    const { error } = await supabase.from("peptide_dosing_entries").update(payload).eq("id", targetId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("peptide_dosing_entries").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

function ensureEvidenceGrade(value: EvidenceGrade): EvidenceGrade {
  if (value === "A" || value === "B" || value === "C" || value === "D" || value === "I") {
    return value;
  }
  return "I";
}

export async function enrichPeptideContent(
  supabase: SupabaseClient,
  options?: EnrichmentOptions
): Promise<EnrichmentResult> {
  const peptides = await loadPeptides(supabase, options);
  const jurisdictionIdByCode = await ensureJurisdictions(supabase);
  const usJurisdictionId = jurisdictionIdByCode.get("US");
  if (!usJurisdictionId) {
    throw new Error("US jurisdiction missing.");
  }

  const useCaseIdCache = new Map<string, number>();
  const delayMs = Math.max(0, Number(options?.delayMs ?? 110));

  let peptidesUpdated = 0;
  let profileUpdates = 0;
  let useCaseUpdates = 0;
  let safetyUpdates = 0;
  let dosingUpdates = 0;
  let claimUpdates = 0;
  let failures = 0;
  const sourceHits: EnrichmentSourceHits = {
    openFda: 0,
    pubChem: 0,
    chembl: 0,
    clinicalTrials: 0,
    pubMed: 0
  };

  for (const peptide of peptides) {
    try {
      const source = await collectSourceBundle(peptide.name, peptide.aliases);
      if (source.openFda.found) sourceHits.openFda += 1;
      if (source.pubChem.found) sourceHits.pubChem += 1;
      if (source.chembl.found) sourceHits.chembl += 1;
      if (source.clinicalTrials.total > 0) sourceHits.clinicalTrials += 1;
      if (source.pubMed.count > 0) sourceHits.pubMed += 1;

      const generated = generateContent(peptide.name, peptide.className, source);

      const { error: profileError } = await supabase.from("peptide_profiles").upsert(
        {
          peptide_id: peptide.id,
          intro: generated.intro,
          mechanism: generated.mechanism,
          effectiveness_summary: generated.effectivenessSummary,
          long_description: generated.longDescription
        },
        { onConflict: "peptide_id" }
      );
      if (profileError) {
        throw new Error(profileError.message);
      }
      profileUpdates += 1;

      const { error: safetyError } = await supabase.from("peptide_safety_entries").upsert(
        {
          peptide_id: peptide.id,
          jurisdiction_id: usJurisdictionId,
          adverse_effects: generated.safety.adverseEffects,
          contraindications: generated.safety.contraindications,
          interactions: generated.safety.interactions,
          monitoring: generated.safety.monitoring
        },
        { onConflict: "peptide_id,jurisdiction_id" }
      );
      if (safetyError) {
        throw new Error(safetyError.message);
      }
      safetyUpdates += 1;

      await upsertDosingEntry(supabase, peptide.id, usJurisdictionId, generated.dosing);
      dosingUpdates += 1;

      const targetStatus = generated.usStatus;
      const { error: clearStatusError } = await supabase
        .from("peptide_regulatory_status")
        .delete()
        .eq("peptide_id", peptide.id)
        .eq("jurisdiction_id", usJurisdictionId)
        .neq("status", targetStatus);
      if (clearStatusError) {
        throw new Error(clearStatusError.message);
      }
      const { error: upsertStatusError } = await supabase.from("peptide_regulatory_status").upsert(
        {
          peptide_id: peptide.id,
          jurisdiction_id: usJurisdictionId,
          status: targetStatus,
          notes:
            targetStatus === "US_FDA_APPROVED"
              ? "Derived from openFDA label match during external-source enrichment."
              : "No openFDA US label match found during external-source enrichment."
        },
        { onConflict: "peptide_id,jurisdiction_id,status" }
      );
      if (upsertStatusError) {
        throw new Error(upsertStatusError.message);
      }

      for (const useCase of generated.useCases) {
        let useCaseId = useCaseIdCache.get(useCase.slug);
        if (!useCaseId) {
          const { data: useCaseRow, error: useCaseError } = await supabase
            .from("use_cases")
            .upsert({ slug: useCase.slug, name: useCase.name }, { onConflict: "slug" })
            .select("id")
            .single();
          if (useCaseError || !useCaseRow?.id) {
            throw new Error(useCaseError?.message ?? `Failed to resolve use case ${useCase.slug}`);
          }
          useCaseId = Number(useCaseRow.id);
          useCaseIdCache.set(useCase.slug, useCaseId);
        }

        const { error: useCaseUpsertError } = await supabase.from("peptide_use_cases").upsert(
          {
            peptide_id: peptide.id,
            use_case_id: useCaseId,
            jurisdiction_id: usJurisdictionId,
            evidence_grade: ensureEvidenceGrade(useCase.evidenceGrade),
            consumer_summary: useCase.consumerSummary,
            clinical_summary: useCase.clinicalSummary
          },
          { onConflict: "peptide_id,use_case_id,jurisdiction_id" }
        );
        if (useCaseUpsertError) {
          throw new Error(useCaseUpsertError.message);
        }
        useCaseUpdates += 1;
      }

      const hasNonEvidenceUseCase = generated.useCases.some((entry) => entry.slug !== "evidence-tracking");
      if (hasNonEvidenceUseCase) {
        const { data: evidenceUseCaseRow } = await supabase
          .from("use_cases")
          .select("id")
          .eq("slug", "evidence-tracking")
          .maybeSingle();
        const evidenceUseCaseId = Number(evidenceUseCaseRow?.id ?? 0);
        if (evidenceUseCaseId) {
          await supabase
            .from("peptide_use_cases")
            .delete()
            .eq("peptide_id", peptide.id)
            .eq("jurisdiction_id", usJurisdictionId)
            .eq("use_case_id", evidenceUseCaseId);
        }
      }

      const { error: deleteClaimsError } = await supabase
        .from("peptide_claims")
        .delete()
        .eq("peptide_id", peptide.id)
        .in("section", ENRICHMENT_CLAIM_SECTIONS);
      if (deleteClaimsError) {
        throw new Error(deleteClaimsError.message);
      }

      for (const claim of generated.claims) {
        if (!claim.sourceUrl || !claim.claimText) {
          continue;
        }
        const citationId = await findOrCreateCitationId(supabase, claim.sourceUrl, claim.sourceTitle, claim.publishedAt);
        const { error: claimError } = await supabase.from("peptide_claims").insert({
          peptide_id: peptide.id,
          section: claim.section,
          claim_text: claim.claimText,
          evidence_grade: claim.evidenceGrade,
          citation_id: citationId
        });
        if (claimError) {
          throw new Error(claimError.message);
        }
        claimUpdates += 1;
      }

      peptidesUpdated += 1;
      await sleep(delayMs);
    } catch {
      failures += 1;
    }
  }

  return {
    peptidesScanned: peptides.length,
    peptidesUpdated,
    profileUpdates,
    useCaseUpdates,
    safetyUpdates,
    dosingUpdates,
    claimUpdates,
    failures,
    sourceHits
  };
}
