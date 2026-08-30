// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (root level)
  turbopack: {
    resolveAlias: {
      "jspdf-autotable": "jspdf-autotable",
    },
  },
  // Webpack configuration
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "jspdf-autotable": "jspdf-autotable",
    };

    return config;
  },
  // Transpile packages
  transpilePackages: ["jspdf", "jspdf-autotable"],
};

export default nextConfig;