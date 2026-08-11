import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trustrent/types", "@trustrent/shared"],
};

export default nextConfig;
