/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    VOICEVOX_API_URL: process.env.VOICEVOX_API_URL || 'http://localhost:50021',
    NEXT_PUBLIC_VOICEVOX_API_URL: process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;