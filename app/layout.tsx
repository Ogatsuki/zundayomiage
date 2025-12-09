import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ずんだ読み上げ - VOICEVOX音声生成システム',
  description: 'ずんだもん・四国めたんの声でテキストを読み上げ、MP3でダウンロード',
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
