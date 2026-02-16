import { listVendors } from "@/lib/repository";

export default async function VendorsPage() {
  const vendors = await listVendors();

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Vendor Directory</h1>
        <p className="muted">
          Ratings are research-derived and non-user-submitted. Affiliate status does not affect score.
        </p>
      </section>
      <div className="grid two">
        {vendors.map((vendor) => (
          <article key={vendor.slug} className="card">
            <h2 style={{ marginTop: 0 }}>{vendor.name}</h2>
            <p>
              Rating:{" "}
              <strong>
                {vendor.rating === null || vendor.confidence === null
                  ? "No rating"
                  : `${vendor.rating.toFixed(1)} stars`}
              </strong>
            </p>
            <p className="muted">
              Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
            </p>
            <p className="muted">{vendor.reasonTags.join(", ")}</p>
            {vendor.isAffiliate ? <span className="chip">Affiliate</span> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
