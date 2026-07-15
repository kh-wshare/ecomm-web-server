/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  transpilePackages: [
    "@repo/api-client",
    "@repo/auth-client",
    "@repo/query-client",
    "@repo/types",
    "@repo/ui",
  ],
};

export default nextConfig;
