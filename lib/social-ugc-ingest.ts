import type { SupabaseClient } from "@supabase/supabase-js";
import { toHumanReadableSourceUrl } from "@/lib/reference-sources";
import { computeVendorScore } from "@/lib/vendor-website-ingest";
import type { EvidenceGrade } from "@/lib/types";

type EntityType = "peptide" | "vendor";

type UgcPost = {
  source: "reddit" | "hacker_news" | "trustpilot";
  community: string;
  id: string;
  title: string;
  body: string;
  quote: string;
  url: string;
  searchUrl: string;
  author: string;
  score: number;
  commentCount: number;
  createdAt: string;
  matchedTerm: string;
  sentimentScore: number;
  sentimentLabel: "positive" | "mixed" | "negative" | "neutral";
};

type UgcSourceAdapter = {
  source: UgcPost["source"];
  displayName: string;
  fetchByTerm(term: string, entityType: EntityType): Promise<UgcPost[]>;
};

type PeptideRow = {
  id: number;
  slug: string;
  name: string;
  aliases: string[];
};

type VendorRow = {
  id: number;
  slug: string;
  name: string;
  websiteUrl: string;
};

type SocialUgcIngestOptions = {
  peptideLimit?: number;
  vendorLimit?: number;
  peptideSlugs?: string[];
  vendorSlugs?: string[];
  onlyPublished?: boolean;
  delayMs?: number;
  maxTermsPerEntity?: number;
  maxQuotesPerVendor?: number;
};

type SocialUgcIngestResult = {
  peptidesScanned: number;
  peptidesUpdated: number;
  peptideClaimsInserted: number;
  vendorsScanned: number;
  vendorsUpdated: number;
  vendorReviewsInserted: number;
  vendorRatingsUpdated: number;
  sourceHits: {
    reddit: number;
    hackerNews: number;
    trustpilot: number;
  };
  failures: number;
};

const REDDIT_SUBREDDITS = [
  "Peptides",
  "Supplements",
  "Biohacking",
  "Nootropics",
  "StackAdvice",
  "Steroids",
  "Semaglutide"
];

const REDDIT_GLOBAL_ALLOWED = new Set(
  [...REDDIT_SUBREDDITS, "Biohackers", "weightloss", "Ozempic", "Mounjaro", "Semaglutide", "tirzepatide"].map((entry) =>
    entry.toLowerCase()
  )
);

const COMMUNITY_CLAIM_SECTIONS = ["Community Signals (Reddit)", "Community Signals (Hacker News)", "Community Signals (Trustpilot)"];

const POSITIVE_WORDS = [
  "effective",
  "helped",
  "improved",
  "legit",
  "reliable",
  "quality",
  "transparent",
  "consistent",
  "trusted",
  "good",
  "great",
  "excellent",
  "recommend"
];

const NEGATIVE_WORDS = [
  "scam",
  "fake",
  "bunk",
  "contaminated",
  "contamination",
  "bad",
  "worse",
  "ineffective",
  "adverse",
  "side effect",
  "problem",
  "avoid",
  "unsafe",
  "delayed",
  "refund issue"
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function truncate(text: string, max = 240): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}...`;
}

function toIsoDay(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function containsTerm(text: string, term: string): boolean {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) {
    return false;
  }
  return normalizedText.includes(` ${normalizedTerm} `);
}

function extractQuote(title: string, body: string): string {
  const source = body && body.length > 20 ? body : title;
  const firstSentence = source.split(/(?<=[.?!])\s+/)[0] ?? source;
  return truncate(firstSentence, 210);
}

function analyzeSentiment(text: string): { score: number; label: "positive" | "mixed" | "negative" | "neutral" } {
  const lower = normalize(text);
  if (!lower) {
    return { score: 0, label: "neutral" };
  }

  let positive = 0;
  let negative = 0;
  for (const token of POSITIVE_WORDS) {
    if (lower.includes(token)) {
      positive += 1;
    }
  }
  for (const token of NEGATIVE_WORDS) {
    if (lower.includes(token)) {
      negative += 1;
    }
  }

  const raw = positive - negative;
  const score = Math.max(-1, Math.min(1, Number((raw / Math.max(1, positive + negative + 1)).toFixed(2))));

  if (score >= 0.28) {
    return { score, label: "positive" };
  }
  if (score <= -0.28) {
    return { score, label: "negative" };
  }
  if (Math.abs(score) < 0.12) {
    return { score, label: "neutral" };
  }
  return { score, label: "mixed" };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "PeptideDB-SocialIngest/1.0 (+https://peptidedb.vercel.app)"
      },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

class RedditAdapter implements UgcSourceAdapter {
  source: UgcPost["source"] = "reddit";
  displayName = "Reddit";

  async fetchByTerm(term: string, _entityType: EntityType): Promise<UgcPost[]> {
    const posts: UgcPost[] = [];
    const normalizedTerm = normalize(term);
    if (!normalizedTerm || normalizedTerm.length < 3) {
      return posts;
    }

    for (const subreddit of REDDIT_SUBREDDITS) {
      const searchUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&sort=new&t=year&limit=20`;
      try {
        const payload = asRecord(await fetchJson(searchUrl));
        const children = asArray(asRecord(payload?.data)?.children);
        for (const child of children) {
          const data = asRecord(asRecord(child)?.data);
          if (!data) {
            continue;
          }
          const title = asString(data.title);
          const body = asString(data.selftext);
          const fullText = `${title} ${body}`.trim();
          if (!containsTerm(fullText, term)) {
            continue;
          }

          const permalink = asString(data.permalink);
          const url = permalink ? `https://www.reddit.com${permalink}` : asString(data.url);
          if (!url) {
            continue;
          }

          const createdUtc = asNumber(data.created_utc);
          const createdAt = createdUtc > 0 ? new Date(createdUtc * 1000).toISOString() : new Date().toISOString();
          const quote = extractQuote(title, body);
          const sentiment = analyzeSentiment(`${title} ${quote}`);

          posts.push({
            source: "reddit",
            community: `r/${subreddit}`,
            id: asString(data.id) || `${subreddit}-${createdAt}-${title.slice(0, 24)}`,
            title,
            body,
            quote,
            url,
            searchUrl,
            author: asString(data.author) || "unknown",
            score: asNumber(data.score),
            commentCount: asNumber(data.num_comments),
            createdAt,
            matchedTerm: term,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label
          });
        }
      } catch {
        continue;
      }
    }

    const globalSearchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=new&t=year&limit=35`;
    try {
      const payload = asRecord(await fetchJson(globalSearchUrl));
      const children = asArray(asRecord(payload?.data)?.children);
      for (const child of children) {
        const data = asRecord(asRecord(child)?.data);
        if (!data) {
          continue;
        }
        const subreddit = asString(data.subreddit);
        if (!subreddit || !REDDIT_GLOBAL_ALLOWED.has(subreddit.toLowerCase())) {
          continue;
        }

        const title = asString(data.title);
        const body = asString(data.selftext);
        const fullText = `${title} ${body}`.trim();
        if (!containsTerm(fullText, term)) {
          continue;
        }

        const permalink = asString(data.permalink);
        const url = permalink ? `https://www.reddit.com${permalink}` : asString(data.url);
        if (!url) {
          continue;
        }

        const createdUtc = asNumber(data.created_utc);
        const createdAt = createdUtc > 0 ? new Date(createdUtc * 1000).toISOString() : new Date().toISOString();
        const quote = extractQuote(title, body);
        const sentiment = analyzeSentiment(`${title} ${quote}`);

        posts.push({
          source: "reddit",
          community: `r/${subreddit}`,
          id: asString(data.id) || `${subreddit}-${createdAt}-${title.slice(0, 24)}`,
          title,
          body,
          quote,
          url,
          searchUrl: globalSearchUrl,
          author: asString(data.author) || "unknown",
          score: asNumber(data.score),
          commentCount: asNumber(data.num_comments),
          createdAt,
          matchedTerm: term,
          sentimentScore: sentiment.score,
          sentimentLabel: sentiment.label
        });
      }
    } catch {
      // ignore global-search failures
    }

    return posts;
  }
}

class HackerNewsAdapter implements UgcSourceAdapter {
  source: UgcPost["source"] = "hacker_news";
  displayName = "Hacker News";

  async fetchByTerm(term: string, _entityType: EntityType): Promise<UgcPost[]> {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm || normalizedTerm.length < 3) {
      return [];
    }

    const searchUrl = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(term)}&tags=story,comment&hitsPerPage=25`;

    try {
      const payload = asRecord(await fetchJson(searchUrl));
      const hits = asArray(payload?.hits);
      const posts: UgcPost[] = [];
      for (const entry of hits) {
        const row = asRecord(entry);
        if (!row) {
          continue;
        }
        const title = asString(row.title) || asString(row.story_title);
        const body = asString(row.comment_text) || asString(row.story_text);
        const fullText = `${title} ${body}`.trim();
        if (!containsTerm(fullText, term)) {
          continue;
        }

        const objectId = asString(row.objectID);
        const permalink = objectId ? `https://news.ycombinator.com/item?id=${encodeURIComponent(objectId)}` : "";
        const url = permalink || asString(row.url);
        if (!url) {
          continue;
        }

        const createdAt = asString(row.created_at) || new Date().toISOString();
        const quote = extractQuote(title, body);
        const sentiment = analyzeSentiment(`${title} ${quote}`);

        posts.push({
          source: "hacker_news",
          community: "news.ycombinator.com",
          id: objectId || `${createdAt}-${title.slice(0, 24)}`,
          title,
          body,
          quote,
          url,
          searchUrl,
          author: asString(row.author) || "unknown",
          score: asNumber(row.points),
          commentCount: asNumber(row.num_comments),
          createdAt,
          matchedTerm: term,
          sentimentScore: sentiment.score,
          sentimentLabel: sentiment.label
        });
      }
      return posts;
    } catch {
      return [];
    }
  }
}

class TrustpilotAdapter implements UgcSourceAdapter {
  source: UgcPost["source"] = "trustpilot";
  displayName = "Trustpilot";

  async fetchByTerm(term: string, entityType: EntityType): Promise<UgcPost[]> {
    if (entityType !== "vendor") {
      return [];
    }
    const normalized = term.trim().toLowerCase();
    if (!normalized.includes(".") || normalized.length < 4) {
      return [];
    }

    const domain = normalized.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
    if (!domain || !domain.includes(".")) {
      return [];
    }

    const searchUrl = `https://www.trustpilot.com/review/${encodeURIComponent(domain)}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try {
        response = await fetch(searchUrl, {
          method: "GET",
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
          },
          cache: "no-store",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) {
        return [];
      }
      const html = await response.text();
      const nextDataMatch = html.match(/<script id=\"__NEXT_DATA__\" type=\"application\/json\">([\s\S]*?)<\/script>/i);
      if (!nextDataMatch?.[1]) {
        return [];
      }

      const payload = JSON.parse(nextDataMatch[1]);
      const pageProps = asRecord(asRecord(asRecord(payload)?.props)?.pageProps);
      const reviews = asArray(pageProps?.reviews);
      if (reviews.length === 0) {
        return [];
      }

      const posts: UgcPost[] = [];
      for (const entry of reviews.slice(0, 12)) {
        const row = asRecord(entry);
        if (!row) {
          continue;
        }
        const title = asString(row.title);
        const body = asString(row.text);
        if (!title && !body) {
          continue;
        }

        const quote = extractQuote(title, body);
        const sentiment = analyzeSentiment(`${title} ${body}`);
        const dates = asRecord(row.dates);
        const createdAt =
          asString(dates?.publishedDate) ||
          asString(dates?.experiencedDate) ||
          asString(dates?.createdAt) ||
          new Date().toISOString();
        const consumer = asRecord(row.consumer);

        posts.push({
          source: "trustpilot",
          community: "Trustpilot",
          id: asString(row.id) || `${domain}-${createdAt}-${title.slice(0, 24)}`,
          title,
          body,
          quote,
          url: searchUrl,
          searchUrl,
          author: asString(consumer?.displayName) || asString(consumer?.name) || "anonymous",
          score: asNumber(row.rating),
          commentCount: 0,
          createdAt,
          matchedTerm: domain,
          sentimentScore: sentiment.score,
          sentimentLabel: sentiment.label
        });
      }
      return posts;
    } catch {
      return [];
    }
  }
}

const UGC_ADAPTERS: UgcSourceAdapter[] = [new RedditAdapter(), new HackerNewsAdapter(), new TrustpilotAdapter()];

function rankPosts(posts: UgcPost[]): UgcPost[] {
  return [...posts].sort((a, b) => {
    const scoreA = a.score + a.commentCount * 0.9 + (a.sentimentLabel === "negative" ? 0.2 : 0);
    const scoreB = b.score + b.commentCount * 0.9 + (b.sentimentLabel === "negative" ? 0.2 : 0);
    return scoreB - scoreA;
  });
}

async function gatherUgcPosts(
  terms: string[],
  entityType: EntityType,
  maxTermsPerEntity: number
): Promise<{ posts: UgcPost[]; sourceHits: { reddit: number; hackerNews: number; trustpilot: number } }> {
  const selectedTerms = uniqueStrings(terms).slice(0, Math.max(1, maxTermsPerEntity));
  const allPosts: UgcPost[] = [];
  const sourceHits = { reddit: 0, hackerNews: 0, trustpilot: 0 };

  for (const adapter of UGC_ADAPTERS) {
    for (const term of selectedTerms) {
      const rows = await adapter.fetchByTerm(term, entityType);
      if (rows.length > 0) {
        if (adapter.source === "reddit") sourceHits.reddit += 1;
        if (adapter.source === "hacker_news") sourceHits.hackerNews += 1;
        if (adapter.source === "trustpilot") sourceHits.trustpilot += 1;
      }
      allPosts.push(...rows);
      await sleep(70);
    }
  }

  const deduped = new Map<string, UgcPost>();
  for (const post of allPosts) {
    const key = `${post.source}:${post.id}:${post.url}`;
    if (!deduped.has(key)) {
      deduped.set(key, post);
    }
  }

  return {
    posts: rankPosts(Array.from(deduped.values())),
    sourceHits
  };
}

async function findOrCreateCitationId(
  supabase: SupabaseClient,
  sourceUrl: string,
  sourceTitle: string,
  publishedAt: string
): Promise<number> {
  const normalizedSourceUrl = toHumanReadableSourceUrl(sourceUrl);
  if (!normalizedSourceUrl) {
    throw new Error("Missing or invalid social citation URL.");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("citations")
    .select("id")
    .eq("source_url", normalizedSourceUrl)
    .eq("published_at", publishedAt)
    .order("id", { ascending: false })
    .limit(1);
  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = asArray(existingRows)[0];
  const existingId = asNumber(asRecord(existing)?.id);
  if (existingId > 0) {
    return existingId;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("citations")
    .insert({
      source_url: normalizedSourceUrl,
      source_title: sourceTitle,
      published_at: publishedAt
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed inserting citation row.");
  }
  return Number(inserted.id);
}

function sentimentLabelFromAverage(score: number | null): "positive" | "mixed" | "negative" | "neutral" {
  if (score === null) {
    return "neutral";
  }
  if (score >= 0.24) return "positive";
  if (score <= -0.24) return "negative";
  if (Math.abs(score) < 0.1) return "neutral";
  return "mixed";
}

function averageSentiment(posts: UgcPost[]): number | null {
  if (posts.length === 0) {
    return null;
  }
  const total = posts.reduce((sum, post) => sum + post.sentimentScore, 0);
  return Number((total / posts.length).toFixed(3));
}

function sourceSectionLabel(source: UgcPost["source"]): string {
  if (source === "reddit") return "Community Signals (Reddit)";
  if (source === "hacker_news") return "Community Signals (Hacker News)";
  return "Community Signals (Trustpilot)";
}

function evidenceGradeFromPosts(posts: UgcPost[]): EvidenceGrade {
  if (posts.length >= 14) return "D";
  if (posts.length >= 5) return "D";
  return "I";
}

async function loadPeptides(supabase: SupabaseClient, options?: SocialUgcIngestOptions): Promise<PeptideRow[]> {
  let query = supabase
    .from("peptides")
    .select("id,slug,canonical_name,is_published,peptide_aliases(alias)")
    .order("canonical_name", { ascending: true });

  if (options?.onlyPublished ?? true) {
    query = query.eq("is_published", true);
  }
  if (options?.peptideSlugs && options.peptideSlugs.length > 0) {
    query = query.in("slug", options.peptideSlugs);
  }
  if (options?.peptideLimit && options.peptideLimit > 0) {
    query = query.limit(options.peptideLimit);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "Failed loading peptides.");
  }

  return asArray(data)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      id: Number(row.id ?? 0),
      slug: asString(row.slug),
      name: asString(row.canonical_name),
      aliases: asArray(row.peptide_aliases).map((entry) => asString(asRecord(entry)?.alias)).filter(Boolean)
    }))
    .filter((row) => row.id > 0 && row.slug && row.name);
}

async function loadVendors(supabase: SupabaseClient, options?: SocialUgcIngestOptions): Promise<VendorRow[]> {
  let query = supabase.from("vendors").select("id,slug,name,website_url,is_published").order("name", { ascending: true });

  if (options?.onlyPublished ?? true) {
    query = query.eq("is_published", true);
  }
  if (options?.vendorSlugs && options.vendorSlugs.length > 0) {
    query = query.in("slug", options.vendorSlugs);
  }
  if (options?.vendorLimit && options.vendorLimit > 0) {
    query = query.limit(options.vendorLimit);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "Failed loading vendors.");
  }

  return asArray(data)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      id: Number(row.id ?? 0),
      slug: asString(row.slug),
      name: asString(row.name),
      websiteUrl: asString(row.website_url)
    }))
    .filter((row) => row.id > 0 && row.slug && row.name);
}

function domainSearchTerm(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const root = host.split(".").slice(0, 2).join(".");
    if (root.length < 4) {
      return "";
    }
    return root;
  } catch {
    return "";
  }
}

function isLikelyCodeName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (/^[A-Z]{1,6}-?\d{2,8}[A-Z0-9-]*$/.test(trimmed)) {
    return true;
  }
  if (!trimmed.includes(" ") && /\d/.test(trimmed) && trimmed.length <= 14) {
    return true;
  }
  return false;
}

export async function ingestSocialUgcSignals(
  supabase: SupabaseClient,
  options?: SocialUgcIngestOptions
): Promise<SocialUgcIngestResult> {
  const peptides = await loadPeptides(supabase, options);
  const vendors = await loadVendors(supabase, options);
  const delayMs = Math.max(0, Number(options?.delayMs ?? 90));
  const maxTermsPerEntity = Math.max(1, Number(options?.maxTermsPerEntity ?? 2));
  const maxQuotesPerVendor = Math.max(1, Number(options?.maxQuotesPerVendor ?? 6));

  let peptidesUpdated = 0;
  let peptideClaimsInserted = 0;
  let vendorsUpdated = 0;
  let vendorReviewsInserted = 0;
  let vendorRatingsUpdated = 0;
  let failures = 0;
  const sourceHits = { reddit: 0, hackerNews: 0, trustpilot: 0 };

  for (const peptide of peptides) {
    try {
      const terms = [peptide.name, ...peptide.aliases]
        .filter((term) => term.length >= 3)
        .filter((term) => !isLikelyCodeName(term));
      if (terms.length === 0) {
        peptidesUpdated += 1;
        await sleep(Math.min(delayMs, 12));
        continue;
      }
      const { posts, sourceHits: localHits } = await gatherUgcPosts(terms, "peptide", maxTermsPerEntity);
      sourceHits.reddit += localHits.reddit;
      sourceHits.hackerNews += localHits.hackerNews;
      sourceHits.trustpilot += localHits.trustpilot;

      const { error: clearError } = await supabase
        .from("peptide_claims")
        .delete()
        .eq("peptide_id", peptide.id)
        .in("section", COMMUNITY_CLAIM_SECTIONS);
      if (clearError) {
        throw new Error(clearError.message);
      }

      const bySource = new Map<UgcPost["source"], UgcPost[]>();
      for (const post of posts) {
        const list = bySource.get(post.source) ?? [];
        list.push(post);
        bySource.set(post.source, list);
      }

      for (const [source, sourcePosts] of bySource.entries()) {
        if (sourcePosts.length === 0) {
          continue;
        }
        const top = rankPosts(sourcePosts)[0];
        if (!top) {
          continue;
        }

        const avg = averageSentiment(sourcePosts);
        const sentimentLabel = sentimentLabelFromAverage(avg);
        const evidenceGrade = evidenceGradeFromPosts(sourcePosts);
        const publishedAt = sourcePosts
          .map((row) => row.createdAt)
          .sort((a, b) => (a > b ? -1 : 1))[0];
        const sourceLabel =
          source === "reddit" ? "Reddit" : source === "hacker_news" ? "Hacker News" : "Trustpilot";
        const claimText = truncate(
          `${sourceLabel} discussions mention ${peptide.name} in ${sourcePosts.length} posts. Average community sentiment is ${sentimentLabel}${avg !== null ? ` (${avg.toFixed(2)})` : ""}. Representative quote: "${top.quote}"`,
          280
        );

        const citationId = await findOrCreateCitationId(
          supabase,
          top.searchUrl,
          `${sourceLabel} search results for ${peptide.name}`,
          toIsoDay(publishedAt)
        );

        const { error: insertError } = await supabase.from("peptide_claims").insert({
          peptide_id: peptide.id,
          section: sourceSectionLabel(source),
          claim_text: claimText,
          evidence_grade: evidenceGrade,
          citation_id: citationId
        });
        if (insertError) {
          throw new Error(insertError.message);
        }
        peptideClaimsInserted += 1;
      }

      peptidesUpdated += 1;
      await sleep(delayMs);
    } catch {
      failures += 1;
    }
  }

  for (const vendor of vendors) {
    try {
      const terms = [vendor.name, domainSearchTerm(vendor.websiteUrl)].filter((term) => term.length >= 4);
      const { posts, sourceHits: localHits } = await gatherUgcPosts(terms, "vendor", maxTermsPerEntity);
      sourceHits.reddit += localHits.reddit;
      sourceHits.hackerNews += localHits.hackerNews;
      sourceHits.trustpilot += localHits.trustpilot;

      const ranked = rankPosts(posts).slice(0, maxQuotesPerVendor);

      const { error: clearReviewError } = await supabase
        .from("vendor_verifications")
        .delete()
        .eq("vendor_id", vendor.id)
        .like("verification_type", "community_review_%");
      if (clearReviewError) {
        throw new Error(clearReviewError.message);
      }

      if (ranked.length > 0) {
        const rows = ranked.map((post) => ({
          vendor_id: vendor.id,
          verification_type: `community_review_${post.source}`,
          value: JSON.stringify({
            source: post.source,
            community: post.community,
            quote: post.quote,
            sourceUrl: post.url,
            createdAt: post.createdAt,
            author: post.author || null,
            sentimentScore: post.sentimentScore,
            sentimentLabel: post.sentimentLabel,
            upvotes: post.score,
            commentCount: post.commentCount
          }),
          verified_at: post.createdAt
        }));

        const { error: insertReviewError } = await supabase.from("vendor_verifications").insert(rows);
        if (insertReviewError) {
          throw new Error(insertReviewError.message);
        }
        vendorReviewsInserted += rows.length;
      }

      const avgSentiment = averageSentiment(ranked);
      const sentimentLabel = sentimentLabelFromAverage(avgSentiment);

      const [{ data: currentRatingRows, error: ratingError }, { count: listingCount, error: listingError }] = await Promise.all([
        supabase
          .from("vendor_rating_snapshots")
          .select("id,rating,confidence,reason_tags")
          .eq("vendor_id", vendor.id)
          .eq("is_current", true)
          .order("id", { ascending: false })
          .limit(1),
        supabase
          .from("vendor_peptide_listings")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", vendor.id)
      ]);
      if (ratingError || listingError) {
        throw new Error(ratingError?.message ?? listingError?.message ?? "Failed loading vendor score state.");
      }

      const current = asRecord(asArray(currentRatingRows)[0]);
      const existingReasonTags = asArray(current?.reason_tags).map((tag) => asString(tag)).filter(Boolean);
      const baseReasonTags = existingReasonTags.filter((tag) => !tag.startsWith("social_") && !tag.startsWith("ugc_"));
      const socialReasonTags = [
        sentimentLabel ? `social_sentiment_${sentimentLabel}` : "",
        ranked.length > 0 ? `ugc_reviews_${Math.min(25, ranked.length)}` : "",
        ranked.some((post) => post.source === "reddit") ? "ugc_source_reddit" : "",
        ranked.some((post) => post.source === "hacker_news") ? "ugc_source_hacker_news" : "",
        ranked.some((post) => post.source === "trustpilot") ? "ugc_source_trustpilot" : ""
      ].filter(Boolean);

      const mergedReasonTags = uniqueStrings([...baseReasonTags, ...socialReasonTags]);
      const score = computeVendorScore(baseReasonTags, Number(listingCount ?? 0), {
        reviewCount: ranked.length,
        averageSentiment: avgSentiment,
        sourceCount: new Set(ranked.map((post) => post.source)).size
      });

      const { error: clearCurrentRatingError } = await supabase
        .from("vendor_rating_snapshots")
        .update({ is_current: false })
        .eq("vendor_id", vendor.id)
        .eq("is_current", true);
      if (clearCurrentRatingError) {
        throw new Error(clearCurrentRatingError.message);
      }

      const { error: insertRatingError } = await supabase.from("vendor_rating_snapshots").insert({
        vendor_id: vendor.id,
        rating: score.rating,
        confidence: score.confidence,
        method_version: "vendor_ugc_ingest_v1",
        reason_tags: mergedReasonTags,
        is_current: true
      });
      if (insertRatingError) {
        throw new Error(insertRatingError.message);
      }

      vendorsUpdated += 1;
      vendorRatingsUpdated += 1;
      await sleep(delayMs);
    } catch {
      failures += 1;
    }
  }

  return {
    peptidesScanned: peptides.length,
    peptidesUpdated,
    peptideClaimsInserted,
    vendorsScanned: vendors.length,
    vendorsUpdated,
    vendorReviewsInserted,
    vendorRatingsUpdated,
    sourceHits,
    failures
  };
}
