import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TzDraft",
    short_name: "TzDraft",
    description: "Play Tanzania Drafti (8x8) online and vs AI.",
    start_url: "/sw",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#f97316",
    icons: [
      {
        src: "/logo/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
