import fs from "node:fs";

function loadEnv(path) {
  if (!fs.existsSync(path)) {
    return;
  }
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    let value = match[2] ?? "";
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv(".env.local");

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://peptidedb.vercel.app").replace(/\/$/, "");
const token = process.env.INDEXNOW_PUBLISH_TOKEN;
if (!token) {
  console.error("INDEXNOW_PUBLISH_TOKEN is required.");
  process.exit(1);
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node scripts/submit-indexnow.mjs <url1> <url2> ...");
  process.exit(1);
}

const normalized = urls.map((url) => {
  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return "";
  }
});

const response = await fetch(`${siteUrl}/api/indexnow`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ urls: normalized })
});

const payload = await response.json().catch(() => ({}));
console.log(JSON.stringify({ status: response.status, payload }, null, 2));
if (!response.ok && response.status !== 207) {
  process.exit(1);
}
