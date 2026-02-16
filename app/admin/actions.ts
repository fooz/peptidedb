"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { assertAdminAuth } from "@/lib/admin-auth";
import { ingestClinicalTrialsCatalog } from "@/lib/clinicaltrials-catalog-ingest";
import { ingestExpandedPeptideDataset } from "@/lib/expanded-dataset-ingest";
import { refreshLiveEvidenceClaims } from "@/lib/live-evidence-refresh";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function clean(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function parseBool(value: FormDataEntryValue | null): boolean {
  return String(value ?? "") === "on";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function redirectNotice(message: string, kind: "success" | "error" = "success") {
  redirect(`/admin?kind=${kind}&notice=${encodeURIComponent(message)}`);
}

function requireSupabaseAdmin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

function rethrowIfRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

async function getJurisdictionId(code: string): Promise<number> {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.from("jurisdictions").select("id").eq("code", code).maybeSingle();
  if (error || !data?.id) {
    throw new Error(`Jurisdiction not found: ${code}`);
  }
  return Number(data.id);
}

async function getUseCaseId(name: string, slugInput: string): Promise<number> {
  const supabase = requireSupabaseAdmin();
  const finalName = name.trim();
  const finalSlug = slugify(slugInput || finalName);
  if (!finalName || !finalSlug) {
    throw new Error("Use case name is required.");
  }

  const { data, error } = await supabase
    .from("use_cases")
    .upsert({ slug: finalSlug, name: finalName }, { onConflict: "slug" })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("Failed to save use case.");
  }
  return Number(data.id);
}

export async function upsertPeptideAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();

    const slugInput = clean(formData.get("slug"));
    const canonicalName = clean(formData.get("canonicalName"));
    const sequence = clean(formData.get("sequence"));
    const peptideClass = clean(formData.get("peptideClass"));
    const isPublished = parseBool(formData.get("isPublished"));

    const intro = clean(formData.get("intro"));
    const mechanism = clean(formData.get("mechanism"));
    const effectivenessSummary = clean(formData.get("effectivenessSummary"));
    const longDescription = clean(formData.get("longDescription"));

    const slug = slugify(slugInput || canonicalName);
    if (!slug || !canonicalName) {
      redirectNotice("Slug and canonical name are required.", "error");
    }

    const { data: peptide, error: peptideError } = await supabase
      .from("peptides")
      .upsert(
        {
          slug,
          canonical_name: canonicalName,
          sequence: sequence || null,
          peptide_class: peptideClass || null,
          is_published: isPublished
        },
        { onConflict: "slug" }
      )
      .select("id,slug")
      .single();

    if (peptideError || !peptide?.id) {
      throw new Error(peptideError?.message ?? "Failed to save peptide.");
    }

    const { error: profileError } = await supabase.from("peptide_profiles").upsert(
      {
        peptide_id: peptide.id,
        intro: intro || null,
        mechanism: mechanism || null,
        effectiveness_summary: effectivenessSummary || null,
        long_description: longDescription || null
      },
      { onConflict: "peptide_id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    redirect(`/admin?kind=success&notice=${encodeURIComponent("Peptide saved.")}&editPeptide=${encodeURIComponent(slug)}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save peptide.";
    redirectNotice(message, "error");
  }
}

export async function addUseCaseAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const peptideId = Number(clean(formData.get("peptideId")));
    const useCaseName = clean(formData.get("useCaseName"));
    const useCaseSlug = clean(formData.get("useCaseSlug"));
    const jurisdictionCode = clean(formData.get("jurisdiction"));
    const evidenceGrade = clean(formData.get("evidenceGrade"));
    const consumerSummary = clean(formData.get("consumerSummary"));
    const clinicalSummary = clean(formData.get("clinicalSummary"));

    if (!peptideId || !jurisdictionCode || !evidenceGrade || !useCaseName) {
      redirectNotice("Peptide, use case, jurisdiction, and evidence grade are required.", "error");
    }

    const jurisdictionId = await getJurisdictionId(jurisdictionCode);
    const useCaseId = await getUseCaseId(useCaseName, useCaseSlug);

    const { data: existing } = await supabase
      .from("peptide_use_cases")
      .select("id")
      .eq("peptide_id", peptideId)
      .eq("use_case_id", useCaseId)
      .eq("jurisdiction_id", jurisdictionId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("peptide_use_cases")
        .update({
          evidence_grade: evidenceGrade,
          consumer_summary: consumerSummary || null,
          clinical_summary: clinicalSummary || null
        })
        .eq("id", existing.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("peptide_use_cases").insert({
        peptide_id: peptideId,
        use_case_id: useCaseId,
        jurisdiction_id: jurisdictionId,
        evidence_grade: evidenceGrade,
        consumer_summary: consumerSummary || null,
        clinical_summary: clinicalSummary || null
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    redirectNotice("Use case entry saved.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save use case.";
    redirectNotice(message, "error");
  }
}

export async function addDosingAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const peptideId = Number(clean(formData.get("peptideId")));
    const jurisdictionCode = clean(formData.get("jurisdiction"));
    const context = clean(formData.get("context"));

    if (!peptideId || !jurisdictionCode || !context) {
      redirectNotice("Peptide, jurisdiction, and dosing context are required.", "error");
    }

    const jurisdictionId = await getJurisdictionId(jurisdictionCode);

    const payload = {
      peptide_id: peptideId,
      jurisdiction_id: jurisdictionId,
      context,
      population: clean(formData.get("population")) || null,
      route: clean(formData.get("route")) || null,
      starting_dose: clean(formData.get("startingDose")) || null,
      maintenance_dose: clean(formData.get("maintenanceDose")) || null,
      frequency: clean(formData.get("frequency")) || null,
      notes: clean(formData.get("notes")) || null
    };

    const { error } = await supabase.from("peptide_dosing_entries").insert(payload);
    if (error) {
      throw new Error(error.message);
    }

    redirectNotice("Dosing entry added.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to add dosing entry.";
    redirectNotice(message, "error");
  }
}

export async function upsertSafetyAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const peptideId = Number(clean(formData.get("peptideId")));
    const jurisdictionCode = clean(formData.get("jurisdiction"));
    if (!peptideId || !jurisdictionCode) {
      redirectNotice("Peptide and jurisdiction are required for safety.", "error");
    }
    const jurisdictionId = await getJurisdictionId(jurisdictionCode);

    const payload = {
      peptide_id: peptideId,
      jurisdiction_id: jurisdictionId,
      adverse_effects: clean(formData.get("adverseEffects")) || null,
      contraindications: clean(formData.get("contraindications")) || null,
      interactions: clean(formData.get("interactions")) || null,
      monitoring: clean(formData.get("monitoring")) || null
    };

    const { data: existing } = await supabase
      .from("peptide_safety_entries")
      .select("id")
      .eq("peptide_id", peptideId)
      .eq("jurisdiction_id", jurisdictionId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("peptide_safety_entries").update(payload).eq("id", existing.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("peptide_safety_entries").insert(payload);
      if (error) {
        throw new Error(error.message);
      }
    }

    redirectNotice("Safety entry saved.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save safety entry.";
    redirectNotice(message, "error");
  }
}

export async function addCitationClaimAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const peptideId = Number(clean(formData.get("peptideId")));
    const section = clean(formData.get("section"));
    const claimText = clean(formData.get("claimText"));
    const evidenceGrade = clean(formData.get("evidenceGrade"));
    const sourceUrl = clean(formData.get("sourceUrl"));
    const sourceTitle = clean(formData.get("sourceTitle"));
    const sourcePublishedAt = clean(formData.get("sourcePublishedAt"));
    const editPeptideSlug = clean(formData.get("editPeptideSlug"));

    if (!peptideId || !section || !claimText || !sourceUrl || !sourcePublishedAt) {
      redirectNotice(
        "Citation claim requires peptide, section, claim text, source URL, and source published date.",
        "error"
      );
    }

    const { data: citation, error: citationError } = await supabase
      .from("citations")
      .insert({
        source_url: sourceUrl,
        source_title: sourceTitle || null,
        published_at: sourcePublishedAt
      })
      .select("id")
      .single();

    if (citationError || !citation?.id) {
      throw new Error(citationError?.message ?? "Failed to create citation.");
    }

    const normalizedGrade = evidenceGrade || null;
    const { error: claimError } = await supabase.from("peptide_claims").insert({
      peptide_id: peptideId,
      section,
      claim_text: claimText,
      evidence_grade: normalizedGrade,
      citation_id: citation.id
    });

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (editPeptideSlug) {
      redirect(
        `/admin?kind=success&notice=${encodeURIComponent("Citation claim saved.")}&editPeptide=${encodeURIComponent(editPeptideSlug)}`
      );
    }

    redirectNotice("Citation claim saved.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save citation claim.";
    redirectNotice(message, "error");
  }
}

export async function deleteCitationClaimAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const claimId = Number(clean(formData.get("claimId")));
    const editPeptideSlug = clean(formData.get("editPeptideSlug"));

    if (!claimId) {
      redirectNotice("Claim id is required.", "error");
    }

    const { data: existingClaim, error: findError } = await supabase
      .from("peptide_claims")
      .select("citation_id")
      .eq("id", claimId)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }
    if (!existingClaim) {
      throw new Error("Claim not found.");
    }

    const citationId = Number(existingClaim.citation_id ?? 0);

    const { error: deleteClaimError } = await supabase.from("peptide_claims").delete().eq("id", claimId);
    if (deleteClaimError) {
      throw new Error(deleteClaimError.message);
    }

    if (citationId) {
      const { count, error: citationCountError } = await supabase
        .from("peptide_claims")
        .select("id", { count: "exact", head: true })
        .eq("citation_id", citationId);

      if (!citationCountError && (count ?? 0) === 0) {
        await supabase.from("citations").delete().eq("id", citationId);
      }
    }

    if (editPeptideSlug) {
      redirect(
        `/admin?kind=success&notice=${encodeURIComponent("Citation claim removed.")}&editPeptide=${encodeURIComponent(editPeptideSlug)}`
      );
    }
    redirectNotice("Citation claim removed.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to remove citation claim.";
    redirectNotice(message, "error");
  }
}

export async function ingestExpandedDatasetAction() {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const result = await ingestExpandedPeptideDataset(supabase);
    redirectNotice(`Expanded ingest complete: ${result.processed} of ${result.total} peptides processed.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to run expanded ingest.";
    redirectNotice(message, "error");
  }
}

export async function refreshLiveEvidenceAction() {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const result = await refreshLiveEvidenceClaims(supabase, { batchSize: 12, sourcesPerPeptide: 2 });
    redirectNotice(
      `Live refresh complete: ${result.peptidesScanned} peptides scanned, ${result.claimsUpserted} claims updated, ${result.peptidesWithNoHits} no-hits, ${result.failures} failed.`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to refresh live evidence.";
    redirectNotice(message, "error");
  }
}

export async function ingestClinicalTrialsCatalogAction() {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const result = await ingestClinicalTrialsCatalog(supabase, { target: 320, maxPages: 8 });
    redirectNotice(
      `ClinicalTrials catalog ingest complete: ${result.inserted} new peptides inserted, ${result.skippedExisting} already existed, ${result.candidatesFound} candidates found from ${result.scannedStudies} studies.`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to ingest ClinicalTrials peptide catalog.";
    redirectNotice(message, "error");
  }
}

export async function upsertVendorAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const slugInput = clean(formData.get("slug"));
    const name = clean(formData.get("name"));
    const websiteUrl = clean(formData.get("websiteUrl"));
    const isPublished = parseBool(formData.get("isPublished"));

    const slug = slugify(slugInput || name);
    if (!slug || !name) {
      redirectNotice("Vendor name and slug are required.", "error");
    }

    const { error } = await supabase.from("vendors").upsert(
      {
        slug,
        name,
        website_url: websiteUrl || null,
        is_published: isPublished
      },
      { onConflict: "slug" }
    );

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/admin?kind=success&notice=${encodeURIComponent("Vendor saved.")}&editVendor=${encodeURIComponent(slug)}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save vendor.";
    redirectNotice(message, "error");
  }
}

export async function upsertVendorListingAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const vendorId = Number(clean(formData.get("vendorId")));
    const peptideId = Number(clean(formData.get("peptideId")));
    const isAffiliate = parseBool(formData.get("isAffiliate"));
    const affiliateUrl = clean(formData.get("affiliateUrl"));
    const productUrl = clean(formData.get("productUrl"));

    if (!vendorId || !peptideId) {
      redirectNotice("Vendor and peptide are required for listing.", "error");
    }

    const { data: existing } = await supabase
      .from("vendor_peptide_listings")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("peptide_id", peptideId)
      .maybeSingle();

    const payload = {
      vendor_id: vendorId,
      peptide_id: peptideId,
      is_affiliate: isAffiliate,
      affiliate_url: affiliateUrl || null,
      product_url: productUrl || null
    };

    if (existing?.id) {
      const { error } = await supabase.from("vendor_peptide_listings").update(payload).eq("id", existing.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("vendor_peptide_listings").insert(payload);
      if (error) {
        throw new Error(error.message);
      }
    }

    redirectNotice("Vendor listing saved.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save vendor listing.";
    redirectNotice(message, "error");
  }
}

export async function upsertVendorRatingAction(formData: FormData) {
  await assertAdminAuth();
  try {
    const supabase = requireSupabaseAdmin();
    const vendorId = Number(clean(formData.get("vendorId")));
    const ratingRaw = clean(formData.get("rating"));
    const confidenceRaw = clean(formData.get("confidence"));
    const reasonTagsRaw = clean(formData.get("reasonTags"));
    const methodVersion = clean(formData.get("methodVersion")) || "manual_admin_v1";

    if (!vendorId) {
      redirectNotice("Vendor is required for rating.", "error");
    }

    const rating = ratingRaw ? Number(ratingRaw) : null;
    const confidence = confidenceRaw ? Number(confidenceRaw) : null;

    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
      redirectNotice("Rating must be between 0 and 5.", "error");
    }
    if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      redirectNotice("Confidence must be between 0 and 1.", "error");
    }

    const reasonTags = reasonTagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const { error: clearError } = await supabase
      .from("vendor_rating_snapshots")
      .update({ is_current: false })
      .eq("vendor_id", vendorId)
      .eq("is_current", true);

    if (clearError) {
      throw new Error(clearError.message);
    }

    const { error } = await supabase.from("vendor_rating_snapshots").insert({
      vendor_id: vendorId,
      rating,
      confidence,
      method_version: methodVersion,
      reason_tags: reasonTags,
      is_current: true
    });

    if (error) {
      throw new Error(error.message);
    }

    redirectNotice("Vendor rating snapshot saved.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message = error instanceof Error ? error.message : "Failed to save vendor rating.";
    redirectNotice(message, "error");
  }
}
