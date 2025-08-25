/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // 如仍需避免缓存，可在具体 Route 里设置 `export const dynamic = 'force-dynamic'`
};
module.exports = nextConfig;