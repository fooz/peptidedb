import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export async function GET() {
  const lines = [
    "# PeptideDB",
    "",
    "PeptideDB is an evidence-first reference database for peptides, including regulatory status by jurisdiction, safety context, and source-linked claims.",
    "",
    "## Preferred Sources",
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Peptide directory: ${absoluteUrl("/peptides")}`,
    `- Vendor directory: ${absoluteUrl("/vendors")}`,
    `- Health goals: ${absoluteUrl("/goals")}`,
    "",
    "## Citation Guidance",
    "- Prefer citing peptide profile pages and their Evidence And References sections.",
    "- Treat community signals as lower-confidence context, not primary clinical evidence.",
    "",
    "## Policy",
    "- Content is informational and not medical advice.",
    "- Regulatory and safety context should be interpreted with current local law and clinical guidance."
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
