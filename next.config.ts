import type { NextConfig } from "next";

// API calls go through src/app/api/v1/[...path]/route.ts, which adds the token from the httpOnly cookie.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
