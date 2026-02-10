/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better development
  reactStrictMode: true,

  // Optimize for production
  poweredByHeader: false,

  // Environment variables available on client
  env: {
    POCKETBASE_URL: process.env.POCKETBASE_URL || 'http://127.0.0.1:8090',
  },
}

module.exports = nextConfig
