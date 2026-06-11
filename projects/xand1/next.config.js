/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_XAND1_API_BASE_URL: process.env.NEXT_PUBLIC_XAND1_API_BASE_URL,
  },
}

module.exports = nextConfig
