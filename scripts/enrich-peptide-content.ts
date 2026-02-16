import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { enrichPeptideContent } from "@/lib/peptide-content-enrichment";

function loadEnvFile(path: string): Record<string, string> {
  if (!fs.existsSync(path)) {
    return {};
  }

  const env: Record<string, string> = {};
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function argValue(flag: string): string {
  const entry = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (!entry) {
    return "";
  }
  return entry.slice(flag.length + 1).trim();
}

function argValues(flag: string): string[] {
  return process.argv
    .filter((item) => item.startsWith(`${flag}=`))
    .map((item) => item.slice(flag.length + 1).trim())
    .filter((item) => item.length > 0);
}

async function main() {
  const fileEnv = loadEnvFile(".env.local");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const limit = Number(argValue("--limit") || "0");
  const slugs = argValues("--slug");
  const delayMs = Number(argValue("--delay-ms") || "110");
  const includeUnpublished = process.argv.includes("--include-unpublished");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const result = await enrichPeptideContent(supabase, {
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    onlyPublished: !includeUnpublished,
    peptideSlugs: slugs.length > 0 ? slugs : undefined,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 110
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
