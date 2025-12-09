/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    // Cloud Run Sidecar環境ではIPv6解決で失敗するため127.0.0.1を使用
    VOICEVOX_API_URL: process.env.VOICEVOX_API_URL || 'http://127.0.0.1:50021',
    NEXT_PUBLIC_VOICEVOX_API_URL: process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://127.0.0.1:50021',
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
  // Enable strict mode for better PVBP pattern testing
  reactStrictMode: true,
};

module.exports = nextConfig;