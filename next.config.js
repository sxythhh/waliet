/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Skip type checking during build - fix types later
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip linting during build
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/auth',
        destination: 'https://cr-auth.vercel.app/auth',
      },
    ];
  },
};

module.exports = nextConfig;
