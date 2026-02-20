"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sanitizeInternalPath } from "@/lib/url-security";

const PEPTIDE_BACK_KEY = "nav:lastPeptideContextPath";
const VENDOR_BACK_KEY = "nav:lastVendorContextPath";

function withQuery(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function safeSetSessionValue(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function NavigationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentPath = withQuery(pathname, searchParams);

    const peptideContextCandidate =
      pathname === "/peptides" || pathname.startsWith("/goals") || pathname.startsWith("/vendors/")
        ? sanitizeInternalPath(currentPath, ["/peptides", "/goals", "/vendors"])
        : null;
    if (peptideContextCandidate) {
      safeSetSessionValue(PEPTIDE_BACK_KEY, peptideContextCandidate);
    }

    const vendorContextCandidate =
      pathname === "/vendors" || pathname.startsWith("/peptides/")
        ? sanitizeInternalPath(currentPath, ["/vendors", "/peptides"])
        : null;
    if (vendorContextCandidate) {
      safeSetSessionValue(VENDOR_BACK_KEY, vendorContextCandidate);
    }
  }, [pathname, searchParams]);

  return null;
}

export const NAV_KEYS = {
  peptide: PEPTIDE_BACK_KEY,
  vendor: VENDOR_BACK_KEY
} as const;
