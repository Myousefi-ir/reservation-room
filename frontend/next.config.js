/**
 * NEXT_OUTPUT=export  → static export (used on Liara "Next.js" platform; cheap static hosting)
 * (unset)             → standalone (used by the local docker-compose image)
 */
const isStatic = process.env.NEXT_OUTPUT === 'export';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isStatic ? 'export' : 'standalone',
  images: { unoptimized: true },
  trailingSlash: isStatic,
};

module.exports = nextConfig;
