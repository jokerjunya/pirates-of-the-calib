import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// 同期状態の型定義
interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  totalMails: number;
  processedMails: number;
  errors: string[];
  lastSyncAt?: string;
}

// 同期結果の型定義
interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    importedThreads: number;
    importedMessages: number;
    duplicateThreads: number;
    errors: string[];
    processedAt: string;
  };
  error?: string;
}

export default function SyncDashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    progress: 0,
    currentStep: '待機中',
    totalMails: 0,
    processedMails: 0,
    errors: []
  });

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [config, setConfig] = useState({
    baseUrl: '',
    username: '',
    password: '',
    targetEmail: '',
    jobseekerNo: '',
    headless: true
  });

  // 設定を環境変数から初期化
  useEffect(() => {
    setConfig({
      baseUrl: process.env.NEXT_PUBLIC_WEBCALIB_BASE_URL || 'https://rt-calib.r-agent.com',
      username: process.env.NEXT_PUBLIC_WEBCALIB_USERNAME || '',
      password: '', // セキュリティ上、パスワードは毎回入力
      targetEmail: process.env.NEXT_PUBLIC_WEBCALIB_TARGET_EMAIL || 'yuya_inagaki+005@r.recruit.co.jp',
      jobseekerNo: process.env.NEXT_PUBLIC_WEBCALIB_JOBSEEKER_NO || '',
      headless: false  // デバッグしやすくするためブラウザ表示をデフォルトに
    });
  }, []);

  // 同期実行
  const handleSync = async () => {
    if (!config.baseUrl || !config.username || !config.password || !config.targetEmail) {
      alert('必要な設定項目（Base URL、ユーザー名、パスワード、検索対象e-mail）を入力してください');
      return;
    }

    setSyncStatus(prev => ({
      ...prev,
      isRunning: true,
      progress: 0,
      currentStep: '同期を開始しています...',
      errors: []
    }));

    setSyncResult(null);

    try {
      // 同期リクエストを送信
      const response = await fetch('/api/import-internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'scrape',
          scraperConfig: {
            baseUrl: config.baseUrl,
            loginUrl: '/webcalib/app/logout?sn=21f10a00b9a7d4f4836e5f6077a672af&CLB31A',
            listUrl: '/webcalib/app/message_management33_list',
            username: config.username,
            password: config.password,
            targetEmail: config.targetEmail,
            jobseekerNo: config.jobseekerNo || undefined,
            headless: config.headless,
            timeout: 60000
          }
        })
      });

      const result: SyncResult = await response.json();
      setSyncResult(result);

      if (result.success) {
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          progress: 100,
          currentStep: '同期完了',
          lastSyncAt: new Date().toLocaleString('ja-JP')
        }));
      } else {
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          currentStep: 'エラーが発生しました',
          errors: [result.error || '不明なエラー']
        }));
      }

    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'エラーが発生しました',
        errors: [`通信エラー: ${error}`]
      }));
    }
  };

  return (
    <>
      <Head>
        <title>Web-CALIB メール同期ダッシュボード</title>
        <meta name="description" content="Web-CALIBからca-support2へのメール同期管理" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ヘッダー */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📧 Web-CALIB メール同期ダッシュボード
            </h1>
            <p className="text-gray-600">
              Web-CALIBからメールをスクレイピングして、ca-support2システムに取り込みます
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 設定パネル */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 接続設定</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
                    placeholder="https://your-webcalib-server.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名 *
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({...config, username: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード *
                  </label>
                  <input
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig({...config, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    検索対象e-mail *
                  </label>
                  <input
                    type="email"
                    value={config.targetEmail}
                    onChange={(e) => setConfig({...config, targetEmail: e.target.value})}
                    placeholder="yuya_inagaki+005@r.recruit.co.jp"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    求職者番号 (オプション)
                  </label>
                  <input
                    type="text"
                    value={config.jobseekerNo}
                    onChange={(e) => setConfig({...config, jobseekerNo: e.target.value})}
                    placeholder="12345"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="headless"
                    checked={config.headless}
                    onChange={(e) => setConfig({...config, headless: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="headless" className="ml-2 block text-sm text-gray-900">
                    ヘッドレスモード (ブラウザを非表示) ※デバッグ時はOFFがおすすめ
                  </label>
                </div>
              </div>
            </div>

            {/* ステータスパネル */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 同期ステータス</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>進行状況</span>
                    <span>{syncStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncStatus.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">現在の状態: </span>
                  <span className={`text-sm font-medium ${
                    syncStatus.isRunning ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {syncStatus.isRunning && '🔄 '}{syncStatus.currentStep}
                  </span>
                </div>

                {syncStatus.lastSyncAt && (
                  <div>
                    <span className="text-sm text-gray-600">最終同期: </span>
                    <span className="text-sm text-gray-900">{syncStatus.lastSyncAt}</span>
                  </div>
                )}

                {syncStatus.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">エラー:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {syncStatus.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 同期ボタン */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <button
              onClick={handleSync}
              disabled={syncStatus.isRunning}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                syncStatus.isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {syncStatus.isRunning ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  同期実行中...
                </>
              ) : (
                <>
                  🚀 Web-CALIB同期を開始
                </>
              )}
            </button>
          </div>

          {/* 結果パネル */}
          {syncResult && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 同期結果</h2>
              
              {syncResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 mr-2">✅</span>
                    <span className="font-medium text-green-800">{syncResult.message}</span>
                  </div>
                  
                  {syncResult.data && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">取り込みスレッド数:</span>
                        <span className="ml-2 font-medium">{syncResult.data.importedThreads}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">取り込みメッセージ数:</span>
                        <span className="ml-2 font-medium">{syncResult.data.importedMessages}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">重複スレッド数:</span>
                        <span className="ml-2 font-medium">{syncResult.data.duplicateThreads}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">処理時刻:</span>
                        <span className="ml-2 font-medium">
                          {new Date(syncResult.data.processedAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-red-600 mr-2">❌</span>
                    <span className="font-medium text-red-800">{syncResult.message}</span>
                  </div>
                  {syncResult.error && (
                    <p className="text-sm text-red-700 mt-2">{syncResult.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ヘルプセクション */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-md font-semibold text-blue-900 mb-2">💡 使用ガイド</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Base URL: <code className="bg-blue-100 px-1 rounded">https://rt-calib.r-agent.com</code></li>
              <li>• 検索対象e-mail: スクレイピング対象のユーザーのe-mailアドレス</li>
              <li>• 「同期開始」ボタンで自動的に検索→メッセージ管理→メール取得を実行</li>
              <li>• 取得したメールは自動的に ca-support2 システムに取り込まれます</li>
              <li>• CLI コマンド: <code className="bg-blue-100 px-1 rounded">pnpm sync:internal</code></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
} 