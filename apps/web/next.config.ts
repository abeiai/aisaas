import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb"
    }
  },
  output: "standalone",
  outputFileTracingRoot: join(appDir, "../..")
};

export default nextConfig;
