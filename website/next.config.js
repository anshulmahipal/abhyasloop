/** @type {import('next').NextConfig} */
const APP_BASE = "https://app.tyariwale.com";

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  async redirects() {
    return [{ source: "/auth", destination: APP_BASE, permanent: true }];
  },
};

module.exports = nextConfig;
