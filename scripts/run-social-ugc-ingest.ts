import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ingestSocialUgcSignals } from "@/lib/social-ugc-ingest";

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
  const entry = process.argv.find((token) => token.startsWith(`${flag}=`));
  if (!entry) {
    return "";
  }
  return entry.slice(flag.length + 1).trim();
}

function argValues(flag: string): string[] {
  return process.argv
    .filter((token) => token.startsWith(`${flag}=`))
    .map((token) => token.slice(flag.length + 1).trim())
    .filter((token) => token.length > 0);
}

async function main() {
  const fileEnv = loadEnvFile(".env.local");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const peptideLimit = Number(argValue("--peptide-limit") || "0");
  const vendorLimit = Number(argValue("--vendor-limit") || "0");
  const delayMs = Number(argValue("--delay-ms") || "90");
  const maxQuotesPerVendor = Number(argValue("--max-quotes-per-vendor") || "6");
  const maxTermsPerEntity = Number(argValue("--max-terms-per-entity") || "2");
  const peptideSlugs = argValues("--peptide-slug");
  const vendorSlugs = argValues("--vendor-slug");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const result = await ingestSocialUgcSignals(supabase, {
    peptideLimit: Number.isFinite(peptideLimit) && peptideLimit > 0 ? peptideLimit : undefined,
    vendorLimit: Number.isFinite(vendorLimit) && vendorLimit > 0 ? vendorLimit : undefined,
    peptideSlugs: peptideSlugs.length > 0 ? peptideSlugs : undefined,
    vendorSlugs: vendorSlugs.length > 0 ? vendorSlugs : undefined,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 90,
    maxQuotesPerVendor: Number.isFinite(maxQuotesPerVendor) && maxQuotesPerVendor > 0 ? maxQuotesPerVendor : 6,
    maxTermsPerEntity: Number.isFinite(maxTermsPerEntity) && maxTermsPerEntity > 0 ? maxTermsPerEntity : 2
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
