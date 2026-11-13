import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {"/admin/**/*": ["./oliverfee-360/web/**/*", "./oliverfee-360/drizzle/*.sql", "./docs/ADMIN-PREVIEW-COVERAGE.json"]},
};

export default nextConfig;
