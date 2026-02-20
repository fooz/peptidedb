import { absoluteUrl, getSiteUrl } from "@/lib/seo";

type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

type RequestBody = {
  urls?: string[];
};

function isAuthorized(request: Request): boolean {
  const configuredToken = process.env.INDEXNOW_PUBLISH_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const header = request.headers.get("authorization")?.trim() ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  const token = header.slice(7).trim();
  return token.length > 0 && token === configuredToken;
}

function normalizeUrls(urls: string[]): string[] {
  const host = new URL(getSiteUrl()).hostname;
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => {
          try {
            const parsed = new URL(url, getSiteUrl());
            if (parsed.hostname !== host) {
              return null;
            }
            parsed.hash = "";
            return parsed.toString();
          } catch {
            return null;
          }
        })
        .filter((url): url is string => Boolean(url))
    )
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return Response.json({ error: "INDEXNOW_KEY is not configured." }, { status: 400 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const normalizedUrls = normalizeUrls(body.urls ?? []);
  if (normalizedUrls.length === 0) {
    return Response.json({ error: "No valid site URLs provided." }, { status: 400 });
  }

  const payload: IndexNowPayload = {
    host: new URL(getSiteUrl()).host,
    key,
    keyLocation: absoluteUrl("/indexnow.txt"),
    urlList: normalizedUrls
  };

  const endpoints = ["https://api.indexnow.org/indexnow", "https://yandex.com/indexnow"];
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload)
        });
        return {
          endpoint,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        };
      } catch (error) {
        return {
          endpoint,
          ok: false,
          status: 0,
          statusText: error instanceof Error ? error.message : "Unknown network error"
        };
      }
    })
  );

  const allOk = results.every((result) => result.ok);
  return Response.json(
    {
      submitted: normalizedUrls.length,
      urls: normalizedUrls,
      results
    },
    { status: allOk ? 200 : 207 }
  );
}
