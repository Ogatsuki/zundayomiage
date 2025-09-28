'use client';

import React, { useEffect, useState } from 'react';

interface ConnectionStatus {
  status: 'checking' | 'connected' | 'disconnected' | 'mock';
  message: string;
}

export function VoicevoxStatus() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'checking',
    message: '接続確認中...'
  });

  useEffect(() => {
    const checkConnection = async () => {
      // モックモードの確認
      const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

      if (isMockMode) {
        setConnectionStatus({
          status: 'mock',
          message: 'モックモード（開発用）'
        });
        return;
      }

      try {
        const response = await fetch('/api/voicevox-health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          setConnectionStatus({
            status: 'connected',
            message: 'VOICEVOXサービス接続中'
          });
        } else {
          setConnectionStatus({
            status: 'disconnected',
            message: 'VOICEVOXサービス未接続'
          });
        }
      } catch (error) {
        setConnectionStatus({
          status: 'disconnected',
          message: 'VOICEVOXサービス未接続'
        });
      }
    };

    // 初回チェック
    checkConnection();

    // 定期的なヘルスチェック（30秒ごと）
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'mock':
        return 'bg-blue-500';
      case 'checking':
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return '✓';
      case 'disconnected':
        return '✗';
      case 'mock':
        return '🔧';
      case 'checking':
      default:
        return '⏳';
    }
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
          {connectionStatus.status === 'checking' && (
            <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping" />
          )}
        </div>
      </div>
      <span className="text-sm font-medium text-gray-700">
        {getStatusIcon()} {connectionStatus.message}
      </span>
      {connectionStatus.status === 'disconnected' && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          再確認
        </button>
      )}
    </div>
  );
}