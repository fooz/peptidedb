-- Initial schema for PeptideDB
-- Targets: PostgreSQL (Supabase)

CREATE TYPE evidence_grade AS ENUM ('A', 'B', 'C', 'D', 'I');
CREATE TYPE peptide_status AS ENUM ('US_FDA_APPROVED', 'NON_US_APPROVED', 'INVESTIGATIONAL', 'RESEARCH_ONLY');
CREATE TYPE dosing_context AS ENUM ('APPROVED_LABEL', 'STUDY_REPORTED', 'EXPERT_CONSENSUS');

CREATE TABLE jurisdictions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- US, EU, UK, CA, AU
  name TEXT NOT NULL
);

CREATE TABLE peptides (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  canonical_name TEXT NOT NULL,
  sequence TEXT,
  peptide_class TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE peptide_profiles (
  peptide_id BIGINT PRIMARY KEY REFERENCES peptides(id) ON DELETE CASCADE,
  intro TEXT,
  mechanism TEXT,
  effectiveness_summary TEXT,
  long_description TEXT
);

CREATE TABLE peptide_aliases (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE (peptide_id, alias)
);

CREATE TABLE peptide_regulatory_status (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  jurisdiction_id BIGINT NOT NULL REFERENCES jurisdictions(id),
  status peptide_status NOT NULL,
  notes TEXT,
  UNIQUE (peptide_id, jurisdiction_id, status)
);

CREATE TABLE use_cases (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE peptide_use_cases (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  use_case_id BIGINT NOT NULL REFERENCES use_cases(id),
  jurisdiction_id BIGINT REFERENCES jurisdictions(id),
  evidence_grade evidence_grade NOT NULL DEFAULT 'I',
  consumer_summary TEXT,
  clinical_summary TEXT,
  UNIQUE (peptide_id, use_case_id, jurisdiction_id)
);

CREATE TABLE peptide_dosing_entries (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  jurisdiction_id BIGINT REFERENCES jurisdictions(id),
  context dosing_context NOT NULL,
  population TEXT,
  route TEXT,
  starting_dose TEXT,
  maintenance_dose TEXT,
  frequency TEXT,
  notes TEXT
);

CREATE TABLE peptide_safety_entries (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  jurisdiction_id BIGINT REFERENCES jurisdictions(id),
  adverse_effects TEXT,
  contraindications TEXT,
  interactions TEXT,
  monitoring TEXT,
  UNIQUE (peptide_id, jurisdiction_id)
);

CREATE TABLE citations (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_title TEXT,
  published_at DATE NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE peptide_claims (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  evidence_grade evidence_grade,
  citation_id BIGINT NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendor_verifications (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- license, accreditation, etc.
  value TEXT NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE TABLE vendor_lab_evidence (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  peptide_id BIGINT REFERENCES peptides(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL, -- coa, third_party_test
  sample_date DATE,
  document_url TEXT
);

CREATE TABLE vendor_peptide_listings (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  is_affiliate BOOLEAN NOT NULL DEFAULT FALSE,
  affiliate_url TEXT,
  product_url TEXT,
  UNIQUE (vendor_id, peptide_id)
);

CREATE TABLE vendor_rating_snapshots (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1), -- NULL means no rating
  confidence NUMERIC(3, 2),
  method_version TEXT NOT NULL,
  reason_tags TEXT[] DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT FALSE
);
