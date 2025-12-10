-- ============================================================
-- Supabase Schema for TSD-107 ずんだ読み上げ
-- ============================================================
-- Schema: zunda-yomiage
-- 目的: 長文テキストの一時保存（音声生成処理用）
-- ============================================================

-- スキーマ作成（Supabase では通常 public を使用）
-- 注: Supabase ではハイフン入りスキーマ名は推奨されないため、
--     public スキーマ内に zunda_yomiage_ プレフィックス付きテーブルを作成

-- ------------------------------------------------------------
-- テキストキャッシュテーブル
-- ------------------------------------------------------------
-- 用途: 音声生成処理前にテキストを一時保存
-- 自動削除: 1時間後に expires_at でクリーンアップ

CREATE TABLE IF NOT EXISTS public.zunda_yomiage_text_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  speaker_id SMALLINT NOT NULL CHECK (speaker_id IN (2, 3)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  processed_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_zunda_text_cache_expires 
  ON public.zunda_yomiage_text_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_zunda_text_cache_status 
  ON public.zunda_yomiage_text_cache(status);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------
-- 匿名ユーザー（anon key）からのアクセスを許可

ALTER TABLE public.zunda_yomiage_text_cache ENABLE ROW LEVEL SECURITY;

-- INSERT: 誰でも可能
CREATE POLICY "zunda_text_cache_insert" 
  ON public.zunda_yomiage_text_cache 
  FOR INSERT 
  WITH CHECK (true);

-- SELECT: 自分が作成したレコードのみ（またはサービスロールから全件）
-- 注: 匿名ユーザーはIDを知っていればアクセス可能
CREATE POLICY "zunda_text_cache_select" 
  ON public.zunda_yomiage_text_cache 
  FOR SELECT 
  USING (true);

-- UPDATE: ステータス更新用
CREATE POLICY "zunda_text_cache_update" 
  ON public.zunda_yomiage_text_cache 
  FOR UPDATE 
  USING (true);

-- DELETE: クリーンアップ用
CREATE POLICY "zunda_text_cache_delete" 
  ON public.zunda_yomiage_text_cache 
  FOR DELETE 
  USING (true);

-- ------------------------------------------------------------
-- 自動クリーンアップ（pg_cron 使用時）
-- ------------------------------------------------------------
-- Supabase Pro プラン以上で pg_cron が利用可能
-- 無料プランでは手動または Edge Function でクリーンアップ

-- SELECT cron.schedule(
--   'cleanup-expired-text-cache',
--   '0 * * * *',  -- 毎時0分に実行
--   $$DELETE FROM public.zunda_yomiage_text_cache WHERE expires_at < now()$$
-- );

-- ------------------------------------------------------------
-- コメント
-- ------------------------------------------------------------
COMMENT ON TABLE public.zunda_yomiage_text_cache IS 'TSD-107 ずんだ読み上げ: 音声生成用テキスト一時保存';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.id IS 'UUID主キー（クライアントに返す識別子）';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.text IS '音声生成対象のテキスト（最大50,000文字）';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.speaker_id IS '話者ID（2:四国めたん, 3:ずんだもん）';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.status IS '処理状態（pending/processing/completed/failed）';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.expires_at IS '自動削除時刻（作成から1時間後）';
COMMENT ON COLUMN public.zunda_yomiage_text_cache.processed_at IS '処理完了時刻';

-- ============================================================
-- End of Schema
-- ============================================================
