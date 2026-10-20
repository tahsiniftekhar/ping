import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second local session run on 127.0.0.1 (separate localStorage) for multi-user testing.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
