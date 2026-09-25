import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  output: "standalone",
  // Antrean koreksi dan usulan aturan pindah ke AI Learning. Alamat lamanya
  // diteruskan di server agar tautan yang sudah tersebar tidak mendarat diam-
  // diam di tab kasus yang bukan tujuannya.
  async redirects() {
    return [
      {
        source: "/cases",
        has: [{ type: "query", key: "view", value: "audit" }],
        destination: "/ai-learning?section=tinjauan",
        permanent: false,
      },
    ];
  },
  // Browsers ask for /favicon.ico whatever the page declares, and each ask
  // was a 404 in the service log. Served from the same mark the metadata
  // names, so there is one icon file.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/catalyst-mark.png" }];
  },
};

export default nextConfig;
