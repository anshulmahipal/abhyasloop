/** @type {import('next').NextConfig} */
const APP_BASE = "https://app.tyariwale.com";

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  async redirects() {
    return [
      { source: "/login", destination: `${APP_BASE}/auth`, permanent: true },
      { source: "/signup", destination: `${APP_BASE}/auth`, permanent: true },
      { source: "/auth", destination: `${APP_BASE}/auth`, permanent: true },
    ];
  },
};

module.exports = nextConfig;
