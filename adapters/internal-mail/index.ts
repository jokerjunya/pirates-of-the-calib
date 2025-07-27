/**
 * Web-CALIB メールスクレイピング統合モジュール
 * 
 * このモジュールは以下の機能を提供します:
 * - Web-CALIBからのメールスクレイピング
 * - HTMLパースとDTO変換
 * - Gmail形式へのマッピング
 * - ca-support2との連携
 */

// 型定義のエクスポート
export type {
  InternalMailDTO,
  AttachmentDTO,
  GmailLikeThreadDTO,
  GmailLikeMessageDTO,
  GmailPayloadDTO,
  GmailHeaderDTO,
  GmailBodyDTO,
  ScraperConfig,
  ScrapeResult
} from './types';

// スクレイパー機能のエクスポート
export { 
  WebCalibScraper,
  fetchMails 
} from './scraper';

// パーサー機能のエクスポート
export { 
  parseMailDetail 
} from './parser';

// マッピング機能のエクスポート
export {
  mapToGmailLikeThreads,
  mapToGmailLikeMessage,
  convertInternalMailsToGmailFormat,
  convertSingleMail
} from './mapper';

// 統合ワークフロー関数
import { fetchMails } from './scraper';
import { convertInternalMailsToGmailFormat } from './mapper';
import type { ScraperConfig, InternalMailDTO, GmailLikeThreadDTO, GmailLikeMessageDTO } from './types';

/**
 * Web-CALIBから完全なメール同期を実行
 * スクレイピング → パース → Gmail形式変換まで一括実行
 */
export async function syncWebCalibMails(config: ScraperConfig): Promise<{
  success: boolean;
  internalMails: InternalMailDTO[];
  gmailThreads: GmailLikeThreadDTO[];
  gmailMessages: GmailLikeMessageDTO[];
  summary: {
    totalScraped: number;
    totalThreads: number;
    totalMessages: number;
    errors: string[];
  };
}> {
  console.log('🚀 Web-CALIB メール同期を開始...');
  
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    // Step 1: スクレイピング実行
    console.log('📥 Step 1: Web-CALIBからメールをスクレイピング中...');
    const internalMails = await fetchMails(config);
    
    if (internalMails.length === 0) {
      console.log('ℹ️ スクレイピング結果: メールが見つかりませんでした');
      return {
        success: true,
        internalMails: [],
        gmailThreads: [],
        gmailMessages: [],
        summary: {
          totalScraped: 0,
          totalThreads: 0,
          totalMessages: 0,
          errors: ['メールが見つかりませんでした']
        }
      };
    }
    
    console.log(`✅ Step 1 完了: ${internalMails.length}件のメールを取得`);
    
    // Step 2: Gmail形式に変換
    console.log('🔄 Step 2: Gmail形式に変換中...');
    const converted = convertInternalMailsToGmailFormat(internalMails);
    
    console.log(`✅ Step 2 完了: ${converted.threadCount}スレッド, ${converted.totalCount}メッセージに変換`);
    
    const duration = Date.now() - startTime;
    console.log(`🎉 Web-CALIB メール同期完了 (${duration}ms)`);
    
    return {
      success: true,
      internalMails,
      gmailThreads: converted.threads,
      gmailMessages: converted.messages,
      summary: {
        totalScraped: internalMails.length,
        totalThreads: converted.threadCount,
        totalMessages: converted.totalCount,
        errors
      }
    };
    
  } catch (error) {
    const errorMessage = `同期エラー: ${error}`;
    console.error('❌', errorMessage);
    errors.push(errorMessage);
    
    return {
      success: false,
      internalMails: [],
      gmailThreads: [],
      gmailMessages: [],
      summary: {
        totalScraped: 0,
        totalThreads: 0,
        totalMessages: 0,
        errors
      }
    };
  }
}

/**
 * 設定の妥当性チェック
 */
export function validateScraperConfig(config: Partial<ScraperConfig>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 必須項目チェック
  if (!config.baseUrl) errors.push('baseUrl is required');
  if (!config.loginUrl) errors.push('loginUrl is required');
  if (!config.listUrl) errors.push('listUrl is required');
  if (!config.username) errors.push('username is required');
  if (!config.password) errors.push('password is required');
  
  // URL形式チェック
  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    errors.push('baseUrl must start with http:// or https://');
  }
  
  if (config.loginUrl && !config.loginUrl.startsWith('http') && !config.loginUrl.startsWith('/')) {
    warnings.push('loginUrl should be a full URL or relative path');
  }
  
  // タイムアウト値チェック
  if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
    warnings.push('timeout should be between 1000ms and 300000ms');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * デバッグ用の簡易設定生成
 */
export function createDebugConfig(overrides: Partial<ScraperConfig> = {}): ScraperConfig {
  return {
    baseUrl: 'https://your-webcalib-server.com',
    loginUrl: '/webcalib/app/login?CLB31A',
    listUrl: '/webcalib/app/message_management33_list',
    username: 'debug-user',
    password: 'debug-password',
    headless: false, // デバッグ時はブラウザを表示
    timeout: 60000,
    ...overrides
  };
}

/**
 * 統計情報の生成
 */
export function generateMailStatistics(mails: InternalMailDTO[]): {
  totalMails: number;
  uniqueSenders: number;
  dateRange: { earliest: string; latest: string };
  priorityDistribution: Record<string, number>;
  attachmentCount: number;
  averageBodyLength: number;
} {
  if (mails.length === 0) {
    return {
      totalMails: 0,
      uniqueSenders: 0,
      dateRange: { earliest: '', latest: '' },
      priorityDistribution: {},
      attachmentCount: 0,
      averageBodyLength: 0
    };
  }
  
  const senders = new Set(mails.map(m => m.from));
  const dates = mails.map(m => new Date(m.date).getTime()).sort();
  const priorities = mails.reduce((acc, m) => {
    const priority = m.priority || 'normal';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const attachmentCount = mails.reduce((total, m) => 
    total + (m.attachments?.length || 0), 0
  );
  
  const totalBodyLength = mails.reduce((total, m) => 
    total + m.body.length, 0
  );
  
  return {
    totalMails: mails.length,
    uniqueSenders: senders.size,
    dateRange: {
      earliest: new Date(dates[0]).toISOString(),
      latest: new Date(dates[dates.length - 1]).toISOString()
    },
    priorityDistribution: priorities,
    attachmentCount,
    averageBodyLength: Math.round(totalBodyLength / mails.length)
  };
} 