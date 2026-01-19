/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiServerUrl = process.env.NEXT_PUBLIC_API_SERVER_URL;
    return [
      {
        source: '/api/:path*',
        destination: `${apiServerUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;