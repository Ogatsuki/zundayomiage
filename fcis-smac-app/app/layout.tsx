import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ずんだもん音声合成 - FCIS+SMAC',
  description: 'FCIS+SMACアーキテクチャで実装された音声合成アプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}