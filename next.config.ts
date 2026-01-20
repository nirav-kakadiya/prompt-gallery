import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude extension folder from build
  typescript: {
    // The extension has its own tsconfig and build process
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignore extension folder during lint
    ignoreDuringBuilds: false,
  },
  // Exclude extension from webpack
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/extension/**', '**/node_modules/**'],
    };
    return config;
  },
  images: {
    // Allow images from any HTTPS source
    remotePatterns: [
      {
        protocol: "https",
      //   hostname: "images.unsplash.com",
      //   pathname: "/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "*.googleusercontent.com",
      //   pathname: "/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "avatars.githubusercontent.com",
      //   pathname: "/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "blogimages.smartshot.ai",
      //   pathname: "/**",
      // },
      // // Twitter/X images
      // {
      //   protocol: "https",
      //   hostname: "pbs.twimg.com",
      //   pathname: "/**",
      // },
      // // Reddit images
      // {
      //   protocol: "https",
      //   hostname: "i.redd.it",
      //   pathname: "/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "preview.redd.it",
      //   pathname: "/**",
      // },
      // // Imgur (commonly used on Reddit)
      // {
      //   protocol: "https",
      //   hostname: "i.imgur.com",
      //   pathname: "/**",
      // },
      // // CloudFront CDN for user-uploaded images
      // {
      //   protocol: "https",
      //   hostname: "*.cloudfront.net",
      //   pathname: "/**",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
