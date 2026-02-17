"use client";

import { useFormStatus } from "react-dom";

type IngestControlsProps = {
  ingestExpandedDatasetAction: () => Promise<void>;
  refreshLiveEvidenceAction: () => Promise<void>;
  ingestClinicalTrialsCatalogAction: () => Promise<void>;
  ingestVendorWebsiteCatalogAction: () => Promise<void>;
  enrichPeptideContentAction: () => Promise<void>;
  ingestSocialUgcAction: () => Promise<void>;
};

type IngestCardProps = {
  action: () => Promise<void>;
  title: string;
  description: string;
  idleLabel: string;
  pendingLabel: string;
  primary?: boolean;
};

function IngestSubmitButton({
  idleLabel,
  pendingLabel,
  primary
}: {
  idleLabel: string;
  pendingLabel: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  const className = primary ? "btn primary" : "btn";

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="inline-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}

function IngestProgressStatus({ pendingText }: { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <p className={`ingest-status ${pending ? "active" : ""}`} role="status" aria-live="polite">
      {pending ? pendingText : "Ready"}
    </p>
  );
}

function IngestCard({ action, title, description, idleLabel, pendingLabel, primary }: IngestCardProps) {
  return (
    <form action={action} className="ingest-card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <IngestSubmitButton idleLabel={idleLabel} pendingLabel={pendingLabel} primary={primary} />
      <IngestProgressStatus pendingText="Running now. This can take up to a couple of minutes." />
    </form>
  );
}

export function IngestControls({
  ingestExpandedDatasetAction,
  refreshLiveEvidenceAction,
  ingestClinicalTrialsCatalogAction,
  ingestVendorWebsiteCatalogAction,
  enrichPeptideContentAction,
  ingestSocialUgcAction
}: IngestControlsProps) {
  return (
    <div className="ingest-controls">
      <IngestCard
        action={ingestExpandedDatasetAction}
        title="Expanded Dataset"
        description="Loads curated peptide profiles, use cases, dosing, safety, and base evidence records."
        idleLabel="Ingest Expanded Peptide Dataset"
        pendingLabel="Ingesting Expanded Dataset..."
        primary
      />
      <IngestCard
        action={refreshLiveEvidenceAction}
        title="Live Evidence Refresh"
        description="Pulls latest PubMed and ClinicalTrials evidence into citation claims for published peptides."
        idleLabel="Refresh Live Sources"
        pendingLabel="Refreshing Live Sources..."
      />
      <IngestCard
        action={ingestClinicalTrialsCatalogAction}
        title="ClinicalTrials Catalog (Hundreds)"
        description="Imports a large investigational peptide catalog from ClinicalTrials intervention records."
        idleLabel="Import Hundreds From ClinicalTrials"
        pendingLabel="Importing Hundreds..."
      />
      <IngestCard
        action={ingestVendorWebsiteCatalogAction}
        title="Vendor Website Catalog"
        description="Researches known vendor websites, ingests vendor pages, and links offered peptides."
        idleLabel="Ingest Vendor Website Listings"
        pendingLabel="Ingesting Vendor Listings..."
      />
      <IngestCard
        action={enrichPeptideContentAction}
        title="External Source Enrichment"
        description="Pulls openFDA, PubChem, ChEMBL, ClinicalTrials, and PubMed data to replace vague peptide content."
        idleLabel="Enrich 40 Peptides (Per Run)"
        pendingLabel="Enriching Content..."
      />
      <IngestCard
        action={ingestSocialUgcAction}
        title="Social & Community Sources"
        description="Ingests Reddit and Hacker News discussions for peptides and vendors, stores review quotes, and updates vendor ratings with sentiment analysis."
        idleLabel="Ingest Social Signals (Peptides + Vendors)"
        pendingLabel="Ingesting Social Signals..."
      />
    </div>
  );
}
