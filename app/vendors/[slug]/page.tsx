import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { StarRating } from "@/app/components/star-rating";
import { labelFromSnake } from "@/lib/constants";
import { capitalizeLeadingLetter } from "@/lib/display-format";
import { getVendorDetail } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";
import { sanitizeInternalPath } from "@/lib/url-security";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined> | undefined>;
};

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function asSingle(value: SearchValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function breadcrumbLabelForFromPath(fromPath: string | null): string {
  if (!fromPath) {
    return "Vendors";
  }
  if (fromPath.startsWith("/vendors?")) {
    return "Search Results";
  }
  if (fromPath.startsWith("/vendors")) {
    return "Vendors";
  }
  if (fromPath.startsWith("/peptides")) {
    return "Peptides";
  }
  return "Browse";
}

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

export default async function VendorDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) as SearchParams | undefined;
  const fromPath = sanitizeInternalPath(asSingle(resolvedSearchParams?.from), ["/vendors", "/peptides"]);
  const backPath = fromPath ?? "/vendors";
  const backLabel = breadcrumbLabelForFromPath(fromPath);

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
        : {}),
      ...(vendor.reviews.length > 0
        ? {
            review: vendor.reviews.slice(0, 6).map((review) => ({
              "@type": "Review",
              reviewBody: review.quote,
              datePublished: review.createdAt,
              author: {
                "@type": "Person",
                name: review.author ?? "Community user"
              },
              isBasedOn: review.sourceUrl
            }))
          }
        : {})
    }
  };

  return (
    <div className="grid">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: backLabel, href: backPath }, { label: vendor.name }]} />

      <section className="card hero">
        <h1>{vendor.name}</h1>
        <p>{vendor.description}</p>
        <p>
          Rating: <strong><StarRating rating={vendor.rating} idPrefix={`vendor-detail-${vendor.slug}`} /></strong>
        </p>
        <p className="muted">
          Confidence: {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
        </p>
        {vendor.socialSentimentLabel ? (
          <p className="muted">
            Community sentiment:{" "}
            <strong>
              {vendor.socialSentimentLabel}
              {vendor.socialSentimentScore !== null ? ` (${vendor.socialSentimentScore.toFixed(2)})` : ""}
            </strong>
          </p>
        ) : null}
        {vendor.websiteUrl ? (
          <p>
            <a href={vendor.websiteUrl} target="_blank" rel="noreferrer noopener">
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
        <h2>Community Review Quotes</h2>
        {vendor.reviews.length === 0 ? (
          <p className="empty-state">No community review quotes have been ingested for this vendor yet.</p>
        ) : (
          <div className="grid">
            {vendor.reviews.slice(0, 12).map((review, index) => (
              <article key={`${review.sourceUrl}-${index}`} className="card">
                <p>
                  <strong>{review.community}</strong> · {review.sentimentLabel}
                  {review.sentimentScore !== null ? ` (${review.sentimentScore.toFixed(2)})` : ""}
                </p>
                <p>"{review.quote}"</p>
                <p className="muted">
                  {review.author ?? "Community user"} · {formatDate(review.createdAt)}
                </p>
                <p>
                  <a href={review.sourceUrl} target="_blank" rel="noreferrer noopener">
                    View source
                  </a>
                </p>
              </article>
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
                  <Link href={`/peptides/${peptide.slug}?from=${encodeURIComponent(`/vendors/${vendor.slug}`)}`}>
                    {capitalizeLeadingLetter(peptide.name)}
                  </Link>
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
