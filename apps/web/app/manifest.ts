import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiceGraph AI",
    short_name: "ServiceGraph",
    description: "From complaint to root cause to safe resolution.",
    start_url: "/citizen",
    display: "standalone",
    background_color: "#07111F",
    theme_color: "#07111F",
    icons: [
      {
        src: "/servicegraph-mark.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
