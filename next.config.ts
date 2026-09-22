import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build enxuto para Docker (gera .next/standalone com server.js).
  output: "standalone",
  experimental: {
    // Laudos em PDF (com fotos) podem ter alguns MB — sobe o limite do upload.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
