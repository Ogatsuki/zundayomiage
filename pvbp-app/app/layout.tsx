import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ずんだ読み上げ - VOICEVOX音声合成',
  description: 'ずんだもんの声で文字を読み上げるアプリケーション',
  keywords: ['VOICEVOX', 'ずんだもん', '音声読み上げ', '音声合成'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        {children}

        <footer className="bg-gray-800 text-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                © 2025 ずんだ読み上げアプリ
              </p>
              <p className="text-xs text-gray-500">
                <a
                  href="https://voicevox.hiroshiba.jp/product/zundamon/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 underline"
                >
                  ずんだもん公式利用規約
                </a>
                {' | '}
                Powered by VOICEVOX
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}