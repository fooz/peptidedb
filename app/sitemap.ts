import type { MetadataRoute } from "next";
import { HEALTH_GOAL_DEFINITIONS } from "@/lib/health-goals";
import { listPeptides, listVendors } from "@/lib/repository";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [peptides, vendors] = await Promise.all([listPeptides(), listVendors()]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: absoluteUrl("/peptides"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95
    },
    {
      url: absoluteUrl("/vendors"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85
    },
    {
      url: absoluteUrl("/goals"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82
    },
    {
      url: absoluteUrl("/disclaimer"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4
    },
    {
      url: absoluteUrl("/rating-methodology"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];

  const goalEntries: MetadataRoute.Sitemap = HEALTH_GOAL_DEFINITIONS.map((goal) => ({
    url: absoluteUrl(`/goals/${goal.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.78
  }));

  const peptideEntries: MetadataRoute.Sitemap = peptides.map((peptide) => ({
    url: absoluteUrl(`/peptides/${peptide.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const vendorEntries: MetadataRoute.Sitemap = vendors.map((vendor) => ({
    url: absoluteUrl(`/vendors/${vendor.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticEntries, ...goalEntries, ...peptideEntries, ...vendorEntries];
}
