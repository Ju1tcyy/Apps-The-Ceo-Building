import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The CEO Building Management System",
    short_name: "The CEO",
    description: "One Platform. Total Control. Smart Building Operations for a More Efficient Tomorrow.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#142D4E",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
