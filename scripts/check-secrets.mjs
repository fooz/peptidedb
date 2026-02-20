#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SECRET_PATTERNS = [
  { id: "openai", regex: /\bsk-[A-Za-z0-9]{20,}\b/g, message: "Possible OpenAI key" },
  { id: "github_pat", regex: /\bghp_[A-Za-z0-9]{20,}\b/g, message: "Possible GitHub personal access token" },
  { id: "github_pat_new", regex: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g, message: "Possible GitHub fine-grained token" },
  { id: "slack", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, message: "Possible Slack token" },
  { id: "google_api", regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/g, message: "Possible Google API key" },
  { id: "aws_access", regex: /\bAKIA[0-9A-Z]{16}\b/g, message: "Possible AWS access key id" },
  {
    id: "jwt_like",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    message: "Possible hardcoded JWT token"
  }
];

const ENV_ASSIGNMENT_PATTERNS = [
  /^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)\s*$/i,
  /^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/i,
  /^ADMIN_PASSWORD\s*=\s*(.+)\s*$/i,
  /^ADMIN_RESET_KEY\s*=\s*(.+)\s*$/i,
  /^ADMIN_SESSION_SECRET\s*=\s*(.+)\s*$/i
];

const ALLOWED_LITERAL_PATTERNS = [/^your[_-]?key$/i, /^change[_-]?me$/i, /^example$/i, /^placeholder$/i, /^\$\{.+\}$/];

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith(".next/"))
    .filter((line) => !line.startsWith("node_modules/"));
}

function looksBinary(content) {
  return content.includes("\u0000");
}

function normalizeAssignedValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isSafeExampleValue(value) {
  if (!value) {
    return true;
  }
  return ALLOWED_LITERAL_PATTERNS.some((pattern) => pattern.test(value));
}

function scanFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (looksBinary(text)) {
    return [];
  }

  const findings = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    for (const envRegex of ENV_ASSIGNMENT_PATTERNS) {
      const match = line.match(envRegex);
      if (!match) {
        continue;
      }

      const value = normalizeAssignedValue(match[1] ?? "");
      if (!isSafeExampleValue(value)) {
        findings.push({
          filePath,
          lineNumber,
          message: `Sensitive env var appears hardcoded (${line.split("=")[0]?.trim()})`
        });
      }
    }

    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(line)) {
        continue;
      }
      findings.push({
        filePath,
        lineNumber,
        message: pattern.message
      });
    }
  });

  return findings;
}

function main() {
  const files = getTrackedFiles();
  const findings = [];

  for (const filePath of files) {
    try {
      findings.push(...scanFile(filePath));
    } catch {
      continue;
    }
  }

  if (findings.length === 0) {
    console.log("Secret scan passed: no hardcoded keys detected.");
    process.exit(0);
  }

  console.error("Secret scan failed. Potential hardcoded keys found:");
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.lineNumber} ${finding.message}`);
  }
  process.exit(1);
}

main();
