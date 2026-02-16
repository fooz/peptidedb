import Link from "next/link";
import { logoutAdminAction } from "@/app/admin/auth-actions";
import {
  addDosingAction,
  addUseCaseAction,
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

function firstParam(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdminAuth();

  const notice = firstParam(searchParams?.notice);
  const kind = firstParam(searchParams?.kind);
  const editPeptide = firstParam(searchParams?.editPeptide);
  const editVendor = firstParam(searchParams?.editVendor);
  const data = await getAdminDashboardData(editPeptide, editVendor);

  const selectedPeptide = data.selectedPeptide;
  const selectedVendor = data.selectedVendor;

  return (
    <div className="grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem" }}>
          <div>
            <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Create, edit, and publish peptides and vendors.
            </p>
          </div>
          <form action={logoutAdminAction}>
            <button className="btn" type="submit">
              Sign Out
            </button>
          </form>
        </div>
        {notice ? (
          <p style={{ color: kind === "error" ? "#b91c1c" : "#0f766e", marginBottom: 0 }}>
            <strong>{notice}</strong>
          </p>
        ) : null}
      </section>

      {!data.supabaseConfigured ? (
        <section className="card">
          <p style={{ color: "#b91c1c", margin: 0 }}>
            <strong>Missing server setup:</strong> add `SUPABASE_SERVICE_ROLE_KEY` in Vercel before admin writes will
            work.
          </p>
        </section>
      ) : null}

      <section className="grid two">
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Peptides</h2>
          <p className="muted">Use edit links to load existing content into the form.</p>
          <div className="grid" style={{ maxHeight: 240, overflowY: "auto" }}>
            {data.peptides.map((peptide) => (
              <div key={peptide.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
                <span>
                  {peptide.name} {peptide.isPublished ? <span className="chip">Published</span> : <span className="chip">Draft</span>}
                </span>
                <Link href={`/admin?editPeptide=${encodeURIComponent(peptide.slug)}`}>Edit</Link>
              </div>
            ))}
          </div>
        </article>
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Vendors</h2>
          <p className="muted">Vendors can be draft/published separately from peptide pages.</p>
          <div className="grid" style={{ maxHeight: 240, overflowY: "auto" }}>
            {data.vendors.map((vendor) => (
              <div key={vendor.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
                <span>
                  {vendor.name} {vendor.isPublished ? <span className="chip">Published</span> : <span className="chip">Draft</span>}
                </span>
                <Link href={`/admin?editVendor=${encodeURIComponent(vendor.slug)}`}>Edit</Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Create Or Edit Peptide</h2>
        <form action={upsertPeptideAction} className="grid two">
          <label>
            Slug
            <input
              name="slug"
              defaultValue={selectedPeptide?.slug ?? ""}
              placeholder="semaglutide"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label>
            Canonical name
            <input
              name="canonicalName"
              defaultValue={selectedPeptide?.canonicalName ?? ""}
              placeholder="Semaglutide"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label>
            Sequence
            <input
              name="sequence"
              defaultValue={selectedPeptide?.sequence ?? ""}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label>
            Peptide class
            <input
              name="peptideClass"
              defaultValue={selectedPeptide?.peptideClass ?? ""}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Intro (consumer)
            <textarea
              name="intro"
              defaultValue={selectedPeptide?.intro ?? ""}
              rows={3}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Mechanism (clinical)
            <textarea
              name="mechanism"
              defaultValue={selectedPeptide?.mechanism ?? ""}
              rows={3}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Effectiveness summary
            <textarea
              name="effectivenessSummary"
              defaultValue={selectedPeptide?.effectivenessSummary ?? ""}
              rows={3}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Long description
            <textarea
              name="longDescription"
              defaultValue={selectedPeptide?.longDescription ?? ""}
              rows={4}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input name="isPublished" type="checkbox" defaultChecked={selectedPeptide?.isPublished ?? false} />
            Published on public site
          </label>
          <div>
            <button className="btn" type="submit">
              Save Peptide
            </button>
          </div>
        </form>
      </section>

      <section className="grid two">
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Use Case Entry</h2>
          <form action={addUseCaseAction} className="grid">
            <label>
              Peptide
              <select name="peptideId" style={{ width: "100%", marginTop: "0.35rem" }}>
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
              <input name="useCaseName" placeholder="Weight Management" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Use case slug (optional)
              <input name="useCaseSlug" placeholder="weight-management" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Jurisdiction
              <select name="jurisdiction" style={{ width: "100%", marginTop: "0.35rem" }}>
                {data.jurisdictions.length > 0
                  ? data.jurisdictions.map((jurisdiction) => (
                      <option key={jurisdiction.code} value={jurisdiction.code}>
                        {jurisdiction.code} - {jurisdiction.name}
                      </option>
                    ))
                  : JURISDICTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
              </select>
            </label>
            <label>
              Evidence grade
              <select name="evidenceGrade" style={{ width: "100%", marginTop: "0.35rem" }}>
                {EVIDENCE_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Consumer summary
              <textarea name="consumerSummary" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Clinical summary
              <textarea name="clinicalSummary" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <button className="btn" type="submit">
              Save Use Case
            </button>
          </form>
        </article>

        <article className="card">
          <h2 style={{ marginTop: 0 }}>Dosing Entry</h2>
          <form action={addDosingAction} className="grid">
            <label>
              Peptide
              <select name="peptideId" style={{ width: "100%", marginTop: "0.35rem" }}>
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
              <select name="jurisdiction" style={{ width: "100%", marginTop: "0.35rem" }}>
                {data.jurisdictions.length > 0
                  ? data.jurisdictions.map((jurisdiction) => (
                      <option key={jurisdiction.code} value={jurisdiction.code}>
                        {jurisdiction.code} - {jurisdiction.name}
                      </option>
                    ))
                  : JURISDICTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
              </select>
            </label>
            <label>
              Context
              <select name="context" style={{ width: "100%", marginTop: "0.35rem" }}>
                <option value="APPROVED_LABEL">APPROVED_LABEL</option>
                <option value="STUDY_REPORTED">STUDY_REPORTED</option>
                <option value="EXPERT_CONSENSUS">EXPERT_CONSENSUS</option>
              </select>
            </label>
            <label>
              Population
              <input name="population" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Route
              <input name="route" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Starting dose
              <input name="startingDose" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Maintenance dose
              <input name="maintenanceDose" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Frequency
              <input name="frequency" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <button className="btn" type="submit">
              Add Dosing Entry
            </button>
          </form>
        </article>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Safety Entry</h2>
        <form action={upsertSafetyAction} className="grid two">
          <label>
            Peptide
            <select name="peptideId" style={{ width: "100%", marginTop: "0.35rem" }}>
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
            <select name="jurisdiction" style={{ width: "100%", marginTop: "0.35rem" }}>
              {data.jurisdictions.length > 0
                ? data.jurisdictions.map((jurisdiction) => (
                    <option key={jurisdiction.code} value={jurisdiction.code}>
                      {jurisdiction.code} - {jurisdiction.name}
                    </option>
                  ))
                : JURISDICTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Adverse effects
            <textarea name="adverseEffects" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Contraindications
            <textarea name="contraindications" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Interactions
            <textarea name="interactions" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Monitoring
            <textarea name="monitoring" rows={3} style={{ width: "100%", marginTop: "0.35rem" }} />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit">
              Save Safety Entry
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Create Or Edit Vendor</h2>
        <form action={upsertVendorAction} className="grid two">
          <label>
            Slug
            <input
              name="slug"
              defaultValue={selectedVendor?.slug ?? ""}
              placeholder="nova-peptide-labs"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label>
            Name
            <input
              name="name"
              defaultValue={selectedVendor?.name ?? ""}
              placeholder="Nova Peptide Labs"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Website URL
            <input
              name="websiteUrl"
              defaultValue={selectedVendor?.websiteUrl ?? ""}
              placeholder="https://vendor-site.com"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input name="isPublished" type="checkbox" defaultChecked={selectedVendor?.isPublished ?? false} />
            Published on public site
          </label>
          <div>
            <button className="btn" type="submit">
              Save Vendor
            </button>
          </div>
        </form>
      </section>

      <section className="grid two">
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Vendor Peptide Listing</h2>
          <form action={upsertVendorListingAction} className="grid">
            <label>
              Vendor
              <select name="vendorId" style={{ width: "100%", marginTop: "0.35rem" }}>
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
              <select name="peptideId" style={{ width: "100%", marginTop: "0.35rem" }}>
                <option value="">Select peptide</option>
                {data.peptides.map((peptide) => (
                  <option key={peptide.id} value={peptide.id}>
                    {peptide.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input name="isAffiliate" type="checkbox" />
              Affiliate listing
            </label>
            <label>
              Affiliate URL
              <input name="affiliateUrl" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Product URL
              <input name="productUrl" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <button className="btn" type="submit">
              Save Listing
            </button>
          </form>
        </article>

        <article className="card">
          <h2 style={{ marginTop: 0 }}>Vendor Rating Snapshot</h2>
          <form action={upsertVendorRatingAction} className="grid">
            <label>
              Vendor
              <select name="vendorId" style={{ width: "100%", marginTop: "0.35rem" }}>
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
              <input name="rating" placeholder="4.3" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Confidence (0-1)
              <input name="confidence" placeholder="0.82" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <label>
              Reason tags (comma-separated)
              <input
                name="reasonTags"
                placeholder="third_party_lab_docs,cold_chain_policy"
                style={{ width: "100%", marginTop: "0.35rem" }}
              />
            </label>
            <label>
              Method version
              <input name="methodVersion" defaultValue="manual_admin_v1" style={{ width: "100%", marginTop: "0.35rem" }} />
            </label>
            <button className="btn" type="submit">
              Save Rating Snapshot
            </button>
          </form>
        </article>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Status Labels</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Regulatory status values accepted by the database:
        </p>
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
