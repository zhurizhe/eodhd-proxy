/**
 * @type {import('next').NextConfig}
 *
 * The configuration here enables longer fetch timeouts when calling
 * remote APIs. If your environment blocks external network access you
 * should set MOCK_MODE=1 in your `.env` to bypass remote fetches.
 */
const nextConfig = {
  // Opt in to the App Router by default. No `pages/` directory is used.
  experimental: {
    fetchTimeout: process.env.FETCH_TIMEOUT
      ? parseInt(process.env.FETCH_TIMEOUT, 10)
      : 60 * 1000,
    staticPageGenerationTimeout: 120
  }
};

module.exports = nextConfig;