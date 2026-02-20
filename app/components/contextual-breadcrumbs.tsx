"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/app/components/breadcrumbs";
import { NAV_KEYS } from "@/app/components/navigation-memory";
import { sanitizeInternalPath } from "@/lib/url-security";

type ContextualBreadcrumbsProps = {
  currentLabel: string;
  kind: "peptide" | "vendor";
};

type BackLink = {
  path: string;
  label: string;
};

const DEFAULT_BACK: Record<ContextualBreadcrumbsProps["kind"], BackLink> = {
  peptide: { path: "/peptides", label: "Peptides" },
  vendor: { path: "/vendors", label: "Vendors" }
};

function peptideBackLabel(path: string): string {
  if (path.startsWith("/goals")) {
    return "Health Goals";
  }
  if (path.startsWith("/vendors/")) {
    return "Vendor";
  }
  if (path.startsWith("/peptides?")) {
    return "Search Results";
  }
  return "Peptides";
}

function vendorBackLabel(path: string): string {
  if (path.startsWith("/peptides/")) {
    return "Peptide";
  }
  if (path.startsWith("/vendors?")) {
    return "Search Results";
  }
  return "Vendors";
}

function labelFor(kind: ContextualBreadcrumbsProps["kind"], path: string): string {
  return kind === "peptide" ? peptideBackLabel(path) : vendorBackLabel(path);
}

export function ContextualBreadcrumbs({ currentLabel, kind }: ContextualBreadcrumbsProps) {
  const defaults = DEFAULT_BACK[kind];
  const [backLink, setBackLink] = useState<BackLink>(defaults);

  useEffect(() => {
    try {
      const key = NAV_KEYS[kind];
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        setBackLink(defaults);
        return;
      }

      const allowedRoots = kind === "peptide" ? ["/peptides", "/goals", "/vendors"] : ["/vendors", "/peptides"];
      const sanitized = sanitizeInternalPath(raw, allowedRoots);
      if (!sanitized) {
        setBackLink(defaults);
        return;
      }

      setBackLink({
        path: sanitized,
        label: labelFor(kind, sanitized)
      });
    } catch {
      setBackLink(defaults);
    }
  }, [defaults, kind]);

  return <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: backLink.label, href: backLink.path }, { label: currentLabel }]} />;
}
