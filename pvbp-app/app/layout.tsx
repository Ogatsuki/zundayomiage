import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PVBP ずんだよみあげ - Pragmatic Vertical Blocks Protocol',
  description: 'PVBP準拠のVOICEVOX音声読み上げアプリケーション - 実用的垂直ブロックプロトコル実装',
  keywords: ['PVBP', 'Vertical Blocks', 'VOICEVOX', 'ずんだもん', '音声読み上げ', 'TypeScript'],
  authors: [{ name: 'PVBP Implementation Team' }],
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
      <body className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <header className="bg-white shadow-sm border-b border-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">P</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  PVBP ずんだよみあげ
                </h1>
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  v1.0.0
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Pragmatic Vertical Blocks Protocol
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">PVBP ずんだよみあげ</h3>
                <p className="text-gray-400 text-sm">
                  実用的垂直ブロックプロトコル（PVBP）に準拠した音声読み上げアプリケーション実装
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">PVBP 技術スタック</h3>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• PVBP v1.0.0 Protocol</li>
                  <li>• Next.js 14 (App Router)</li>
                  <li>• TypeScript (Strict Mode)</li>
                  <li>• Runtime Declaration Protocol</li>
                  <li>• Standard Pattern Library</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">PVBP 原則</h3>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Runtime Declaration Enforcement</li>
                  <li>• Lifecycle Pattern Standardization</li>
                  <li>• Temporal Issue Resolution</li>
                  <li>• Self-Contained Vertical Blocks</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
              © 2025 PVBP Implementation Project. Built with Pragmatic Vertical Blocks Protocol v1.0.0.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}