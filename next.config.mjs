const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : 'http://localhost:3000';

// Blocks third-party/injected scripts from running (the realistic path to
// exfiltrating the session token — see the `[...nextauth].ts` accessToken
// exposure this doesn't fix on its own). style-src stays permissive since
// NextUI/framer-motion set inline style="" attributes at runtime.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com https://cloudinary.com https://images.pexels.com https://pexels.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://ui-avatars.com",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@nextui-org/react'],
  },
  images: {
    remotePatterns: [
      'images.pexels.com',
      'pexels.com',
      'res.cloudinary.com',
      'cloudinary.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'ui-avatars.com',
    ].map((hostname) => ({ protocol: 'https', hostname, pathname: '/**' })),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
