import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type AdminOption = {
  id: number;
  slug: string;
  name: string;
  isPublished?: boolean;
};

export type AdminPeptideDetail = {
  id: number;
  slug: string;
  canonicalName: string;
  sequence: string;
  peptideClass: string;
  isPublished: boolean;
  intro: string;
  mechanism: string;
  effectivenessSummary: string;
  longDescription: string;
};

export type AdminPeptideClaim = {
  id: number;
  section: string;
  claimText: string;
  evidenceGrade: string | null;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
};

export type AdminVendorDetail = {
  id: number;
  slug: string;
  name: string;
  websiteUrl: string;
  isPublished: boolean;
};

export type AdminDashboardData = {
  supabaseConfigured: boolean;
  peptides: AdminOption[];
  vendors: AdminOption[];
  jurisdictions: Array<{ code: string; name: string }>;
  useCases: Array<{ slug: string; name: string }>;
  selectedPeptide: AdminPeptideDetail | null;
  selectedPeptideClaims: AdminPeptideClaim[];
  selectedVendor: AdminVendorDetail | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function mapOption(row: unknown): AdminOption | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }
  const id = asNumber(record.id);
  const slug = asString(record.slug);
  const name = asString(record.canonical_name || record.name);
  if (!id || !slug || !name) {
    return null;
  }
  return {
    id,
    slug,
    name,
    isPublished: asBoolean(record.is_published)
  };
}

function emptyDashboardData(): AdminDashboardData {
  return {
    supabaseConfigured: false,
    peptides: [],
    vendors: [],
    jurisdictions: [],
    useCases: [],
    selectedPeptide: null,
    selectedPeptideClaims: [],
    selectedVendor: null
  };
}

export async function getAdminDashboardData(
  selectedPeptideSlug?: string,
  selectedVendorSlug?: string
): Promise<AdminDashboardData> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return emptyDashboardData();
  }

  const [
    peptidesResult,
    vendorsResult,
    jurisdictionsResult,
    useCasesResult,
    selectedPeptideResult,
    selectedVendorResult
  ] = await Promise.all([
    supabase.from("peptides").select("id,slug,canonical_name,is_published").order("canonical_name", { ascending: true }),
    supabase.from("vendors").select("id,slug,name,is_published").order("name", { ascending: true }),
    supabase.from("jurisdictions").select("code,name").order("code", { ascending: true }),
    supabase.from("use_cases").select("slug,name").order("name", { ascending: true }),
    selectedPeptideSlug
      ? supabase
          .from("peptides")
          .select(
            "id,slug,canonical_name,sequence,peptide_class,is_published,peptide_profiles(intro,mechanism,effectiveness_summary,long_description)"
          )
          .eq("slug", selectedPeptideSlug)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    selectedVendorSlug
      ? supabase.from("vendors").select("id,slug,name,website_url,is_published").eq("slug", selectedVendorSlug).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  const peptides = (peptidesResult.data ?? [])
    .map((row) => mapOption(row))
    .filter((row): row is AdminOption => row !== null);
  const vendors = (vendorsResult.data ?? [])
    .map((row) => mapOption(row))
    .filter((row): row is AdminOption => row !== null);

  const jurisdictions = (jurisdictionsResult.data ?? [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      code: asString(row.code),
      name: asString(row.name)
    }))
    .filter((row) => row.code && row.name);

  const useCases = (useCasesResult.data ?? [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      slug: asString(row.slug),
      name: asString(row.name)
    }))
    .filter((row) => row.slug && row.name);

  const selectedPeptideRecord = asRecord(selectedPeptideResult.data);
  const profile = Array.isArray(selectedPeptideRecord?.peptide_profiles)
    ? asRecord(selectedPeptideRecord?.peptide_profiles[0])
    : asRecord(selectedPeptideRecord?.peptide_profiles);

  const selectedPeptide =
    selectedPeptideRecord && selectedPeptideRecord.id
      ? {
          id: asNumber(selectedPeptideRecord.id),
          slug: asString(selectedPeptideRecord.slug),
          canonicalName: asString(selectedPeptideRecord.canonical_name),
          sequence: asString(selectedPeptideRecord.sequence),
          peptideClass: asString(selectedPeptideRecord.peptide_class),
          isPublished: asBoolean(selectedPeptideRecord.is_published),
          intro: asString(profile?.intro),
          mechanism: asString(profile?.mechanism),
          effectivenessSummary: asString(profile?.effectiveness_summary),
          longDescription: asString(profile?.long_description)
        }
      : null;

  let selectedPeptideClaims: AdminPeptideClaim[] = [];
  if (selectedPeptide?.id) {
    const { data: claimsData } = await supabase
      .from("peptide_claims")
      .select("id,section,claim_text,evidence_grade,citations(source_url,source_title,published_at)")
      .eq("peptide_id", selectedPeptide.id)
      .order("id", { ascending: false });

    selectedPeptideClaims = (claimsData ?? [])
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => row !== null)
      .map((row) => {
        const citation = Array.isArray(row.citations) ? asRecord(row.citations[0]) : asRecord(row.citations);
        return {
          id: asNumber(row.id),
          section: asString(row.section),
          claimText: asString(row.claim_text),
          evidenceGrade: asString(row.evidence_grade) || null,
          sourceUrl: asString(citation?.source_url),
          sourceTitle: asString(citation?.source_title),
          publishedAt: asString(citation?.published_at)
        };
      })
      .filter((claim) => claim.id > 0 && claim.section && claim.claimText && claim.sourceUrl);
  }

  const selectedVendorRecord = asRecord(selectedVendorResult.data);
  const selectedVendor =
    selectedVendorRecord && selectedVendorRecord.id
      ? {
          id: asNumber(selectedVendorRecord.id),
          slug: asString(selectedVendorRecord.slug),
          name: asString(selectedVendorRecord.name),
          websiteUrl: asString(selectedVendorRecord.website_url),
          isPublished: asBoolean(selectedVendorRecord.is_published)
        }
      : null;

  return {
    supabaseConfigured: true,
    peptides,
    vendors,
    jurisdictions,
    useCases,
    selectedPeptide,
    selectedPeptideClaims,
    selectedVendor
  };
}
