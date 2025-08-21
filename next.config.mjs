/** @type {import('next').NextConfig} */
const nextConfig = {};

// Bundle analyzer
if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
}

export default nextConfig;
