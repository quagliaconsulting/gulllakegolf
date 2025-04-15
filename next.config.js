/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'localhost', 'james-office-2.tailbf173.ts.net'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Allow cross-origin requests for Tailscale funnel
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  // For future compatibility - will be used in newer Next.js versions
  // experimental: {
  //   allowedDevOrigins: ['localhost', '127.0.0.1', '*.tailscale.net', '*.ts.net'],
  // },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve Node.js modules on the client
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        'node:async_hooks': false,
        'node:crypto': false,
        'node:buffer': false,
        'node:fs': false,
        'node:path': false,
        'node:url': false,
        'node:util': false,
        'node:stream': false,
        stream: false,
      };
    }
    return config;
  },
  // Temporarily disable strict mode since we're having auth issues
  // Remove experimental flag that's causing warnings
}

module.exports = nextConfig