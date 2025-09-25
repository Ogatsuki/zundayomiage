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
    PVBP_VERSION: '1.0.0',
    NEXT_PUBLIC_PVBP_VERSION: '1.0.0',
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
  // PVBP-specific configuration
  experimental: {
    // Enable strict mode for better PVBP pattern testing
    reactStrictMode: true,
  },
};

module.exports = nextConfig;