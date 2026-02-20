# PeptideDB

Consumer-first peptide reference database with embedded clinical sections, evidence tracking, and vendor reliability scoring.

## Stack
- Next.js (web app and API routes)
- Supabase (PostgreSQL + storage)
- Vercel (hosting)
- Typesense (planned, for production search facets)
- Upstash Redis (planned, for ingestion/rating background jobs)

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`.
3. Fill:
   - `NEXT_PUBLIC_SITE_URL` (production domain, e.g. `https://yourdomain.com`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NCBI_API_KEY` (optional, recommended for higher PubMed API limits)
   - `ADMIN_USERNAME` (default: `admin`)
   - `ADMIN_PASSWORD` (required for `/admin` login)
   - `ADMIN_RESET_KEY` (required to use `/admin/reset-password`)
   - `ADMIN_AUTH_BUCKET` (optional, default: `vendor-docs`)
   - `ADMIN_AUTH_OBJECT_PATH` (optional, default: `_system/admin-auth.json`)
4. Start:
   ```bash
   npm run dev
   ```

## Supabase setup
1. Open Supabase SQL editor.
2. Run `db/schema.sql`.
3. Run `db/bootstrap.sql`.
4. Confirm storage bucket exists: `vendor-docs` (private).
5. If you already ran bootstrap before this commit, re-run `db/bootstrap.sql` once to apply new columns (`is_published`, `last_live_refresh_at`) and constraints.

## Vercel setup (non-technical)
1. In Vercel project settings, open `Environment Variables`.
2. Add:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NCBI_API_KEY` (optional)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_RESET_KEY`
   - `ADMIN_AUTH_BUCKET` (optional)
   - `ADMIN_AUTH_OBJECT_PATH` (optional)
3. Redeploy.

## DreamHost domain mapping
1. In DreamHost DNS, add/update:
   - `A` record for apex (`@`) to Vercel IP: `76.76.21.21`
   - `CNAME` for `www` to `cname.vercel-dns.com`
2. In Vercel `Domains`, add your domain and verify.

## Current scaffold status
- Home, peptide directory, peptide detail template, vendor directory
- Consumer text with inline `Clinical view` section on peptide pages
- Faceted filters for peptide and vendor directories
- Draft vs published visibility (`is_published`) on peptides and vendors
- Password-protected admin dashboard at `/admin`
- Citation claim workflow in admin (requires source URL + publication date)
- One-click expanded dataset ingest button in `/admin`
- One-click live evidence refresh button in `/admin` (PubMed + ClinicalTrials)
- One-click high-volume ClinicalTrials catalog ingest in `/admin` (targets hundreds of peptide entries)
- One-click vendor website ingest in `/admin` (known vendor sites -> vendor pages + peptide listings)
- Evidence and references section on peptide detail pages
- Vendor profile pages at `/vendors/[slug]` with features, trust signals, and linked peptide listings
- Supabase-backed reads with fallback data if tables are empty
- Health endpoint: `/api/health`

## Next implementation steps
1. Build admin ingestion routes for studies/regulatory data.
2. Add Typesense-backed faceted search.
3. Add vendor rating calculation worker + snapshots.
4. Add editorial workflow states (draft, review, approved) beyond publish toggle.
