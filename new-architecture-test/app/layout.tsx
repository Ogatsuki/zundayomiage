import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ずんだよみあげ - AI中心設計アーキテクチャ',
  description: 'VOICEVOX音声読み上げアプリケーション - 新アーキテクチャ実装',
  keywords: ['VOICEVOX', 'ずんだもん', '音声読み上げ', 'AI中心設計'],
  authors: [{ name: 'Zundayomiage Team' }],
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
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                <h1 className="text-xl font-bold text-gray-900">
                  ずんだよみあげ
                </h1>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  AI中心設計
                </span>
              </div>
              <div className="text-sm text-gray-500">
                新アーキテクチャ実装
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="bg-gray-800 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">ずんだよみあげ</h3>
                <p className="text-gray-400 text-sm">
                  AI中心設計による垂直統合アーキテクチャの実装検証プロジェクト
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">技術スタック</h3>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Next.js 14 (App Router)</li>
                  <li>• TypeScript</li>
                  <li>• VOICEVOX Engine</li>
                  <li>• Docker Compose</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">アーキテクチャ原則</h3>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• 垂直統合ブロック設計</li>
                  <li>• ゼロコンテキスト契約</li>
                  <li>• 自己完結実装</li>
                  <li>• AI認知負荷最小化</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
              © 2024 Zundayomiage Project. Built with AI-Centric Architecture.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}