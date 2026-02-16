import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarRating } from "@/app/components/star-rating";
import { labelFromSnake } from "@/lib/constants";
import { getVendorDetail } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorDetail(slug);
  if (!vendor) {
    return {
      title: "Vendor Not Found",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: vendor.name,
    description: vendor.description,
    alternates: {
      canonical: `/vendors/${vendor.slug}`
    },
    openGraph: {
      type: "article",
      title: `${vendor.name} Vendor Profile`,
      description: vendor.description,
      url: absoluteUrl(`/vendors/${vendor.slug}`)
    }
  };
}

export default async function VendorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorDetail(slug);
  if (!vendor) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${vendor.name} Vendor Profile`,
    url: absoluteUrl(`/vendors/${vendor.slug}`),
    mainEntity: {
      "@type": "Organization",
      name: vendor.name,
      url: vendor.websiteUrl || absoluteUrl(`/vendors/${vendor.slug}`),
      description: vendor.description,
      ...(vendor.rating !== null
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: vendor.rating.toFixed(1),
              bestRating: "5",
              worstRating: "0"
            }
          }
        : {})
    }
  };

  return (
    <div className="grid">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />

      <section className="card hero">
        <h1>{vendor.name}</h1>
        <p>{vendor.description}</p>
        <p>
          Rating: <strong><StarRating rating={vendor.rating} idPrefix={`vendor-detail-${vendor.slug}`} /></strong>
        </p>
        <p className="muted">
          Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
        </p>
        {vendor.websiteUrl ? (
          <p>
            <a href={vendor.websiteUrl} target="_blank" rel="noreferrer">
              Visit vendor website
            </a>
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2>Features</h2>
        {vendor.features.length === 0 ? (
          <p className="empty-state">No feature details have been curated yet.</p>
        ) : (
          <div>
            {vendor.features.map((feature) => (
              <span key={feature} className="chip">
                {feature}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Trust Signals</h2>
        {vendor.trustSignals.length === 0 ? (
          <p className="empty-state">No trust signals available.</p>
        ) : (
          <div>
            {vendor.trustSignals.map((signal) => (
              <Link
                key={signal}
                className="chip chip-link"
                href={`/vendors?reasonTag=${encodeURIComponent(signal)}`}
              >
                {labelFromSnake(signal)}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Available Peptides</h2>
        {vendor.availablePeptides.length === 0 ? (
          <p className="empty-state">No linked peptide listings yet.</p>
        ) : (
          <div className="grid two">
            {vendor.availablePeptides.map((peptide) => (
              <article key={peptide.slug} className="card">
                <h3>
                  <Link href={`/peptides/${peptide.slug}`}>{peptide.name}</Link>
                </h3>
                <p className="muted">{peptide.className}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
