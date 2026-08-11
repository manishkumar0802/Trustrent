import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace TS packages are compiled by Next at build time.
  transpilePackages: ["@trustrent/types", "@trustrent/shared"],
};

export default nextConfig;
