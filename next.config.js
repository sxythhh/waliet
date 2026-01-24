/** @type {import('next').NextConfig} */
const nextConfig = {
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
