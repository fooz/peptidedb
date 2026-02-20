import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PeptideDB",
    short_name: "PeptideDB",
    description: "Evidence-first peptide reference database with regulatory status, safety context, and source-linked research.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#0b5cab",
    icons: [
      {
        src: absoluteUrl("/favicon.ico"),
        sizes: "32x32",
        type: "image/x-icon"
      }
    ]
  };
}
