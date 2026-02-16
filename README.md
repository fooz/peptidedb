# PeptideDB

Consumer-first peptide reference database with a clinical toggle, evidence tracking, and vendor reliability scoring.

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
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Start:
   ```bash
   npm run dev
   ```

## Supabase setup
1. Open Supabase SQL editor.
2. Run `db/schema.sql`.
3. Run `db/bootstrap.sql`.
4. Confirm storage bucket exists: `vendor-docs` (private).

## Vercel setup (non-technical)
1. In Vercel project settings, open `Environment Variables`.
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy.

## DreamHost domain mapping
1. In DreamHost DNS, add/update:
   - `A` record for apex (`@`) to Vercel IP: `76.76.21.21`
   - `CNAME` for `www` to `cname.vercel-dns.com`
2. In Vercel `Domains`, add your domain and verify.

## Current scaffold status
- Home, peptide directory, peptide detail template, vendor directory
- Consumer/clinical toggle on peptide pages
- Supabase-backed reads with fallback data if tables are empty
- Health endpoint: `/api/health`

## Next implementation steps
1. Add authenticated admin tools to curate peptides/vendors from UI.
2. Build admin ingestion routes for studies/regulatory data.
3. Add Typesense-backed faceted search.
4. Add vendor rating calculation worker + snapshots.
