'use client';

import React from 'react';

interface TermsAndCreditsProps {
  className?: string;
}

export const TermsAndCredits: React.FC<TermsAndCreditsProps> = ({ className = '' }) => {
  return (
    <div className={`text-center space-y-3 ${className}`}>
      {/* VOICEVOXクレジット */}
      <div className="text-xs sm:text-sm text-green-700">
        <p className="font-semibold mb-1">音声合成エンジン</p>
        <p>
          <a
            href="https://voicevox.hiroshiba.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline"
          >
            VOICEVOX
          </a> by Hiroshiba Kazuyuki
        </p>
        <p className="text-xs text-green-600 mt-1">
          VOICEVOX:ずんだもん
        </p>
      </div>

      {/* キャラクタークレジット */}
      <div className="text-xs sm:text-sm text-green-700">
        <p className="font-semibold mb-1">キャラクター</p>
        <p>
          ずんだもん（
          <a
            href="https://zunko.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline"
          >
            東北ずん子プロジェクト
          </a>
          ）
        </p>
        <p className="text-xs text-green-600 mt-1">
          （ず・ω・きょ）
        </p>
      </div>

      {/* 利用規約への注記 */}
      <div className="text-xs text-green-600 pt-2 border-t border-green-200">
        <p>
          このアプリは
          <a
            href="https://voicevox.hiroshiba.jp/term/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline mx-1"
          >
            VOICEVOX利用規約
          </a>
          および
          <a
            href="https://zunko.jp/guideline.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline mx-1"
          >
            東北ずん子プロジェクトガイドライン
          </a>
          に準拠しています
        </p>
      </div>
    </div>
  );
};

export default TermsAndCredits;