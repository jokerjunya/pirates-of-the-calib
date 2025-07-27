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

// メール型定義 (Ultra AI & Event Genie方式を参考)
interface Mail {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  isRead: boolean;
  threadId: string;
  snippet: string;
  labels: string[];
  sourceUrl?: string;
}

// メール一覧状態型定義
interface MailListState {
  mails: Mail[];
  loading: boolean;
  totalCount: number;
  lastSyncAt: string;
  stats: {
    unreadCount: number;
    totalSize: string;
  };
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

  // メール一覧状態管理 (Ultra AI方式を参考)
  const [mailList, setMailList] = useState<MailListState>({
    mails: [],
    loading: false,
    totalCount: 0,
    lastSyncAt: '',
    stats: {
      unreadCount: 0,
      totalSize: '0 MB'
    }
  });

  // メール一覧取得関数 (Ultra AI & Dash AI方式を参考)
  const fetchMails = async (filters: {
    search?: string;
    label?: string;
    unreadOnly?: boolean;
  } = {}) => {
    setMailList(prev => ({ ...prev, loading: true }));
    
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.label) params.append('label', filters.label);
      if (filters.unreadOnly) params.append('unreadOnly', 'true');
      
      const response = await fetch(`/api/get-mails?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`📧 ${result.data.mails.length}件のメールを取得しました`);
        setMailList({
          mails: result.data.mails,
          loading: false,
          totalCount: result.data.totalCount,
          lastSyncAt: result.data.lastSyncAt,
          stats: result.data.stats
        });
      } else {
        throw new Error(result.error || 'メールの取得に失敗しました');
      }
    } catch (error) {
      console.error('メール取得エラー:', error);
      setMailList(prev => ({ ...prev, loading: false }));
      alert(`メール取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

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

    // 初回メール取得 (Event Genie方式)
    fetchMails();
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

        // 🔥 同期成功時に自動でメール一覧を更新 (Dash AI方式)
        console.log('🔄 同期完了 - メール一覧を自動更新中...');
        await fetchMails();
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

          {/* メール一覧セクション (Gmail風 + Event Genie方式) */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📧 取得済みメール一覧</h2>
              <div className="flex gap-4 items-center text-sm text-gray-600">
                <span>📊 総数: {mailList.totalCount}件</span>
                <span>🔔 未読: {mailList.stats.unreadCount}件</span>
                <span>💾 容量: {mailList.stats.totalSize}</span>
                <button 
                  onClick={() => fetchMails()} 
                  disabled={mailList.loading}
                  className={`px-3 py-1 text-xs border rounded ${
                    mailList.loading 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {mailList.loading ? '🔄' : '↻'} 更新
                </button>
              </div>
            </div>

            {mailList.loading && (
              <div className="text-center py-8 text-gray-500">
                🔄 メール一覧を読み込み中...
              </div>
            )}

            {!mailList.loading && mailList.mails.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                📭 メールがありません。同期を実行してメールを取得してください。
              </div>
            )}

            {!mailList.loading && mailList.mails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📧 件名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        👤 送信者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📮 受信者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📅 日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ⏰ 処理日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📏 サイズ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        🏷️ ラベル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        🔗 アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mailList.mails.map((mail, index) => (
                      <tr 
                        key={mail.id} 
                        className={`hover:bg-gray-50 transition-colors duration-200 ${
                          mail.isRead ? '' : 'bg-blue-50'
                        } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        {/* 件名 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className={`text-sm ${mail.isRead ? 'font-normal text-gray-900' : 'font-bold text-gray-900'} truncate max-w-xs`}>
                              {mail.subject}
                            </div>
                            {mail.snippet && (
                              <div className="text-xs text-gray-500 truncate max-w-xs mt-1">
                                {mail.snippet.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 送信者 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {/* 将来的にmailオブジェクトに sender フィールドが追加される予定 */}
                            {(mail as any).sender || mail.from.replace(' <system@rt-calib.r-agent.com>', '') || 'Web-CALIB System'}
                          </div>
                        </td>

                        {/* 受信者 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {/* 将来的にmailオブジェクトに recipient フィールドが追加される予定 */}
                            {(mail as any).recipient || mail.to || 'yuya_inagaki+005@r.recruit.co.jp'}
                          </div>
                        </td>

                        {/* 日付 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(mail.date).toLocaleDateString('ja-JP', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* 処理日時 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {/* 将来的にmailオブジェクトに processDate フィールドが追加される予定 */}
                            {(mail as any).processDate || 
                             new Date(mail.date).toLocaleDateString('ja-JP', {
                               year: '2-digit',
                               month: '2-digit', 
                               day: '2-digit',
                               hour: '2-digit',
                               minute: '2-digit'
                             }).replace(/\//g, '/').replace(' ', ' ')
                            }
                          </div>
                        </td>

                        {/* サイズ */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {/* 将来的にmailオブジェクトに size フィールドが追加される予定 */}
                            {(mail as any).size || 
                             (mail.snippet ? Math.ceil(mail.snippet.length / 10) : '37')
                            }
                          </div>
                        </td>

                        {/* ラベル */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1 flex-wrap">
                            {mail.labels.slice(0, 2).map((label, labelIndex) => (
                              <span 
                                key={labelIndex}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200"
                              >
                                {label}
                              </span>
                            ))}
                            {mail.labels.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{mail.labels.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* アクション */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2">
                            {mail.sourceUrl && (
                              <a 
                                href={mail.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
                                title="元メールを表示"
                              >
                                🔗 元画面
                              </a>
                            )}
                            <button
                              className="text-green-600 hover:text-green-800 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
                              title="詳細表示"
                            >
                              📖 詳細
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mailList.lastSyncAt && (
              <div className="mt-4 text-xs text-gray-500 text-center">
                📅 最終更新: {new Date(mailList.lastSyncAt).toLocaleString('ja-JP')}
              </div>
            )}
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