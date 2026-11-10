import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home page is the OliverFee 360 app (public/office.html + its scripts).
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/office.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
