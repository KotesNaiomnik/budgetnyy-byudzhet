import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma Client must be loaded as an external Node module, not bundled by
  // Turbopack. Without this, Next.js 16 dev server fails with:
  //   "Cannot find module '@prisma/client-<schema-hash>'"
  // because Turbopack tries to resolve a virtual module that doesn't exist.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
