'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [authRequired, setAuthRequired] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        const data = await response.json();
        setAuthRequired(data.authenticationRequired);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setInitialized(true);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticationRequired: newValue }),
      });

      if (response.ok) {
        setAuthRequired(newValue);
        setMessage('設定を保存しました');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('設定の保存に失敗しました');
      }
    } catch (error) {
      setMessage('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#192E61] mb-8">システム設定</h1>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#192E61] mb-8">システム設定</h1>

      {/* 認証設定 */}
      <div className="bg-white rounded-lg border border-[#EEEEEE] p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">認証設定</h2>
            <p className="text-sm text-gray-600">
              {authRequired
                ? 'ログインが必須です'
                : 'ログインなしでアクセス可能です'}
            </p>
          </div>

          {/* トグルスイッチ */}
          <button
            onClick={() => handleToggle(!authRequired)}
            disabled={loading}
            className={`w-14 h-8 rounded-full transition-all ${
              authRequired
                ? 'bg-[#0067B8]'
                : 'bg-gray-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full transition-all ${
                authRequired ? 'ml-7' : 'ml-1'
              }`}
            />
          </button>
        </div>

        {message && (
          <div className="mt-4 text-sm text-green-600 bg-green-50 p-3 rounded">
            {message}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>ℹ️ 注意:</strong> 認証を OFF にすると、ログインなしでアプリにアクセスできるようになります。本番環境では慎重に使用してください。
          </p>
        </div>
      </div>
    </div>
  );
}
