import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': [
      './docs/**/*',
      './tests/**/*',
      './README.md',
      './next.config.ts',
      './playwright.config.ts',
      './vitest.config.ts',
    ],
  },
  serverExternalPackages: ['archiver'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
