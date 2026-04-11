/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better development
  reactStrictMode: true,

  // Optimize for production
  poweredByHeader: false,

  // Allow Tailscale IP for mobile testing in development
  allowedDevOrigins: ['100.113.9.34'],

  // Lint runs separately via `npm run lint` with our flat eslint.config.mjs.
  // Next's build-time lint only detects legacy .eslintrc* files, so letting
  // it run during build would emit a noisy "plugin not detected" warning
  // even though our config is correct and clean.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // libheif-js (consumed by heic-convert) uses dynamic require() inside its
  // WASM bundle. It's a library-internal pattern we can't fix, so silence
  // the "critical dependency" warning instead of polluting every build.
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /libheif-js/ },
    ]
    return config
  },


  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            // Prevent clickjacking attacks
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Prevent MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Control referrer information
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // XSS protection (legacy, but still useful for older browsers)
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Permissions policy - camera enabled for AI photo capture
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            // Cross-Origin-Embedder-Policy for SharedArrayBuffer (needed by @imgly/background-removal)
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            // Cross-Origin-Opener-Policy for SharedArrayBuffer
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
