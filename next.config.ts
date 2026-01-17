import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "blogimages.smartshot.ai",
        pathname: "/**",
      },
      // Twitter/X images
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/**",
      },
      // Reddit images
      {
        protocol: "https",
        hostname: "i.redd.it",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "preview.redd.it",
        pathname: "/**",
      },
      // Imgur (commonly used on Reddit)
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
