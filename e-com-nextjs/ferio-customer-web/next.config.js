/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.sheakh.qzz.io https://*.qzz.io https://adminf.sheakh.qzz.io http://localhost:* http://127.0.0.1:*;",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
