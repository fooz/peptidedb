-- PeptideDB bootstrap
-- Safe to run after schema.sql. Includes:
-- 1) profile table backfill (if missing)
-- 2) initial sample data
-- 3) read-only policies for anon/authenticated

CREATE TABLE IF NOT EXISTS peptide_profiles (
  peptide_id BIGINT PRIMARY KEY REFERENCES peptides(id) ON DELETE CASCADE,
  intro TEXT,
  mechanism TEXT,
  effectiveness_summary TEXT,
  long_description TEXT
);

CREATE TABLE IF NOT EXISTS citations (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_title TEXT,
  published_at DATE NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peptide_claims (
  id BIGSERIAL PRIMARY KEY,
  peptide_id BIGINT NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  evidence_grade evidence_grade,
  citation_id BIGINT NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE peptides ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE peptides ADD COLUMN IF NOT EXISTS last_live_refresh_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

DELETE FROM vendors
WHERE slug = 'unknown-source-vendor'
   OR lower(btrim(name)) = 'unknown source vendor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendors_slug_not_unknown_source_vendor'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_slug_not_unknown_source_vendor
      CHECK (lower(slug) <> 'unknown-source-vendor');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendors_name_not_unknown_source_vendor'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_name_not_unknown_source_vendor
      CHECK (lower(btrim(name)) <> 'unknown source vendor');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vendor_profiles (
  vendor_id BIGINT PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  trust_signals TEXT[] NOT NULL DEFAULT '{}',
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  regions TEXT[] NOT NULL DEFAULT '{}'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'peptide_use_cases_peptide_id_use_case_id_jurisdiction_id_key'
  ) THEN
    ALTER TABLE peptide_use_cases
      ADD CONSTRAINT peptide_use_cases_peptide_id_use_case_id_jurisdiction_id_key
      UNIQUE (peptide_id, use_case_id, jurisdiction_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'peptide_safety_entries_peptide_id_jurisdiction_id_key'
  ) THEN
    ALTER TABLE peptide_safety_entries
      ADD CONSTRAINT peptide_safety_entries_peptide_id_jurisdiction_id_key
      UNIQUE (peptide_id, jurisdiction_id);
  END IF;
END $$;

INSERT INTO jurisdictions (code, name) VALUES
  ('US', 'United States'),
  ('EU', 'European Union'),
  ('UK', 'United Kingdom'),
  ('CA', 'Canada'),
  ('AU', 'Australia')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO use_cases (slug, name) VALUES
  ('type-2-diabetes', 'Type 2 Diabetes'),
  ('weight-management', 'Weight Management'),
  ('tissue-repair', 'Tissue Repair'),
  ('gi-symptoms', 'GI Symptoms')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO peptides (slug, canonical_name, sequence, peptide_class, is_published)
VALUES
  ('semaglutide', 'Semaglutide', NULL, 'GLP-1 receptor agonist peptide', TRUE),
  ('bpc-157', 'BPC-157', NULL, 'Synthetic gastric peptide fragment', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  canonical_name = EXCLUDED.canonical_name,
  peptide_class = EXCLUDED.peptide_class,
  is_published = EXCLUDED.is_published;

INSERT INTO peptide_profiles (peptide_id, intro, mechanism, effectiveness_summary, long_description)
SELECT
  p.id,
  'Semaglutide is a GLP-1 analog peptide used for glycemic control and chronic weight management in specific populations.',
  'Activates GLP-1 receptors to improve insulin secretion, reduce glucagon output, slow gastric emptying, and influence satiety pathways.',
  'Strong efficacy in approved indications with consistent RCT evidence; durability depends on adherence and long-term management context.',
  'Clinical evidence is strongest for approved use cases. Study-reported outcomes in additional populations should be interpreted with trial design and endpoint limitations in mind.'
FROM peptides p
WHERE p.slug = 'semaglutide'
ON CONFLICT (peptide_id) DO UPDATE
SET
  intro = EXCLUDED.intro,
  mechanism = EXCLUDED.mechanism,
  effectiveness_summary = EXCLUDED.effectiveness_summary,
  long_description = EXCLUDED.long_description;

INSERT INTO peptide_profiles (peptide_id, intro, mechanism, effectiveness_summary, long_description)
SELECT
  p.id,
  'BPC-157 is frequently discussed in consumer forums, but high-quality human evidence remains limited and regulatory status is generally investigational.',
  'Proposed mechanisms include angiogenic and tissue signaling effects, but translational certainty in humans is still low.',
  'Current data does not provide robust, broadly generalizable efficacy conclusions for most claimed consumer use cases.',
  'For investigational peptides, this database separates study findings from approved treatment guidance and flags lower-certainty evidence.'
FROM peptides p
WHERE p.slug = 'bpc-157'
ON CONFLICT (peptide_id) DO UPDATE
SET
  intro = EXCLUDED.intro,
  mechanism = EXCLUDED.mechanism,
  effectiveness_summary = EXCLUDED.effectiveness_summary,
  long_description = EXCLUDED.long_description;

INSERT INTO peptide_aliases (peptide_id, alias)
SELECT p.id, v.alias
FROM peptides p
JOIN (
  VALUES
    ('semaglutide', 'Ozempic'),
    ('semaglutide', 'Wegovy'),
    ('semaglutide', 'Rybelsus'),
    ('bpc-157', 'Body Protection Compound')
) AS v(slug, alias) ON p.slug = v.slug
ON CONFLICT (peptide_id, alias) DO NOTHING;

INSERT INTO peptide_regulatory_status (peptide_id, jurisdiction_id, status, notes)
SELECT
  p.id,
  j.id,
  v.status::peptide_status,
  v.notes
FROM (
  VALUES
    ('semaglutide', 'US', 'US_FDA_APPROVED', 'Approved for specific labeled indications.'),
    ('semaglutide', 'EU', 'NON_US_APPROVED', 'Jurisdiction-specific approvals apply.'),
    ('semaglutide', 'UK', 'NON_US_APPROVED', 'Jurisdiction-specific approvals apply.'),
    ('semaglutide', 'CA', 'NON_US_APPROVED', 'Jurisdiction-specific approvals apply.'),
    ('semaglutide', 'AU', 'NON_US_APPROVED', 'Jurisdiction-specific approvals apply.'),
    ('bpc-157', 'US', 'INVESTIGATIONAL', 'No broad mainstream approval status.'),
    ('bpc-157', 'EU', 'INVESTIGATIONAL', 'No broad mainstream approval status.'),
    ('bpc-157', 'UK', 'INVESTIGATIONAL', 'No broad mainstream approval status.'),
    ('bpc-157', 'CA', 'INVESTIGATIONAL', 'No broad mainstream approval status.'),
    ('bpc-157', 'AU', 'INVESTIGATIONAL', 'No broad mainstream approval status.')
) AS v(slug, jurisdiction_code, status, notes)
JOIN peptides p ON p.slug = v.slug
JOIN jurisdictions j ON j.code = v.jurisdiction_code
ON CONFLICT (peptide_id, jurisdiction_id, status) DO NOTHING;

INSERT INTO peptide_use_cases (peptide_id, use_case_id, jurisdiction_id, evidence_grade, consumer_summary, clinical_summary)
SELECT
  p.id,
  uc.id,
  j.id,
  v.evidence_grade::evidence_grade,
  v.consumer_summary,
  v.clinical_summary
FROM (
  VALUES
    ('semaglutide', 'type-2-diabetes', 'US', 'A', 'Strong evidence for labeled glycemic outcomes in indicated populations.', 'High-quality RCT base for glucose control endpoints.'),
    ('semaglutide', 'weight-management', 'US', 'A', 'Strong evidence for chronic weight management in indicated populations.', 'Consistent placebo-controlled effect sizes in eligible adults.'),
    ('bpc-157', 'tissue-repair', 'US', 'C', 'Human evidence is limited and not yet definitive.', 'Most claims rely on early-phase or non-definitive evidence.'),
    ('bpc-157', 'gi-symptoms', 'US', 'C', 'Evidence remains limited and mixed for broad consumer claims.', 'Clinical certainty is currently low for generalized use.')
) AS v(slug, use_case_slug, jurisdiction_code, evidence_grade, consumer_summary, clinical_summary)
JOIN peptides p ON p.slug = v.slug
JOIN use_cases uc ON uc.slug = v.use_case_slug
JOIN jurisdictions j ON j.code = v.jurisdiction_code
WHERE NOT EXISTS (
  SELECT 1
  FROM peptide_use_cases x
  WHERE x.peptide_id = p.id
    AND x.use_case_id = uc.id
    AND x.jurisdiction_id = j.id
);

INSERT INTO peptide_dosing_entries (
  peptide_id,
  jurisdiction_id,
  context,
  population,
  route,
  starting_dose,
  maintenance_dose,
  frequency,
  notes
)
SELECT
  p.id,
  j.id,
  v.context::dosing_context,
  v.population,
  v.route,
  v.starting_dose,
  v.maintenance_dose,
  v.frequency,
  v.notes
FROM (
  VALUES
    ('semaglutide', 'US', 'APPROVED_LABEL', 'Adults with approved indication', 'Subcutaneous', 'Low initial dose per label titration', 'Step-up to target label dose', 'Weekly', 'Use official label for exact product-specific titration.'),
    ('semaglutide', 'US', 'STUDY_REPORTED', 'Investigational cohorts', 'Subcutaneous', 'Varies by trial', 'Varies by protocol', 'Weekly', 'Research context only; not treatment guidance.'),
    ('bpc-157', 'US', 'STUDY_REPORTED', 'Small investigational cohorts', 'Varies', 'Protocol-specific', 'Protocol-specific', 'Varies', 'Research context only; not treatment guidance.')
) AS v(slug, jurisdiction_code, context, population, route, starting_dose, maintenance_dose, frequency, notes)
JOIN peptides p ON p.slug = v.slug
JOIN jurisdictions j ON j.code = v.jurisdiction_code
WHERE NOT EXISTS (
  SELECT 1
  FROM peptide_dosing_entries x
  WHERE x.peptide_id = p.id
    AND x.jurisdiction_id = j.id
    AND x.context = v.context::dosing_context
    AND x.population = v.population
);

INSERT INTO peptide_safety_entries (
  peptide_id,
  jurisdiction_id,
  adverse_effects,
  contraindications,
  interactions,
  monitoring
)
SELECT
  p.id,
  j.id,
  v.adverse_effects,
  v.contraindications,
  v.interactions,
  v.monitoring
FROM (
  VALUES
    ('semaglutide', 'US', 'Gastrointestinal events are common in early titration.', 'Use caution in patients with contraindicated label conditions.', 'Assess interactions with concomitant metabolic therapies.', 'Track tolerability, adherence, and relevant labs as indicated.'),
    ('bpc-157', 'US', 'Safety profile is not well defined in large controlled human studies.', 'Contraindications are not comprehensively established.', 'Interaction profile remains uncertain due to limited evidence.', 'Clinical monitoring standards are not established for broad consumer use.')
) AS v(slug, jurisdiction_code, adverse_effects, contraindications, interactions, monitoring)
JOIN peptides p ON p.slug = v.slug
JOIN jurisdictions j ON j.code = v.jurisdiction_code
WHERE NOT EXISTS (
  SELECT 1
  FROM peptide_safety_entries x
  WHERE x.peptide_id = p.id
    AND x.jurisdiction_id = j.id
);

WITH seed_citations AS (
  INSERT INTO citations (source_url, source_title, published_at)
  VALUES
    ('https://clinicaltrials.gov/', 'ClinicalTrials evidence summary', DATE '2024-01-15'),
    ('https://pubmed.ncbi.nlm.nih.gov/', 'PubMed indexed review summary', DATE '2023-11-10')
  RETURNING id, source_url
),
resolved_citations AS (
  SELECT id, source_url FROM seed_citations
  UNION ALL
  SELECT c.id, c.source_url
  FROM citations c
  WHERE c.source_url IN ('https://clinicaltrials.gov/', 'https://pubmed.ncbi.nlm.nih.gov/')
),
claim_rows AS (
  SELECT
    p.id AS peptide_id,
    v.section,
    v.claim_text,
    v.evidence_grade,
    rc.id AS citation_id
  FROM (
    VALUES
      ('semaglutide', 'Effectiveness', 'Large randomized trials support efficacy in approved populations.', 'A', 'https://clinicaltrials.gov/'),
      ('bpc-157', 'Safety', 'Human safety evidence remains limited and not yet definitive.', 'C', 'https://pubmed.ncbi.nlm.nih.gov/')
  ) AS v(peptide_slug, section, claim_text, evidence_grade, source_url)
  JOIN peptides p ON p.slug = v.peptide_slug
  JOIN resolved_citations rc ON rc.source_url = v.source_url
)
INSERT INTO peptide_claims (peptide_id, section, claim_text, evidence_grade, citation_id)
SELECT
  c.peptide_id,
  c.section,
  c.claim_text,
  c.evidence_grade::evidence_grade,
  c.citation_id
FROM claim_rows c
WHERE NOT EXISTS (
  SELECT 1
  FROM peptide_claims pc
  WHERE pc.peptide_id = c.peptide_id
    AND pc.section = c.section
    AND pc.claim_text = c.claim_text
);

INSERT INTO vendors (slug, name, website_url, is_published)
VALUES
  ('nova-peptide-labs', 'Nova Peptide Labs', 'https://example.com/nova', TRUE),
  ('atlas-biologics', 'Atlas Biologics', 'https://example.com/atlas', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  website_url = EXCLUDED.website_url,
  is_published = EXCLUDED.is_published;

INSERT INTO vendor_peptide_listings (vendor_id, peptide_id, is_affiliate, affiliate_url, product_url)
SELECT
  v.id,
  p.id,
  l.is_affiliate,
  l.affiliate_url,
  l.product_url
FROM (
  VALUES
    ('nova-peptide-labs', 'semaglutide', true, 'https://example.com/aff/nova/semaglutide', 'https://example.com/nova/semaglutide'),
    ('atlas-biologics', 'semaglutide', false, NULL, 'https://example.com/atlas/semaglutide'),
    ('nova-peptide-labs', 'bpc-157', true, 'https://example.com/aff/nova/bpc-157', 'https://example.com/nova/bpc-157'),
    ('atlas-biologics', 'bpc-157', false, NULL, 'https://example.com/atlas/bpc-157')
) AS l(vendor_slug, peptide_slug, is_affiliate, affiliate_url, product_url)
JOIN vendors v ON v.slug = l.vendor_slug
JOIN peptides p ON p.slug = l.peptide_slug
ON CONFLICT (vendor_id, peptide_id) DO UPDATE
SET
  is_affiliate = EXCLUDED.is_affiliate,
  affiliate_url = EXCLUDED.affiliate_url,
  product_url = EXCLUDED.product_url;

UPDATE vendor_rating_snapshots
SET is_current = false
WHERE method_version = 'seed_v1' AND is_current = true;

INSERT INTO vendor_rating_snapshots (vendor_id, rating, confidence, method_version, reason_tags, is_current)
SELECT
  v.id,
  r.rating,
  r.confidence,
  'seed_v1',
  r.reason_tags,
  true
FROM (
  VALUES
    ('nova-peptide-labs', 4.4::numeric, 0.82::numeric, ARRAY['third_party_lab_docs', 'cold_chain_policy', 'regulatory_clear_history']::text[]),
    ('atlas-biologics', 3.6::numeric, 0.67::numeric, ARRAY['coa_available', 'limited_recent_testing']::text[])
) AS r(vendor_slug, rating, confidence, reason_tags)
JOIN vendors v ON v.slug = r.vendor_slug;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

GRANT SELECT ON
  jurisdictions,
  peptides,
  peptide_profiles,
  peptide_aliases,
  peptide_regulatory_status,
  use_cases,
  peptide_use_cases,
  peptide_dosing_entries,
  peptide_safety_entries,
  citations,
  peptide_claims,
  vendors,
  vendor_profiles,
  vendor_verifications,
  vendor_lab_evidence,
  vendor_peptide_listings,
  vendor_rating_snapshots
TO anon, authenticated;

ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptides ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_regulatory_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_dosing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_safety_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_lab_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_peptide_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_rating_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_jurisdictions ON jurisdictions;
DROP POLICY IF EXISTS public_read_peptides ON peptides;
DROP POLICY IF EXISTS public_read_peptide_profiles ON peptide_profiles;
DROP POLICY IF EXISTS public_read_peptide_aliases ON peptide_aliases;
DROP POLICY IF EXISTS public_read_peptide_regulatory_status ON peptide_regulatory_status;
DROP POLICY IF EXISTS public_read_use_cases ON use_cases;
DROP POLICY IF EXISTS public_read_peptide_use_cases ON peptide_use_cases;
DROP POLICY IF EXISTS public_read_peptide_dosing_entries ON peptide_dosing_entries;
DROP POLICY IF EXISTS public_read_peptide_safety_entries ON peptide_safety_entries;
DROP POLICY IF EXISTS public_read_citations ON citations;
DROP POLICY IF EXISTS public_read_peptide_claims ON peptide_claims;
DROP POLICY IF EXISTS public_read_vendors ON vendors;
DROP POLICY IF EXISTS public_read_vendor_profiles ON vendor_profiles;
DROP POLICY IF EXISTS public_read_vendor_verifications ON vendor_verifications;
DROP POLICY IF EXISTS public_read_vendor_lab_evidence ON vendor_lab_evidence;
DROP POLICY IF EXISTS public_read_vendor_peptide_listings ON vendor_peptide_listings;
DROP POLICY IF EXISTS public_read_vendor_rating_snapshots ON vendor_rating_snapshots;

CREATE POLICY public_read_jurisdictions ON jurisdictions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_peptides ON peptides FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY public_read_peptide_profiles ON peptide_profiles FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_profiles.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_peptide_aliases ON peptide_aliases FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_aliases.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_peptide_regulatory_status ON peptide_regulatory_status FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_regulatory_status.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_use_cases ON use_cases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_peptide_use_cases ON peptide_use_cases FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_use_cases.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_peptide_dosing_entries ON peptide_dosing_entries FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_dosing_entries.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_peptide_safety_entries ON peptide_safety_entries FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_safety_entries.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_citations ON citations FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM peptide_claims pc
    JOIN peptides p ON p.id = pc.peptide_id
    WHERE pc.citation_id = citations.id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_peptide_claims ON peptide_claims FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = peptide_claims.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_vendors ON vendors FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY public_read_vendor_profiles ON vendor_profiles FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_profiles.vendor_id
      AND v.is_published = true
  )
);
CREATE POLICY public_read_vendor_verifications ON vendor_verifications FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_verifications.vendor_id
      AND v.is_published = true
  )
);
CREATE POLICY public_read_vendor_lab_evidence ON vendor_lab_evidence FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_lab_evidence.vendor_id
      AND v.is_published = true
  )
  AND (
    vendor_lab_evidence.peptide_id IS NULL
    OR EXISTS (
      SELECT 1 FROM peptides p
      WHERE p.id = vendor_lab_evidence.peptide_id
        AND p.is_published = true
    )
  )
);
CREATE POLICY public_read_vendor_peptide_listings ON vendor_peptide_listings FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_peptide_listings.vendor_id
      AND v.is_published = true
  )
  AND EXISTS (
    SELECT 1 FROM peptides p
    WHERE p.id = vendor_peptide_listings.peptide_id
      AND p.is_published = true
  )
);
CREATE POLICY public_read_vendor_rating_snapshots ON vendor_rating_snapshots FOR SELECT TO anon, authenticated
USING (
  is_current = true
  AND EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_rating_snapshots.vendor_id
      AND v.is_published = true
  )
);
