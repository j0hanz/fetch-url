import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@j0hanz/fetch-url-mcp"],
};

export default nextConfig;
