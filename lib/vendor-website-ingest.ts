import type { SupabaseClient } from "@supabase/supabase-js";

type VendorSeed = {
  slug: string;
  name: string;
  websiteUrl: string;
  description: string;
  features: string[];
  trustSignals: string[];
  regions: string[];
  sourceUrls: string[];
  fallbackPeptides: string[];
  isAffiliate?: boolean;
};

type KnownPeptide = {
  id: number;
  slug: string;
  name: string;
  className: string;
};

type VendorCatalogIngestResult = {
  vendorsProcessed: number;
  vendorsCreated: number;
  listingsUpserted: number;
  peptidesCreated: number;
  sourcePagesFetched: number;
  sourcePagesFailed: number;
};

const JURISDICTION_CODES = ["US", "EU", "UK", "CA", "AU"] as const;

const PEPTIDE_CLASS_FALLBACK = "Commercial peptide listing";
const BLOCKED_VENDOR_SLUGS = new Set(["unknown-source-vendor"]);
const BLOCKED_VENDOR_NAMES = new Set(["unknown source vendor"]);

const TRUST_SIGNAL_WEIGHT: Record<string, number> = {
  coa_published: 0.95,
  third_party_testing: 1.0,
  cold_chain_policy: 0.65,
  lot_tracking: 0.55,
  transparent_pricing: 0.35,
  manufacturer_labeling: 0.9,
  prescription_required: 0.8,
  licensed_pharmacy_network: 0.95,
  regulatory_disclosures: 0.7,
  clinic_medical_screening: 0.7,
  shipping_policy_disclosed: 0.4
};

const COMMON_PEPTIDE_NAMES = [
  "Semaglutide",
  "Tirzepatide",
  "Retatrutide",
  "Cagrilintide",
  "Liraglutide",
  "Dulaglutide",
  "Exenatide",
  "Lixisenatide",
  "BPC-157",
  "TB-500",
  "GHK-Cu",
  "MOTS-c",
  "Ipamorelin",
  "CJC-1295",
  "Tesamorelin",
  "Sermorelin",
  "Hexarelin",
  "AOD-9604",
  "Kisspeptin",
  "PT-141",
  "Selank",
  "Semax",
  "Thymosin Alpha-1",
  "Thymosin Beta-4",
  "Oxytocin",
  "Vasopressin",
  "Terlipressin",
  "Leuprolide",
  "Triptorelin",
  "Goserelin",
  "Calcitonin",
  "Eptifibatide",
  "Insulin Lispro",
  "Insulin Aspart",
  "Insulin Glargine",
  "Insulin Degludec",
  "Insulin Detemir",
  "Human Insulin"
];

export const VENDOR_SEEDS: VendorSeed[] = [
  {
    slug: "peptide-sciences",
    name: "Peptide Sciences",
    websiteUrl: "https://www.peptidesciences.com",
    description:
      "Research peptide supplier with broad catalog coverage and lot-level quality documentation references.",
    features: ["Wide research peptide catalog", "Batch-level product pages", "International shipping options"],
    trustSignals: ["coa_published", "third_party_testing", "shipping_policy_disclosed"],
    regions: ["US", "GLOBAL"],
    sourceUrls: ["https://www.peptidesciences.com/collections/all"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "Cagrilintide", "BPC-157", "TB-500", "GHK-Cu"]
  },
  {
    slug: "biobond-peptides",
    name: "BioBond Peptides",
    websiteUrl: "https://biobondpeptides.com",
    description: "Commercial peptide storefront focused on research-use peptide compounds and blends.",
    features: ["Dedicated peptide category pages", "Bundle options", "Site-level shipping and policy pages"],
    trustSignals: ["coa_published", "shipping_policy_disclosed", "transparent_pricing"],
    regions: ["US"],
    sourceUrls: ["https://biobondpeptides.com/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "Ipamorelin", "CJC-1295"]
  },
  {
    slug: "peptides-lab",
    name: "Peptides Lab",
    websiteUrl: "https://peptideslab.com",
    description: "Online peptide marketplace with research compound listing pages and category navigation.",
    features: ["Research compound catalog", "Peptide-focused storefront", "Discount/bundle promotions"],
    trustSignals: ["coa_published", "shipping_policy_disclosed", "transparent_pricing"],
    regions: ["US", "GLOBAL"],
    sourceUrls: ["https://peptideslab.com/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "Cagrilintide", "BPC-157", "TB-500"]
  },
  {
    slug: "peptide-warehouse",
    name: "Peptide Warehouse",
    websiteUrl: "https://peptide-warehouse.com",
    description: "Research peptide supplier with catalog-style listings and frequent peptide blend entries.",
    features: ["Catalog-based peptide listings", "Blend formulations", "Order tracking pages"],
    trustSignals: ["coa_published", "shipping_policy_disclosed"],
    regions: ["US", "GLOBAL"],
    sourceUrls: ["https://peptide-warehouse.com/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "MOTS-c", "PT-141"]
  },
  {
    slug: "swiss-chems",
    name: "Swiss Chems",
    websiteUrl: "https://swisschems.is",
    description: "Research compound vendor with peptide product subcategory and batch-level product format.",
    features: ["Research chemicals and peptides", "Global order flow", "Product-specific data pages"],
    trustSignals: ["coa_published", "third_party_testing", "shipping_policy_disclosed"],
    regions: ["GLOBAL"],
    sourceUrls: ["https://swisschems.is/product-category/peptides/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "CJC-1295", "Ipamorelin"]
  },
  {
    slug: "core-peptides",
    name: "Core Peptides",
    websiteUrl: "https://corepeptides.com",
    description: "US-focused peptide supplier with product pages centered on commonly requested research peptides.",
    features: ["US fulfillment emphasis", "Peptide-specific storefront", "Subscription/discount options"],
    trustSignals: ["coa_published", "shipping_policy_disclosed", "lot_tracking"],
    regions: ["US"],
    sourceUrls: ["https://corepeptides.com/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "BPC-157", "TB-500", "PT-141"]
  },
  {
    slug: "limitless-life-nootropics",
    name: "Limitless Life Nootropics",
    websiteUrl: "https://limitlesslifenootropics.com",
    description: "Supplement and peptide retailer with a dedicated peptide and bioregulator category.",
    features: ["Peptide and nootropic storefront", "Frequent stock rotation", "US-based checkout flow"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing"],
    regions: ["US"],
    sourceUrls: ["https://limitlesslifenootropics.com/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Cagrilintide", "BPC-157", "TB-500", "GHK-Cu"]
  },
  {
    slug: "umbrella-labs",
    name: "Umbrella Labs",
    websiteUrl: "https://umbrellalabs.is",
    description: "Research-use compound vendor with peptide-focused catalog entries and global access model.",
    features: ["Research-only product labeling", "Global checkout", "Category-level peptide listings"],
    trustSignals: ["coa_published", "shipping_policy_disclosed", "research_use_disclaimer"],
    regions: ["GLOBAL"],
    sourceUrls: ["https://umbrellalabs.is/product-category/peptides/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "BPC-157", "TB-500", "CJC-1295"]
  },
  {
    slug: "amino-pure-canada",
    name: "Amino Pure Canada",
    websiteUrl: "https://aminopurecanada.ca",
    description: "Canadian peptide supplier with domestic shipping and peptide-specific product pages.",
    features: ["Canada-focused fulfillment", "Peptide category navigation", "Domestic shipping policies"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing"],
    regions: ["CA"],
    sourceUrls: ["https://aminopurecanada.ca/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "PT-141"]
  },
  {
    slug: "canada-peptide",
    name: "Canada Peptide",
    websiteUrl: "https://canadapep.ca",
    description: "Canada-based peptide vendor with product pages centered on injectable and lyophilized peptides.",
    features: ["Canadian storefront", "Peptide-specific catalog", "Regional delivery options"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing"],
    regions: ["CA"],
    sourceUrls: ["https://canadapep.ca/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "BPC-157", "TB-500"]
  },
  {
    slug: "nexpept",
    name: "NexPept",
    websiteUrl: "https://nexpept.ca",
    description: "Canadian peptide listing site providing catalog-style access to common peptide compounds.",
    features: ["Canada-targeted catalog", "Peptide product index", "Updated inventory pages"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing"],
    regions: ["CA"],
    sourceUrls: ["https://nexpept.ca/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Cagrilintide", "BPC-157", "TB-500", "GHK-Cu"]
  },
  {
    slug: "performance-peptides-canada",
    name: "Performance Peptides Canada",
    websiteUrl: "https://performancepeptidescanada.ca",
    description: "Canadian peptide vendor featuring peptide products and related support compounds.",
    features: ["CA-focused peptide catalog", "Research compound bundles", "Domestic shipping pages"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing"],
    regions: ["CA"],
    sourceUrls: ["https://performancepeptidescanada.ca/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "MOTS-c", "PT-141"]
  },
  {
    slug: "peptide-shark-uk",
    name: "Peptide Shark UK",
    websiteUrl: "https://peptide-shark.co.uk",
    description: "UK-based peptide storefront with a broad research peptide category and domestic UK logistics.",
    features: ["UK domestic shipping", "Peptide category pages", "Research-use catalog format"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing", "research_use_disclaimer"],
    regions: ["UK"],
    sourceUrls: ["https://peptide-shark.co.uk/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Retatrutide", "BPC-157", "TB-500"]
  },
  {
    slug: "peptide-shop-uk",
    name: "Peptide Shop UK",
    websiteUrl: "https://peptideshopuk.co.uk",
    description: "UK peptide supplier with category-level listings for common metabolic and recovery peptides.",
    features: ["UK peptide catalog", "Collection-style product pages", "Regional checkout"],
    trustSignals: ["shipping_policy_disclosed", "transparent_pricing", "research_use_disclaimer"],
    regions: ["UK"],
    sourceUrls: ["https://peptideshopuk.co.uk/collections/peptides"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "BPC-157", "TB-500", "Ipamorelin", "CJC-1295"]
  },
  {
    slug: "grow-sciences",
    name: "GROW Sciences",
    websiteUrl: "https://growscience.co",
    description: "Supplier specializing in synthesis and cosmetic/biotech peptides with global storefront access.",
    features: ["Peptide synthesis orientation", "Broader peptide classes", "International supply model"],
    trustSignals: ["coa_published", "third_party_testing", "shipping_policy_disclosed"],
    regions: ["GLOBAL"],
    sourceUrls: ["https://growscience.co/collections/peptides"],
    fallbackPeptides: ["GHK-Cu", "Palmitoyl Pentapeptide-4", "Semaglutide", "Tirzepatide"]
  },
  {
    slug: "novo-nordisk",
    name: "Novo Nordisk",
    websiteUrl: "https://www.novonordisk.com",
    description: "Global biopharmaceutical manufacturer for multiple approved peptide and insulin therapies.",
    features: ["Approved product labeling", "Regulatory disclosure systems", "Pharmacovigilance processes"],
    trustSignals: ["manufacturer_labeling", "regulatory_disclosures", "lot_tracking"],
    regions: ["US", "EU", "UK", "CA", "AU"],
    sourceUrls: ["https://www.novonordisk.com/our-products.html"],
    fallbackPeptides: ["Semaglutide", "Liraglutide", "Insulin Aspart", "Insulin Degludec", "Human Insulin"]
  },
  {
    slug: "eli-lilly",
    name: "Eli Lilly",
    websiteUrl: "https://www.lilly.com",
    description: "Global pharmaceutical manufacturer with approved incretin and insulin peptide therapies.",
    features: ["Regulated prescription products", "US and non-US product documentation", "Safety reporting infrastructure"],
    trustSignals: ["manufacturer_labeling", "regulatory_disclosures", "lot_tracking"],
    regions: ["US", "EU", "UK", "CA", "AU"],
    sourceUrls: ["https://www.lilly.com/products"],
    fallbackPeptides: ["Tirzepatide", "Dulaglutide", "Insulin Lispro"]
  },
  {
    slug: "sanofi",
    name: "Sanofi",
    websiteUrl: "https://www.sanofi.com",
    description: "Global pharmaceutical manufacturer with insulin and peptide-based metabolic therapies.",
    features: ["Global regulatory framework", "Product documentation portals", "Pharmacovigilance systems"],
    trustSignals: ["manufacturer_labeling", "regulatory_disclosures", "lot_tracking"],
    regions: ["US", "EU", "UK", "CA", "AU"],
    sourceUrls: ["https://www.sanofi.com/en/our-science/our-products"],
    fallbackPeptides: ["Lixisenatide", "Insulin Glargine", "Human Insulin"]
  },
  {
    slug: "astrazeneca",
    name: "AstraZeneca",
    websiteUrl: "https://www.astrazeneca.com",
    description: "Global pharmaceutical company with peptide-class legacy products in metabolic care.",
    features: ["Regulatory documentation", "Product safety resources", "Global compliance infrastructure"],
    trustSignals: ["manufacturer_labeling", "regulatory_disclosures"],
    regions: ["US", "EU", "UK", "CA", "AU"],
    sourceUrls: ["https://www.astrazeneca.com/our-therapy-areas/cardiovascular-renal-metabolism.html"],
    fallbackPeptides: ["Exenatide"]
  },
  {
    slug: "ro-body",
    name: "Ro Body",
    websiteUrl: "https://ro.co/weight-loss/",
    description: "Telehealth provider with obesity-treatment care pathways including peptide-based GLP-1 options.",
    features: ["Licensed telehealth prescribers", "US care coordination", "Medication and follow-up workflows"],
    trustSignals: ["licensed_pharmacy_network", "clinic_medical_screening", "prescription_required"],
    regions: ["US"],
    sourceUrls: ["https://ro.co/weight-loss/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Liraglutide"]
  },
  {
    slug: "hims-weight-loss",
    name: "Hims Weight Loss",
    websiteUrl: "https://www.hims.com/weight-loss",
    description: "US telehealth service with physician-led obesity treatment options including GLP-1 therapies.",
    features: ["US telehealth intake", "Prescription care pathways", "Ongoing check-in model"],
    trustSignals: ["licensed_pharmacy_network", "clinic_medical_screening", "prescription_required"],
    regions: ["US"],
    sourceUrls: ["https://www.hims.com/weight-loss"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Liraglutide"]
  },
  {
    slug: "ivim-health",
    name: "IVIM Health",
    websiteUrl: "https://www.ivimhealth.com",
    description: "US digital weight-management clinic network with peptide-based obesity treatment offerings.",
    features: ["Medical screening model", "Medication pathway support", "Lifestyle coaching integration"],
    trustSignals: ["licensed_pharmacy_network", "clinic_medical_screening", "prescription_required"],
    regions: ["US"],
    sourceUrls: ["https://www.ivimhealth.com/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide"]
  },
  {
    slug: "mochi-health",
    name: "Mochi Health",
    websiteUrl: "https://joinmochi.com",
    description: "Telehealth obesity clinic with prescription-based GLP-1 treatment programs in multiple US states.",
    features: ["Provider-led screening", "Membership care model", "Medication support workflow"],
    trustSignals: ["licensed_pharmacy_network", "clinic_medical_screening", "prescription_required"],
    regions: ["US"],
    sourceUrls: ["https://joinmochi.com/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide"]
  },
  {
    slug: "henry-meds",
    name: "Henry Meds",
    websiteUrl: "https://henrymeds.com",
    description: "US telehealth platform offering clinician-guided metabolic treatment programs including GLP-1 options.",
    features: ["Online medical intake", "Prescription-required pathways", "National telehealth coverage"],
    trustSignals: ["licensed_pharmacy_network", "clinic_medical_screening", "prescription_required"],
    regions: ["US"],
    sourceUrls: ["https://henrymeds.com/"],
    fallbackPeptides: ["Semaglutide", "Tirzepatide", "Liraglutide"]
  }
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isBlockedVendorPlaceholder(slug: string, name: string): boolean {
  const normalizedSlug = slugify(slug);
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  return BLOCKED_VENDOR_SLUGS.has(normalizedSlug) || BLOCKED_VENDOR_NAMES.has(normalizedName);
}

function titleCase(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeVendorScore(trustSignals: string[], peptidesDetected: number): { rating: number | null; confidence: number | null } {
  if (trustSignals.length === 0) {
    return { rating: null, confidence: null };
  }

  const points = trustSignals.reduce((sum, signal) => sum + (TRUST_SIGNAL_WEIGHT[signal] ?? 0.3), 0);
  const listingScore = Math.min(1.2, peptidesDetected * 0.06);
  const rawRating = 2.2 + points * 0.45 + listingScore;
  const rating = Math.max(0, Math.min(5, Number(rawRating.toFixed(1))));
  const rawConfidence = 0.42 + trustSignals.length * 0.06 + Math.min(0.25, peptidesDetected * 0.01);
  const confidence = Number(Math.max(0, Math.min(0.98, rawConfidence)).toFixed(2));

  return { rating, confidence };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "PeptideDB-IngestionBot/1.0 (+https://peptidedb.vercel.app)"
      },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureJurisdictions(supabase: SupabaseClient) {
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
}

async function loadJurisdictionIds(supabase: SupabaseClient): Promise<Map<string, number>> {
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

function collectCommonPeptideNames(seeds: VendorSeed[]): string[] {
  const names = new Set<string>(COMMON_PEPTIDE_NAMES);
  for (const seed of seeds) {
    for (const name of seed.fallbackPeptides) {
      names.add(titleCase(name));
    }
  }
  return Array.from(names);
}

async function loadKnownPeptides(supabase: SupabaseClient): Promise<{
  peptideByNorm: Map<string, KnownPeptide>;
  namesForDetection: string[];
}> {
  const [{ data: peptideRows, error: peptideError }, { data: aliasRows, error: aliasError }] = await Promise.all([
    supabase.from("peptides").select("id,slug,canonical_name,peptide_class"),
    supabase.from("peptide_aliases").select("peptide_id,alias")
  ]);

  if (peptideError || !peptideRows) {
    throw new Error(peptideError?.message ?? "Failed loading peptides.");
  }
  if (aliasError) {
    throw new Error(aliasError.message);
  }

  const peptideById = new Map<number, KnownPeptide>();
  const peptideByNorm = new Map<string, KnownPeptide>();

  for (const row of peptideRows) {
    const id = Number(row.id ?? 0);
    const slug = asString(row.slug);
    const name = asString(row.canonical_name);
    if (!id || !slug || !name) {
      continue;
    }
    const peptide = {
      id,
      slug,
      name,
      className: asString(row.peptide_class) || PEPTIDE_CLASS_FALLBACK
    } satisfies KnownPeptide;
    peptideById.set(id, peptide);
    peptideByNorm.set(normalizeToken(name), peptide);
  }

  for (const aliasRow of aliasRows ?? []) {
    const peptideId = Number(aliasRow.peptide_id ?? 0);
    const alias = asString(aliasRow.alias);
    if (!peptideId || !alias) {
      continue;
    }
    const peptide = peptideById.get(peptideId);
    if (!peptide) {
      continue;
    }
    peptideByNorm.set(normalizeToken(alias), peptide);
  }

  const namesForDetection = Array.from(new Set([...peptideByNorm.keys(), ...collectCommonPeptideNames(VENDOR_SEEDS).map(normalizeToken)]))
    .filter((name) => name.length > 2)
    .sort((a, b) => b.length - a.length);

  return {
    peptideByNorm,
    namesForDetection
  };
}

function detectPeptideNamesFromText(text: string, namesForDetection: string[]): string[] {
  const normalizedText = ` ${normalizeToken(text)} `;
  const found = new Set<string>();
  for (const normalizedName of namesForDetection) {
    if (!normalizedName) {
      continue;
    }
    if (normalizedText.includes(` ${normalizedName} `)) {
      found.add(normalizedName);
    }
  }
  return Array.from(found);
}

async function ensurePeptide(
  supabase: SupabaseClient,
  peptideByNorm: Map<string, KnownPeptide>,
  normalizedName: string,
  jurisdictionIds: Map<string, number>
): Promise<KnownPeptide> {
  const existing = peptideByNorm.get(normalizedName);
  if (existing) {
    return existing;
  }

  const canonicalName = titleCase(normalizedName);
  const slug = slugify(canonicalName);
  if (!slug || !canonicalName) {
    throw new Error(`Invalid peptide name: ${normalizedName}`);
  }

  const { data: peptideRow, error: peptideError } = await supabase
    .from("peptides")
    .upsert(
      {
        slug,
        canonical_name: canonicalName,
        peptide_class: PEPTIDE_CLASS_FALLBACK,
        is_published: true
      },
      { onConflict: "slug" }
    )
    .select("id,slug,canonical_name,peptide_class")
    .single();

  if (peptideError || !peptideRow?.id) {
    throw new Error(peptideError?.message ?? `Failed to upsert peptide: ${canonicalName}`);
  }

  const peptide: KnownPeptide = {
    id: Number(peptideRow.id),
    slug: asString(peptideRow.slug),
    name: asString(peptideRow.canonical_name),
    className: asString(peptideRow.peptide_class) || PEPTIDE_CLASS_FALLBACK
  };

  await supabase.from("peptide_profiles").upsert(
    {
      peptide_id: peptide.id,
      intro: `${peptide.name} is listed by commercial vendors and is currently tracked as an evidence-first reference entry.`,
      mechanism: `${peptide.name} mechanism summary requires source-level curation.`,
      effectiveness_summary: "Effectiveness evidence requires curated review before treatment-level interpretation.",
      long_description:
        "This peptide page was created from vendor listing ingestion and should be interpreted as catalog presence, not proof of clinical effectiveness."
    },
    { onConflict: "peptide_id" }
  );

  const statusRows = [...JURISDICTION_CODES]
    .map((code) => {
      const jurisdictionId = jurisdictionIds.get(code);
      if (!jurisdictionId) {
        return null;
      }
      return {
        peptide_id: peptide.id,
        jurisdiction_id: jurisdictionId,
        status: "INVESTIGATIONAL",
        notes: "Auto-created from vendor listing ingestion."
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (statusRows.length > 0) {
    await supabase.from("peptide_regulatory_status").upsert(statusRows, {
      onConflict: "peptide_id,jurisdiction_id,status"
    });
  }

  peptideByNorm.set(normalizedName, peptide);
  return peptide;
}

async function upsertVendorProfile(
  supabase: SupabaseClient,
  vendorId: number,
  seed: VendorSeed
) {
  const { error } = await supabase.from("vendor_profiles").upsert(
    {
      vendor_id: vendorId,
      description: seed.description,
      features: seed.features,
      trust_signals: seed.trustSignals,
      source_urls: seed.sourceUrls,
      regions: seed.regions
    },
    { onConflict: "vendor_id" }
  );

  if (error) {
    if (error.message.includes("vendor_profiles")) {
      return;
    }
    throw new Error(error.message);
  }
}

export function getVendorSeedMetadata(slug: string): {
  description: string;
  features: string[];
  trustSignals: string[];
  sourceUrls: string[];
  regions: string[];
} | null {
  const match = VENDOR_SEEDS.find((seed) => seed.slug === slug);
  if (!match) {
    return null;
  }
  return {
    description: match.description,
    features: match.features,
    trustSignals: match.trustSignals,
    sourceUrls: match.sourceUrls,
    regions: match.regions
  };
}

async function upsertVendorVerifications(supabase: SupabaseClient, vendorId: number, trustSignals: string[]) {
  await supabase.from("vendor_verifications").delete().eq("vendor_id", vendorId);
  const rows = trustSignals.map((signal) => ({
    vendor_id: vendorId,
    verification_type: signal,
    value: "declared_by_vendor_profile",
    verified_at: new Date().toISOString()
  }));
  if (rows.length === 0) {
    return;
  }
  await supabase.from("vendor_verifications").insert(rows);
}

async function upsertVendorRatingSnapshot(
  supabase: SupabaseClient,
  vendorId: number,
  trustSignals: string[],
  peptidesDetected: number
) {
  const { rating, confidence } = computeVendorScore(trustSignals, peptidesDetected);

  await supabase.from("vendor_rating_snapshots").update({ is_current: false }).eq("vendor_id", vendorId).eq("is_current", true);

  await supabase.from("vendor_rating_snapshots").insert({
    vendor_id: vendorId,
    rating,
    confidence,
    method_version: "vendor_website_ingest_v1",
    reason_tags: trustSignals,
    is_current: true
  });
}

export async function ingestVendorWebsiteCatalog(supabase: SupabaseClient): Promise<VendorCatalogIngestResult> {
  await ensureJurisdictions(supabase);
  const jurisdictionIds = await loadJurisdictionIds(supabase);
  const { peptideByNorm, namesForDetection } = await loadKnownPeptides(supabase);

  let vendorsProcessed = 0;
  let vendorsCreated = 0;
  let listingsUpserted = 0;
  let peptidesCreated = 0;
  let sourcePagesFetched = 0;
  let sourcePagesFailed = 0;

  for (const seed of VENDOR_SEEDS) {
    if (isBlockedVendorPlaceholder(seed.slug, seed.name)) {
      continue;
    }
    vendorsProcessed += 1;
    const { data: vendorBefore } = await supabase.from("vendors").select("id").eq("slug", seed.slug).maybeSingle();
    const { data: vendorRow, error: vendorError } = await supabase
      .from("vendors")
      .upsert(
        {
          slug: seed.slug,
          name: seed.name,
          website_url: seed.websiteUrl,
          is_published: true
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (vendorError || !vendorRow?.id) {
      throw new Error(vendorError?.message ?? `Failed upserting vendor ${seed.slug}`);
    }
    const vendorId = Number(vendorRow.id);

    if (!vendorBefore?.id) {
      vendorsCreated += 1;
    }

    await upsertVendorProfile(supabase, vendorId, seed);
    await upsertVendorVerifications(supabase, vendorId, seed.trustSignals);

    const normalizedDetected = new Set<string>(seed.fallbackPeptides.map((name) => normalizeToken(name)).filter(Boolean));

    for (const sourceUrl of seed.sourceUrls) {
      try {
        const html = await fetchHtml(sourceUrl);
        sourcePagesFetched += 1;
        const text = stripHtml(html);
        const detected = detectPeptideNamesFromText(text, namesForDetection);
        for (const hit of detected) {
          normalizedDetected.add(hit);
        }
      } catch {
        sourcePagesFailed += 1;
      }
    }

    const peptidesForVendor: KnownPeptide[] = [];
    for (const normalizedName of normalizedDetected) {
      const hadBefore = peptideByNorm.has(normalizedName);
      const peptide = await ensurePeptide(supabase, peptideByNorm, normalizedName, jurisdictionIds);
      if (!hadBefore) {
        peptidesCreated += 1;
      }
      peptidesForVendor.push(peptide);
    }

    for (const peptide of peptidesForVendor) {
      const { error: listingError } = await supabase.from("vendor_peptide_listings").upsert(
        {
          vendor_id: vendorId,
          peptide_id: peptide.id,
          is_affiliate: Boolean(seed.isAffiliate),
          affiliate_url: seed.isAffiliate ? seed.websiteUrl : null,
          product_url: seed.sourceUrls[0] ?? seed.websiteUrl
        },
        { onConflict: "vendor_id,peptide_id" }
      );
      if (listingError) {
        throw new Error(listingError.message);
      }
      listingsUpserted += 1;
    }

    await upsertVendorRatingSnapshot(supabase, vendorId, seed.trustSignals, peptidesForVendor.length);
  }

  return {
    vendorsProcessed,
    vendorsCreated,
    listingsUpserted,
    peptidesCreated,
    sourcePagesFetched,
    sourcePagesFailed
  };
}
