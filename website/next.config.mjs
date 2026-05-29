/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/chat',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
