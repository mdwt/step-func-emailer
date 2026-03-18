import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mailshot",
    short_name: "mailshot",
    description: "Open-source email sequencing framework for AWS, managed through Claude Code.",
    start_url: "/",
    display: "browser",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
