import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { StarRating } from "@/app/components/star-rating";
import { labelFromSnake } from "@/lib/constants";
import { capitalizeLeadingLetter } from "@/lib/display-format";
import { getPeptideDetail, listPeptides } from "@/lib/repository";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";
import type { PeptideSummary } from "@/lib/types";
import { sanitizeInternalPath } from "@/lib/url-security";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined> | undefined>;
};

type SearchValue = string | string[] | undefined;
type SearchParams = Record<string, SearchValue>;

const EVIDENCE_RANK: Record<PeptideSummary["evidenceGrade"], number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  I: 4
};

const SECTION_ID = {
  features: "features",
  useCases: "use-cases",
  effectiveness: "effectiveness",
  dosing: "dosing",
  safety: "safety",
  vendors: "vendors",
  longDescription: "long-description",
  communitySignals: "community-signals",
  evidence: "evidence-and-references",
  related: "related-peptides"
} as const;

function statusLabel(value: string): string {
  if (value === "US_FDA_APPROVED") {
    return "FDA Approved";
  }
  if (value === "NON_US_APPROVED") {
    return "Approved";
  }
  if (value === "INVESTIGATIONAL" || value === "RESEARCH_ONLY") {
    return "Not approved";
  }
  return "Not approved";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatEvidenceType(value: string): string {
  const cleaned = value.replace(/^External Sources:\s*/i, "").trim();
  return cleaned || value;
}

function asSingle(value: SearchValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function combineOverview(intro: string, mechanism: string): string {
  const introText = intro.trim();
  const mechanismText = mechanism.trim();
  if (!mechanismText) {
    return introText;
  }
  if (!introText) {
    return mechanismText;
  }
  if (introText.toLowerCase().includes(mechanismText.toLowerCase())) {
    return introText;
  }
  return `${introText} ${mechanismText}`;
}

function parseLongDescriptionSections(value: string): Array<{ title: string | null; body: string }> {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const match = block.match(/^([A-Za-z][A-Za-z0-9 &/()-]{2,80}):\s*([\s\S]+)$/);
      if (!match) {
        return { title: null, body: block };
      }
      return {
        title: match[1]?.trim() ?? null,
        body: (match[2] ?? "").trim()
      };
    })
    .filter((section) => Boolean(section.body));
}

function breadcrumbLabelForFromPath(fromPath: string | null): string {
  if (!fromPath) {
    return "Peptides";
  }
  if (fromPath.startsWith("/peptides?")) {
    return "Search Results";
  }
  if (fromPath.startsWith("/peptides")) {
    return "Peptides";
  }
  if (fromPath.startsWith("/vendors")) {
    return "Vendors";
  }
  return "Browse";
}

function sortByEvidenceThenName(peptides: PeptideSummary[]): PeptideSummary[] {
  return [...peptides].sort((a, b) => {
    const gradeRank = EVIDENCE_RANK[a.evidenceGrade] - EVIDENCE_RANK[b.evidenceGrade];
    if (gradeRank !== 0) {
      return gradeRank;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const peptide = await getPeptideDetail(slug);
  if (!peptide) {
    return {
      title: "Peptide Not Found",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: capitalizeLeadingLetter(peptide.name),
    description: peptide.intro,
    alternates: {
      canonical: `/peptides/${peptide.slug}`
    },
    openGraph: {
      type: "article",
      title: `${capitalizeLeadingLetter(peptide.name)} Reference`,
      description: peptide.intro,
      url: absoluteUrl(`/peptides/${peptide.slug}`)
    }
  };
}

export default async function PeptideDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) as SearchParams | undefined;
  const fromPath = sanitizeInternalPath(asSingle(resolvedSearchParams?.from), ["/peptides", "/vendors"]);
  const backPath = fromPath ?? "/peptides";
  const backLabel = breadcrumbLabelForFromPath(fromPath);

  const [peptide, allPeptides] = await Promise.all([getPeptideDetail(slug), listPeptides()]);

  if (!peptide) {
    notFound();
  }
  const displayName = capitalizeLeadingLetter(peptide.name);
  const overviewText = combineOverview(peptide.intro, peptide.mechanism);
  const longDescriptionSections = parseLongDescriptionSections(peptide.longDescription);

  const relatedByUseCase = peptide.useCases
    .map((useCase) => {
      const relatedPeptides = sortByEvidenceThenName(
        allPeptides.filter((candidate) => candidate.slug !== peptide.slug && candidate.useCases.includes(useCase))
      ).slice(0, 4);

      return {
        useCase,
        relatedPeptides
      };
    })
    .filter((group) => group.relatedPeptides.length > 0);

  const communityClaims = peptide.evidenceClaims.filter((claim) => claim.section.startsWith("Community Signals"));
  const nonCommunityClaims = peptide.evidenceClaims.filter((claim) => !claim.section.startsWith("Community Signals"));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${displayName} Peptide Reference`,
    url: absoluteUrl(`/peptides/${peptide.slug}`),
    description: peptide.intro,
    about: {
      "@type": "MedicalEntity",
      name: displayName,
      alternateName: peptide.aliases,
      description: peptide.longDescription
    },
    mainEntity: {
      "@type": "MedicalEntity",
      name: displayName,
      alternateName: peptide.aliases,
      description: peptide.longDescription
    },
    citation: peptide.evidenceClaims.slice(0, 20).map((claim) => ({
      "@type": "CreativeWork",
      name: claim.sourceTitle ?? "Evidence source",
      url: claim.sourceUrl,
      datePublished: claim.publishedAt
    }))
  };

  return (
    <article className="grid" itemScope itemType="https://schema.org/MedicalEntity">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: backLabel, href: backPath }, { label: displayName }]} />
      <section className="card hero">
        <h1 itemProp="name">{displayName}</h1>
        <div className="meta-row">
          {Object.entries(peptide.statusByJurisdiction).map(([jurisdiction, status]) => (
            <span key={jurisdiction} className="chip">
              {jurisdiction}: {statusLabel(status)}
            </span>
          ))}
        </div>
        <p itemProp="description" className="overview-text">
          {overviewText}
        </p>
      </section>

      <section className="card section-nav-card">
        <h2>On This Page</h2>
        <div className="section-nav-links">
          <a href={`#${SECTION_ID.features}`} className="chip chip-link">
            Features
          </a>
          <a href={`#${SECTION_ID.useCases}`} className="chip chip-link">
            Use Cases
          </a>
          <a href={`#${SECTION_ID.effectiveness}`} className="chip chip-link">
            Effectiveness
          </a>
          <a href={`#${SECTION_ID.dosing}`} className="chip chip-link">
            Dosing
          </a>
          <a href={`#${SECTION_ID.safety}`} className="chip chip-link">
            Safety
          </a>
          <a href={`#${SECTION_ID.vendors}`} className="chip chip-link">
            Vendors
          </a>
          <a href={`#${SECTION_ID.longDescription}`} className="chip chip-link">
            Long Description
          </a>
          <a href={`#${SECTION_ID.communitySignals}`} className="chip chip-link">
            Community Signals
          </a>
          <a href={`#${SECTION_ID.evidence}`} className="chip chip-link">
            Evidence
          </a>
          <a href={`#${SECTION_ID.related}`} className="chip chip-link">
            Related
          </a>
        </div>
      </section>

      <section className="card" id={SECTION_ID.features}>
        <h2>Features</h2>
        <div className="table-scroll">
          <table>
            <tbody>
              {Object.entries(peptide.featureTable).map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id={SECTION_ID.useCases}>
        <h2>Use Cases</h2>
        {peptide.useCases.map((useCase) => (
          <Link
            key={useCase}
            className="chip chip-link"
            href={`/peptides?useCase=${encodeURIComponent(useCase)}`}
          >
            {useCase}
          </Link>
        ))}
      </section>

      <section className="card" id={SECTION_ID.effectiveness}>
        <h2>Effectiveness</h2>
        <p>{peptide.effectivenessSummary}</p>
      </section>

      <section className="card" id={SECTION_ID.dosing}>
        <h2>Dosing</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Context</th>
                <th>Population</th>
                <th>Route</th>
                <th>Start</th>
                <th>Maintenance</th>
                <th>Frequency</th>
              </tr>
            </thead>
            <tbody>
              {peptide.dosing.map((dosing) => (
                <tr key={`${dosing.context}-${dosing.population}`}>
                  <td>{statusLabel(dosing.context)}</td>
                  <td>{dosing.population}</td>
                  <td>{dosing.route}</td>
                  <td>{dosing.startingDose}</td>
                  <td>{dosing.maintenanceDose}</td>
                  <td>{dosing.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id={SECTION_ID.safety}>
        <h2>Safety</h2>
        <div className="safety-grid">
          <article className="safety-item">
            <h3>Adverse Effects</h3>
            <p>{peptide.safety.adverseEffects}</p>
          </article>
          <article className="safety-item">
            <h3>Contraindications</h3>
            <p>{peptide.safety.contraindications}</p>
          </article>
          <article className="safety-item">
            <h3>Interactions</h3>
            <p>{peptide.safety.interactions}</p>
          </article>
          <article className="safety-item">
            <h3>Monitoring</h3>
            <p>{peptide.safety.monitoring}</p>
          </article>
        </div>
      </section>

      <section className="card" id={SECTION_ID.vendors}>
        <h2>Vendors</h2>
        <div className="grid two">
          {peptide.vendors.map((vendor) => (
            <article className="card" key={vendor.slug} itemScope itemType="https://schema.org/Organization">
              <h3 itemProp="name">
                <Link href={`/vendors/${vendor.slug}?from=${encodeURIComponent(`/peptides/${peptide.slug}`)}`} itemProp="url">
                  {vendor.name}
                </Link>
              </h3>
              <p>
                Rating: <strong><StarRating rating={vendor.rating} idPrefix={`peptide-vendor-${vendor.slug}`} /></strong>
              </p>
              <p className="muted">
                Confidence:{" "}
                {vendor.confidence === null ? "N/A" : `${Math.round(vendor.confidence * 100)}%`}
              </p>
              <div>
                {vendor.reasonTags.map((reasonTag) => (
                  <Link
                    key={`${vendor.slug}-${reasonTag}`}
                    href={`/vendors?reasonTag=${encodeURIComponent(reasonTag)}`}
                    className="chip chip-link"
                  >
                    {labelFromSnake(reasonTag)}
                  </Link>
                ))}
              </div>
              {vendor.rating !== null ? (
                <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                  <meta itemProp="ratingValue" content={vendor.rating.toFixed(1)} />
                  <meta itemProp="bestRating" content="5" />
                  <meta itemProp="worstRating" content="0" />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="card" id={SECTION_ID.longDescription}>
        <h2>Long Description</h2>
        {longDescriptionSections.length === 0 ? (
          <p itemProp="abstract">{peptide.longDescription}</p>
        ) : (
          <div className="long-description-grid" itemProp="abstract">
            {longDescriptionSections.map((section, index) => (
              <article key={`${section.title ?? "section"}-${index}`} className="safety-item">
                {section.title ? <h3>{section.title}</h3> : null}
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card" id={SECTION_ID.communitySignals}>
        <h2>Community Signals</h2>
        {communityClaims.length === 0 ? (
          <p className="empty-state">No social/community signals are available for this peptide yet.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Summary</th>
                  <th>Evidence Grade</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {communityClaims.map((claim, index) => (
                  <tr key={`community-${claim.sourceUrl}-${index}`}>
                    <td>{claim.section}</td>
                    <td>{claim.claimText}</td>
                    <td>{claim.evidenceGrade ?? "N/A"}</td>
                    <td>
                      <a href={claim.sourceUrl} target="_blank" rel="noreferrer noopener">
                        Open source
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" id={SECTION_ID.evidence}>
        <h2>Evidence And References</h2>
        {nonCommunityClaims.length === 0 ? (
          <p className="empty-state">No curated citations have been added for this peptide yet.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Claim</th>
                  <th>Evidence Grade</th>
                  <th>Source</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {nonCommunityClaims.map((claim, index) => (
                  <tr key={`${claim.sourceUrl}-${index}`}>
                    <td>{formatEvidenceType(claim.section)}</td>
                    <td>{claim.claimText}</td>
                    <td>{claim.evidenceGrade ?? "N/A"}</td>
                    <td>
                      <a href={claim.sourceUrl} target="_blank" rel="noreferrer noopener">
                        {claim.sourceTitle ?? "Open source"}
                      </a>
                    </td>
                    <td>{formatDate(claim.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" id={SECTION_ID.related}>
        <h2>More Peptides in Similar Categories</h2>
        {relatedByUseCase.length === 0 ? (
          <p className="empty-state">No same-category peptide matches are available yet.</p>
        ) : (
          <div className="grid two">
            {relatedByUseCase.map((group) => (
              <article key={group.useCase} className="card">
                <h3>
                  <Link href={`/peptides?useCase=${encodeURIComponent(group.useCase)}`}>{group.useCase}</Link>
                </h3>
                <div className="home-link-list">
                  {group.relatedPeptides.map((relatedPeptide) => {
                    const returnTo = `/peptides?useCase=${encodeURIComponent(group.useCase)}`;
                    return (
                      <Link
                        key={`${group.useCase}-${relatedPeptide.slug}`}
                        href={`/peptides/${relatedPeptide.slug}?from=${encodeURIComponent(returnTo)}`}
                        className="subtle-link"
                      >
                        {capitalizeLeadingLetter(relatedPeptide.name)}
                      </Link>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
