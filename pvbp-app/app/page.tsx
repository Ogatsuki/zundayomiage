import { redirect } from 'next/navigation';

export default function HomePage() {
  // 問題点2: ランディングページ不要。:3000へのアクセスですぐに本番のページにアクセス
  redirect('/voice-synthesis');
}