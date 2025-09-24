/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_VOICEVOX_URL: process.env.NEXT_PUBLIC_VOICEVOX_URL || 'http://localhost:50021',
  },
}

module.exports = nextConfig