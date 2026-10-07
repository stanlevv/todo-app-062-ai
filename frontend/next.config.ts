import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    const rawBackendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000/api';

    const cleanBackendUrl = rawBackendUrl.replace(/\/+$/, '');
    const destination = cleanBackendUrl.endsWith('/api')
      ? `${cleanBackendUrl}/:path*`
      : `${cleanBackendUrl}/api/:path*`;

    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;
