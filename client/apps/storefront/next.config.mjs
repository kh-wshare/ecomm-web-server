import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(appDir, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: [
    "@repo/api-client",
    "@repo/auth-client",
    "@repo/query-client",
    "@repo/types",
    "@repo/ui",
  ],
};

export default nextConfig;
