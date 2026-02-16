import Link from "next/link";
import { logoutAdminAction } from "@/app/admin/auth-actions";
import {
  addCitationClaimAction,
  addDosingAction,
  addUseCaseAction,
  deleteCitationClaimAction,
  upsertPeptideAction,
  upsertSafetyAction,
  upsertVendorAction,
  upsertVendorListingAction,
  upsertVendorRatingAction
} from "@/app/admin/actions";
import { EVIDENCE_GRADES, JURISDICTIONS, REGULATORY_STATUSES } from "@/lib/constants";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/admin-repository";

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

type PageProps = {
  searchParams: Promise<SearchParams | undefined>;
};

function firstParam(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminPage({ searchParams }: PageProps) {
  await requireAdminAuth();

  const resolvedSearchParams = await searchParams;
  const notice = firstParam(resolvedSearchParams?.notice);
  const kind = firstParam(resolvedSearchParams?.kind);
  const editPeptide = firstParam(resolvedSearchParams?.editPeptide);
  const editVendor = firstParam(resolvedSearchParams?.editVendor);
  const data = await getAdminDashboardData(editPeptide, editVendor);

  const selectedPeptide = data.selectedPeptide;
  const selectedPeptideClaims = data.selectedPeptideClaims;
  const selectedVendor = data.selectedVendor;
  const jurisdictions =
    data.jurisdictions.length > 0
      ? data.jurisdictions
      : JURISDICTIONS.map((code) => ({ code, name: code }));

  return (
    <div className="admin-shell">
      <section className="card hero">
        <div className="admin-header-row">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="muted">Create, edit, and publish peptides and vendors.</p>
          </div>
          <form action={logoutAdminAction}>
            <button className="btn" type="submit">
              Sign Out
            </button>
          </form>
        </div>
        <div className="meta-row">
          <span className="kpi-pill">{data.peptides.length} peptides</span>
          <span className="kpi-pill">{data.vendors.length} vendors</span>
          <span className="kpi-pill">{data.supabaseConfigured ? "Supabase connected" : "Supabase missing config"}</span>
        </div>
        {notice ? <p className={`notice ${kind === "error" ? "error" : "success"}`}>{notice}</p> : null}
      </section>

      {!data.supabaseConfigured ? (
        <section className="card">
          <p className="notice error">
            Missing server setup: add <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel before admin writes will work.
          </p>
        </section>
      ) : null}

      <section className="grid two">
        <article className="card">
          <div className="section-head">
            <h2>Peptides</h2>
            <p className="muted">Pick an item to preload it in the edit form.</p>
          </div>
          <div className="admin-list">
            {data.peptides.map((peptide) => (
              <div className="admin-list-item" key={peptide.id}>
                <span>
                  {peptide.name}{" "}
                  <span className={`admin-badge ${peptide.isPublished ? "published" : "draft"}`}>
                    {peptide.isPublished ? "Published" : "Draft"}
                  </span>
                </span>
                <Link className="subtle-link" href={`/admin?editPeptide=${encodeURIComponent(peptide.slug)}`}>
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <h2>Vendors</h2>
            <p className="muted">Vendor publish status is managed independently.</p>
          </div>
          <div className="admin-list">
            {data.vendors.map((vendor) => (
              <div className="admin-list-item" key={vendor.id}>
                <span>
                  {vendor.name}{" "}
                  <span className={`admin-badge ${vendor.isPublished ? "published" : "draft"}`}>
                    {vendor.isPublished ? "Published" : "Draft"}
                  </span>
                </span>
                <Link className="subtle-link" href={`/admin?editVendor=${encodeURIComponent(vendor.slug)}`}>
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Create Or Edit Peptide</h2>
        </div>
        <form action={upsertPeptideAction} className="form-grid two-col">
          <label>
            Slug
            <input name="slug" defaultValue={selectedPeptide?.slug ?? ""} placeholder="semaglutide" />
          </label>
          <label>
            Canonical name
            <input name="canonicalName" defaultValue={selectedPeptide?.canonicalName ?? ""} placeholder="Semaglutide" />
          </label>
          <label>
            Sequence
            <input name="sequence" defaultValue={selectedPeptide?.sequence ?? ""} />
          </label>
          <label>
            Peptide class
            <input name="peptideClass" defaultValue={selectedPeptide?.peptideClass ?? ""} />
          </label>
          <label className="full-span">
            Intro (consumer)
            <textarea name="intro" defaultValue={selectedPeptide?.intro ?? ""} rows={3} />
          </label>
          <label className="full-span">
            Mechanism (clinical)
            <textarea name="mechanism" defaultValue={selectedPeptide?.mechanism ?? ""} rows={3} />
          </label>
          <label className="full-span">
            Effectiveness summary
            <textarea name="effectivenessSummary" defaultValue={selectedPeptide?.effectivenessSummary ?? ""} rows={3} />
          </label>
          <label className="full-span">
            Long description
            <textarea name="longDescription" defaultValue={selectedPeptide?.longDescription ?? ""} rows={4} />
          </label>
          <label className="checkbox-row">
            <input name="isPublished" type="checkbox" defaultChecked={selectedPeptide?.isPublished ?? false} />
            Published on public site
          </label>
          <div>
            <button className="btn primary" type="submit">
              Save Peptide
            </button>
          </div>
        </form>
      </section>

      <section className="grid two">
        <article className="card">
          <div className="section-head">
            <h2>Use Case Entry</h2>
          </div>
          <form action={addUseCaseAction} className="form-grid">
            <label>
              Peptide
              <select name="peptideId">
                <option value="">Select peptide</option>
                {data.peptides.map((peptide) => (
                  <option key={peptide.id} value={peptide.id}>
                    {peptide.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Use case name
              <input name="useCaseName" placeholder="Weight Management" />
            </label>
            <label>
              Use case slug (optional)
              <input name="useCaseSlug" placeholder="weight-management" />
            </label>
            <label>
              Jurisdiction
              <select name="jurisdiction">
                {jurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction.code} value={jurisdiction.code}>
                    {jurisdiction.code} - {jurisdiction.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Evidence grade
              <select name="evidenceGrade">
                {EVIDENCE_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Consumer summary
              <textarea name="consumerSummary" rows={3} />
            </label>
            <label>
              Clinical summary
              <textarea name="clinicalSummary" rows={3} />
            </label>
            <button className="btn primary" type="submit">
              Save Use Case
            </button>
          </form>
        </article>

        <article className="card">
          <div className="section-head">
            <h2>Dosing Entry</h2>
          </div>
          <form action={addDosingAction} className="form-grid">
            <label>
              Peptide
              <select name="peptideId">
                <option value="">Select peptide</option>
                {data.peptides.map((peptide) => (
                  <option key={peptide.id} value={peptide.id}>
                    {peptide.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jurisdiction
              <select name="jurisdiction">
                {jurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction.code} value={jurisdiction.code}>
                    {jurisdiction.code} - {jurisdiction.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Context
              <select name="context">
                <option value="APPROVED_LABEL">APPROVED_LABEL</option>
                <option value="STUDY_REPORTED">STUDY_REPORTED</option>
                <option value="EXPERT_CONSENSUS">EXPERT_CONSENSUS</option>
              </select>
            </label>
            <label>
              Population
              <input name="population" />
            </label>
            <label>
              Route
              <input name="route" />
            </label>
            <label>
              Starting dose
              <input name="startingDose" />
            </label>
            <label>
              Maintenance dose
              <input name="maintenanceDose" />
            </label>
            <label>
              Frequency
              <input name="frequency" />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={3} />
            </label>
            <button className="btn primary" type="submit">
              Add Dosing Entry
            </button>
          </form>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Safety Entry</h2>
        </div>
        <form action={upsertSafetyAction} className="form-grid two-col">
          <label>
            Peptide
            <select name="peptideId">
              <option value="">Select peptide</option>
              {data.peptides.map((peptide) => (
                <option key={peptide.id} value={peptide.id}>
                  {peptide.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jurisdiction
            <select name="jurisdiction">
              {jurisdictions.map((jurisdiction) => (
                <option key={jurisdiction.code} value={jurisdiction.code}>
                  {jurisdiction.code} - {jurisdiction.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Adverse effects
            <textarea name="adverseEffects" rows={3} />
          </label>
          <label className="full-span">
            Contraindications
            <textarea name="contraindications" rows={3} />
          </label>
          <label className="full-span">
            Interactions
            <textarea name="interactions" rows={3} />
          </label>
          <label className="full-span">
            Monitoring
            <textarea name="monitoring" rows={3} />
          </label>
          <div className="full-span">
            <button className="btn primary" type="submit">
              Save Safety Entry
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Citation Claim Entry</h2>
          <p className="muted">Every claim should include a source URL and publication date.</p>
        </div>
        <form action={addCitationClaimAction} className="form-grid two-col">
          <input type="hidden" name="editPeptideSlug" value={selectedPeptide?.slug ?? ""} />
          <label>
            Peptide
            <select name="peptideId" defaultValue={selectedPeptide?.id ? String(selectedPeptide.id) : ""} required>
              <option value="">Select peptide</option>
              {data.peptides.map((peptide) => (
                <option key={peptide.id} value={peptide.id}>
                  {peptide.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <input name="section" placeholder="Effectiveness" required />
          </label>
          <label>
            Evidence grade
            <select name="evidenceGrade" defaultValue="">
              <option value="">Not graded</option>
              {EVIDENCE_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source published date
            <input name="sourcePublishedAt" type="date" required />
          </label>
          <label className="full-span">
            Claim text
            <textarea name="claimText" rows={3} required />
          </label>
          <label className="full-span">
            Source URL
            <input name="sourceUrl" type="url" placeholder="https://..." required />
          </label>
          <label className="full-span">
            Source title (optional)
            <input name="sourceTitle" placeholder="Trial report or publication title" />
          </label>
          <div className="full-span">
            <button className="btn primary" type="submit">
              Save Citation Claim
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Selected Peptide Citations</h2>
          <p className="muted">
            {selectedPeptide
              ? `Showing saved claims for ${selectedPeptide.canonicalName}.`
              : "Choose a peptide from the left panel to preview claim citations."}
          </p>
        </div>
        {!selectedPeptide ? (
          <p className="empty-state">No peptide selected.</p>
        ) : selectedPeptideClaims.length === 0 ? (
          <p className="empty-state">No citation claims saved for this peptide yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Claim</th>
                <th>Grade</th>
                <th>Source</th>
                <th>Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedPeptideClaims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.section}</td>
                  <td>{claim.claimText}</td>
                  <td>{claim.evidenceGrade ?? "N/A"}</td>
                  <td>
                    <a href={claim.sourceUrl} target="_blank" rel="noreferrer">
                      {claim.sourceTitle || "Open source"}
                    </a>
                  </td>
                  <td>{claim.publishedAt}</td>
                  <td>
                    <form action={deleteCitationClaimAction}>
                      <input type="hidden" name="claimId" value={String(claim.id)} />
                      <input type="hidden" name="editPeptideSlug" value={selectedPeptide.slug} />
                      <button className="btn" type="submit">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Create Or Edit Vendor</h2>
        </div>
        <form action={upsertVendorAction} className="form-grid two-col">
          <label>
            Slug
            <input name="slug" defaultValue={selectedVendor?.slug ?? ""} placeholder="nova-peptide-labs" />
          </label>
          <label>
            Name
            <input name="name" defaultValue={selectedVendor?.name ?? ""} placeholder="Nova Peptide Labs" />
          </label>
          <label className="full-span">
            Website URL
            <input
              name="websiteUrl"
              defaultValue={selectedVendor?.websiteUrl ?? ""}
              placeholder="https://vendor-site.com"
            />
          </label>
          <label className="checkbox-row">
            <input name="isPublished" type="checkbox" defaultChecked={selectedVendor?.isPublished ?? false} />
            Published on public site
          </label>
          <div>
            <button className="btn primary" type="submit">
              Save Vendor
            </button>
          </div>
        </form>
      </section>

      <section className="grid two">
        <article className="card">
          <div className="section-head">
            <h2>Vendor Peptide Listing</h2>
          </div>
          <form action={upsertVendorListingAction} className="form-grid">
            <label>
              Vendor
              <select name="vendorId">
                <option value="">Select vendor</option>
                {data.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Peptide
              <select name="peptideId">
                <option value="">Select peptide</option>
                {data.peptides.map((peptide) => (
                  <option key={peptide.id} value={peptide.id}>
                    {peptide.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input name="isAffiliate" type="checkbox" />
              Affiliate listing
            </label>
            <label>
              Affiliate URL
              <input name="affiliateUrl" />
            </label>
            <label>
              Product URL
              <input name="productUrl" />
            </label>
            <button className="btn primary" type="submit">
              Save Listing
            </button>
          </form>
        </article>

        <article className="card">
          <div className="section-head">
            <h2>Vendor Rating Snapshot</h2>
          </div>
          <form action={upsertVendorRatingAction} className="form-grid">
            <label>
              Vendor
              <select name="vendorId">
                <option value="">Select vendor</option>
                {data.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating (0-5, blank for no rating)
              <input name="rating" placeholder="4.3" />
            </label>
            <label>
              Confidence (0-1)
              <input name="confidence" placeholder="0.82" />
            </label>
            <label>
              Reason tags (comma-separated)
              <input name="reasonTags" placeholder="third_party_lab_docs,cold_chain_policy" />
            </label>
            <label>
              Method version
              <input name="methodVersion" defaultValue="manual_admin_v1" />
            </label>
            <button className="btn primary" type="submit">
              Save Rating Snapshot
            </button>
          </form>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Status Labels</h2>
          <p className="muted">Regulatory status values accepted by the database.</p>
        </div>
        <div>
          {REGULATORY_STATUSES.map((status) => (
            <span key={status} className="chip">
              {status}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
