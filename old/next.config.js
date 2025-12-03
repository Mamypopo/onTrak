/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    // Allow images from public/uploads
    unoptimized: process.env.NODE_ENV === 'development',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdfkit from webpack bundling to avoid font file issues
      config.externals = [...(config.externals || []), 'pdfkit']
    }
    return config
  },
}

module.exports = nextConfig

