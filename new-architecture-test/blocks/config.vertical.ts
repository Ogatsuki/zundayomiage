// ========== UNIFIED CONFIG VERTICAL BLOCK ==========
// 全設定を1ファイルに集約 - AIは他を見る必要がない

export const CONFIG = {
  // Next.js設定
  next: {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_VOICEVOX_API_URL: process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021'
    }
  },

  // Tailwind CSS設定
  tailwind: {
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './blocks/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
      extend: {
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        },
      },
    },
    plugins: [],
  },

  // TypeScript設定
  typescript: {
    compilerOptions: {
      strict: true,
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      paths: {
        "@/*": ["./src/*"],
        "@/blocks/*": ["./blocks/*"],
        "@/contracts/*": ["./contracts/*"]
      }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  },

  // Docker設定
  docker: {
    services: {
      voicevox: {
        image: 'voicevox/voicevox_engine:cpu-ubuntu20.04-latest',
        ports: ['50021:50021'],
        environment: {
          TZ: 'Asia/Tokyo'
        }
      },
      app: {
        build: {
          context: '.',
          dockerfile: 'Dockerfile.dev'
        },
        ports: ['3000:3000'],
        environment: {
          NODE_ENV: 'development',
          VOICEVOX_API_URL: 'http://voicevox:50021',
          NEXT_PUBLIC_VOICEVOX_API_URL: 'http://localhost:50021'
        }
      }
    }
  },

  // PostCSS設定
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    }
  }
} as const;

// 型定義エクスポート
export type AppConfig = typeof CONFIG;