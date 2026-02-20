const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function sanitizeExternalUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeInternalPath(value: string, allowedRoots: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("\n") || trimmed.includes("\r") || trimmed.includes("://")) {
    return null;
  }

  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const allowed = allowedRoots.some((root) => pathOnly === root || pathOnly.startsWith(`${root}/`));
  if (!allowed) {
    return null;
  }

  return trimmed;
}
