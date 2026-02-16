import type { SupabaseClient } from "@supabase/supabase-js";
import { expandedPeptideDataset, statusForJurisdiction } from "@/lib/expanded-dataset";
import type { JurisdictionCode } from "@/lib/types";

const JURISDICTION_ORDER: JurisdictionCode[] = ["US", "EU", "UK", "CA", "AU"];

function assertData<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

export async function ingestExpandedPeptideDataset(supabase: SupabaseClient) {
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

  const { data: jurisdictionRows, error: jurisdictionError } = await supabase
    .from("jurisdictions")
    .select("id,code")
    .in("code", JURISDICTION_ORDER);

  if (jurisdictionError || !jurisdictionRows) {
    throw new Error(jurisdictionError?.message ?? "Failed to load jurisdictions.");
  }

  const jurisdictionIdByCode = new Map<JurisdictionCode, number>();
  for (const row of jurisdictionRows) {
    const code = row.code as JurisdictionCode;
    jurisdictionIdByCode.set(code, Number(row.id));
  }

  const usJurisdictionId = assertData(jurisdictionIdByCode.get("US") ?? null, "US jurisdiction missing.");
  const citationCache = new Map<string, number>();
  let processed = 0;

  for (const seed of expandedPeptideDataset) {
    const { data: peptide, error: peptideError } = await supabase
      .from("peptides")
      .upsert(
        {
          slug: seed.slug,
          canonical_name: seed.name,
          peptide_class: seed.peptideClass,
          is_published: true
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (peptideError || !peptide?.id) {
      throw new Error(peptideError?.message ?? `Failed to upsert peptide: ${seed.slug}`);
    }
    const peptideId = Number(peptide.id);

    const { error: profileError } = await supabase.from("peptide_profiles").upsert(
      {
        peptide_id: peptideId,
        intro: seed.intro,
        mechanism: seed.mechanism,
        effectiveness_summary: seed.effectivenessSummary,
        long_description: seed.longDescription
      },
      { onConflict: "peptide_id" }
    );
    if (profileError) {
      throw new Error(profileError.message);
    }

    if (seed.aliases && seed.aliases.length > 0) {
      for (const alias of seed.aliases) {
        await supabase
          .from("peptide_aliases")
          .upsert({ peptide_id: peptideId, alias }, { onConflict: "peptide_id,alias" });
      }
    }

    for (const code of JURISDICTION_ORDER) {
      const jurisdictionId = jurisdictionIdByCode.get(code);
      if (!jurisdictionId) {
        continue;
      }
      const status = statusForJurisdiction(seed.statusModel, code);

      await supabase
        .from("peptide_regulatory_status")
        .delete()
        .eq("peptide_id", peptideId)
        .eq("jurisdiction_id", jurisdictionId)
        .neq("status", status);

      const { error: statusError } = await supabase.from("peptide_regulatory_status").upsert(
        {
          peptide_id: peptideId,
          jurisdiction_id: jurisdictionId,
          status,
          notes: `Auto-ingested expanded dataset (${seed.statusModel}).`
        },
        { onConflict: "peptide_id,jurisdiction_id,status" }
      );
      if (statusError) {
        throw new Error(statusError.message);
      }
    }

    const { data: useCase, error: useCaseError } = await supabase
      .from("use_cases")
      .upsert({ slug: seed.useCase.slug, name: seed.useCase.name }, { onConflict: "slug" })
      .select("id")
      .single();

    if (useCaseError || !useCase?.id) {
      throw new Error(useCaseError?.message ?? `Failed to upsert use case for ${seed.slug}`);
    }

    const { error: peptideUseCaseError } = await supabase.from("peptide_use_cases").upsert(
      {
        peptide_id: peptideId,
        use_case_id: Number(useCase.id),
        jurisdiction_id: usJurisdictionId,
        evidence_grade: seed.useCase.evidenceGrade,
        consumer_summary: seed.useCase.consumerSummary,
        clinical_summary: seed.useCase.clinicalSummary
      },
      { onConflict: "peptide_id,use_case_id,jurisdiction_id" }
    );
    if (peptideUseCaseError) {
      throw new Error(peptideUseCaseError.message);
    }

    const { data: dosingExisting } = await supabase
      .from("peptide_dosing_entries")
      .select("id")
      .eq("peptide_id", peptideId)
      .eq("jurisdiction_id", usJurisdictionId)
      .eq("context", seed.dosing.context)
      .eq("population", seed.dosing.population)
      .maybeSingle();

    const dosingPayload = {
      peptide_id: peptideId,
      jurisdiction_id: usJurisdictionId,
      context: seed.dosing.context,
      population: seed.dosing.population,
      route: seed.dosing.route,
      starting_dose: seed.dosing.startingDose,
      maintenance_dose: seed.dosing.maintenanceDose,
      frequency: seed.dosing.frequency,
      notes: seed.dosing.notes
    };

    if (dosingExisting?.id) {
      const { error } = await supabase.from("peptide_dosing_entries").update(dosingPayload).eq("id", dosingExisting.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("peptide_dosing_entries").insert(dosingPayload);
      if (error) {
        throw new Error(error.message);
      }
    }

    const { error: safetyError } = await supabase.from("peptide_safety_entries").upsert(
      {
        peptide_id: peptideId,
        jurisdiction_id: usJurisdictionId,
        adverse_effects: seed.safety.adverseEffects,
        contraindications: seed.safety.contraindications,
        interactions: seed.safety.interactions,
        monitoring: seed.safety.monitoring
      },
      { onConflict: "peptide_id,jurisdiction_id" }
    );
    if (safetyError) {
      throw new Error(safetyError.message);
    }

    const citationKey = `${seed.claim.sourceUrl}|${seed.claim.publishedAt}`;
    let citationId = citationCache.get(citationKey);
    if (!citationId) {
      const { data: existingCitation } = await supabase
        .from("citations")
        .select("id")
        .eq("source_url", seed.claim.sourceUrl)
        .eq("published_at", seed.claim.publishedAt)
        .maybeSingle();

      if (existingCitation?.id) {
        citationId = Number(existingCitation.id);
      } else {
        const { data: citation, error: citationError } = await supabase
          .from("citations")
          .insert({
            source_url: seed.claim.sourceUrl,
            source_title: seed.claim.sourceTitle,
            published_at: seed.claim.publishedAt
          })
          .select("id")
          .single();

        if (citationError || !citation?.id) {
          throw new Error(citationError?.message ?? `Failed citation insert for ${seed.slug}`);
        }
        citationId = Number(citation.id);
      }
      citationCache.set(citationKey, citationId);
    }

    const { data: existingClaim } = await supabase
      .from("peptide_claims")
      .select("id")
      .eq("peptide_id", peptideId)
      .eq("section", seed.claim.section)
      .eq("claim_text", seed.claim.claimText)
      .maybeSingle();

    if (existingClaim?.id) {
      const { error } = await supabase
        .from("peptide_claims")
        .update({
          evidence_grade: seed.claim.evidenceGrade,
          citation_id: citationId
        })
        .eq("id", existingClaim.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("peptide_claims").insert({
        peptide_id: peptideId,
        section: seed.claim.section,
        claim_text: seed.claim.claimText,
        evidence_grade: seed.claim.evidenceGrade,
        citation_id: citationId
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    processed += 1;
  }

  return {
    processed,
    total: expandedPeptideDataset.length
  };
}
