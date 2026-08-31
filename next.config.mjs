/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@nextui-org/react'],
  },
  images: {
    domains: [
      'images.pexels.com',
      'pexels.com',
      'res.cloudinary.com',
      'cloudinary.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'ui-avatars.com'
    ],
  },
};

export default nextConfig;
