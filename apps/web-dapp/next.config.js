/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@noctura/sdk', '@noctura/ui-components'],
};

module.exports = nextConfig;
