'use client';

import UIOrchestrator from '@/blocks/ui-orchestrator.vertical';

/**
 * ========== メインページ ==========
 * タスクID: 002 - UI再設計・垂直統合アーキテクチャ実装
 *
 * 旧実装: 537行の巨大化したページ
 * 新実装: UIOrchestrator呼び出しのみの簡素化されたページ（200行以下）
 *
 * 設計方針:
 * - page.tsxは最小限の役割のみ（レイアウト提供）
 * - 全てのUI管理責任をUIOrchestrator垂直ブロックに移譲
 * - モダンなグラデーション背景でユーザビリティ向上
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* グローバルレイアウト設定 */}
      <div className="relative w-full min-h-screen">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>

        {/* メインコンテンツ */}
        <div className="relative z-10">
          <UIOrchestrator />
        </div>
      </div>
    </div>
  );
}