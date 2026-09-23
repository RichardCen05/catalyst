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
};

export default nextConfig;
