import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Next 16 rejects any `q` not listed here (default: [75] only). 90 is used for
    // UI screenshots, where a lower quality would visibly soften small text.
    qualities: [75, 90],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Media under /lexino-website/ keeps the one-year immutable policy.
        //
        // styles.css and script.js are deliberately NOT matched here. They were
        // previously covered by a `/lexino-website/:path*` rule that marked them
        // `immutable, max-age=31536000`, so any returning visitor was pinned to
        // the copy they first downloaded and could not receive a new deployment's
        // CSS or JS for a year. Their filenames are not content-hashed, so
        // immutable caching is never correct for them.
        source: '/lexino-website/:file*.(ico|png|jpg|jpeg|svg|webp|avif|mp4|mp3|woff|woff2|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Revalidate on every use. A 304 costs a few hundred bytes, which is a
        // sound trade for guaranteeing users run current code.
        //
        // These are listed explicitly rather than as a `/:path*.(css|js)` pattern,
        // because a multi-segment pattern would also match the content-hashed
        // bundles under /_next/static/ and strip their immutable caching.
        source: '/lexino-website/:file(styles.css|script.js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Same reasoning for the chat app's unhashed CSS/JS at the public root.
        source: '/:file(style.css|script.js|api.js|sw.js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/Images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/logo/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:file.(ico|png|jpg|jpeg|svg|webp|avif|mp4|mp3|woff|woff2|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
