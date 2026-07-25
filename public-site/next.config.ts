import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/rise-social',
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
