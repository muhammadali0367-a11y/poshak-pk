/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from any HTTPS domain (required for 15+ brand CDNs)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Optimize formats
    formats: ["image/webp", "image/avif"],
    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
  },
  // Compress responses
  compress: true,
  // Power header removal
  poweredByHeader: false,
};

export default nextConfig;
