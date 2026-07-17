import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  async redirects() {
    return [
      {
        source: "/auth/:path*",
        destination: "/merchant/auth/:path*",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/merchant/dashboard",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/merchant/:path*",
        permanent: false,
      },
      {
        source: "/store/:merchantSlug/products/:productSlug",
        destination: "/:merchantSlug/products/:productSlug",
        permanent: false,
      },
      {
        source: "/store/:merchantSlug",
        destination: "/:merchantSlug",
        permanent: false,
      },
    ];
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
