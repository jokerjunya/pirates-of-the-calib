import type { NextApiRequest, NextApiResponse } from 'next';
import { syncWebCalibMails, validateScraperConfig } from '../../adapters/internal-mail/index';
import type { ScraperConfig, GmailLikeThreadDTO, GmailLikeMessageDTO } from '../../adapters/internal-mail/types';

/**
 * API レスポンス型定義
 */
interface ImportResponse {
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

/**
 * リクエストボディ型定義
 */
interface ImportRequest {
  // オプション1: 直接Gmail形式データを受信
  threads?: GmailLikeThreadDTO[];
  messages?: GmailLikeMessageDTO[];
  
  // オプション2: スクレイピング設定を受信して自動実行
  scraperConfig?: ScraperConfig;
  
  // オプション3: CLIから同期されたデータを受信
  mode?: 'direct' | 'scrape' | 'sync';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>
) {
  // POST リクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed',
      error: 'POSTリクエストのみサポートしています'
    });
  }

  try {
    const body: ImportRequest = req.body;
    const mode = body.mode || 'direct';

    console.log(`📨 Internal mail import request received (mode: ${mode})`);

    switch (mode) {
      case 'scrape':
        return await handleScrapeMode(req, res, body);
      case 'direct':
        return await handleDirectMode(req, res, body);
      case 'sync':
        return await handleSyncMode(req, res, body);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid mode',
          error: 'サポートされていないモードです'
        });
    }

  } catch (error) {
    console.error('❌ Import API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: `サーバーエラー: ${error}`
    });
  }
}

/**
 * スクレイピングモード: 設定を受け取ってリアルタイムでスクレイピング実行
 */
async function handleScrapeMode(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>,
  body: ImportRequest
): Promise<void> {
  const { scraperConfig } = body;

  if (!scraperConfig) {
    return res.status(400).json({
      success: false,
      message: 'Missing scraper config',
      error: 'スクレイピング設定が必要です'
    });
  }

  // 設定の妥当性チェック
  const validation = validateScraperConfig(scraperConfig);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid scraper config',
      error: `設定エラー: ${validation.errors.join(', ')}`
    });
  }

  console.log('🕷️  Starting Web-CALIB scraping...');

  // スクレイピング実行
  const syncResult = await syncWebCalibMails(scraperConfig);

  if (!syncResult.success) {
    return res.status(500).json({
      success: false,
      message: 'Scraping failed',
      error: `スクレイピングエラー: ${syncResult.summary.errors.join(', ')}`
    });
  }

  // ca-support2 に取り込み
  const importResult = await importToSupport2(syncResult.gmailThreads, syncResult.gmailMessages);

  return res.status(200).json({
    success: true,
    message: `Web-CALIB同期完了: ${syncResult.summary.totalScraped}件のメールを処理`,
    data: {
      importedThreads: importResult.importedThreads,
      importedMessages: importResult.importedMessages,
      duplicateThreads: importResult.duplicateThreads,
      errors: [...syncResult.summary.errors, ...importResult.errors],
      processedAt: new Date().toISOString()
    }
  });
}

/**
 * 直接モード: Gmail形式データを直接受信して取り込み
 */
async function handleDirectMode(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>,
  body: ImportRequest
): Promise<void> {
  const { threads = [], messages = [] } = body;

  if (threads.length === 0 && messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data provided',
      error: 'スレッドまたはメッセージデータが必要です'
    });
  }

  console.log(`📧 Processing ${threads.length} threads and ${messages.length} messages...`);

  // ca-support2 に取り込み
  const importResult = await importToSupport2(threads, messages);

  return res.status(200).json({
    success: true,
    message: `データ取り込み完了: ${threads.length}スレッド, ${messages.length}メッセージ`,
    data: {
      importedThreads: importResult.importedThreads,
      importedMessages: importResult.importedMessages,
      duplicateThreads: importResult.duplicateThreads,
      errors: importResult.errors,
      processedAt: new Date().toISOString()
    }
  });
}

/**
 * 同期モード: CLIからの同期済みデータを受信
 */
async function handleSyncMode(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>,
  body: ImportRequest
): Promise<void> {
  // CLIから既に処理済みのデータを受信する場合
  // 実装はdirectModeと同じだが、ログや処理方法を変える可能性がある
  return await handleDirectMode(req, res, body);
}

/**
 * ca-support2 システムへの実際の取り込み処理
 * 
 * NOTE: この部分は既存のca-support2システムの仕様に合わせて実装する必要があります
 * 以下は一般的な実装例です
 */
async function importToSupport2(
  threads: GmailLikeThreadDTO[],
  messages: GmailLikeMessageDTO[]
): Promise<{
  importedThreads: number;
  importedMessages: number;
  duplicateThreads: number;
  errors: string[];
}> {
  const result = {
    importedThreads: 0,
    importedMessages: 0,
    duplicateThreads: 0,
    errors: [] as string[]
  };

  try {
    console.log('🔄 Importing to ca-support2...');

    // スレッドの取り込み
    for (const thread of threads) {
      try {
        // 重複チェック（既存のスレッドIDで確認）
        const existingThread = await checkExistingThread(thread.id);
        
        if (existingThread) {
          console.log(`⏭️  Thread already exists: ${thread.subject}`);
          result.duplicateThreads++;
          continue;
        }

        // 新しいスレッドとして保存
        await saveThread(thread);
        result.importedThreads++;
        
        console.log(`✅ Thread imported: ${thread.subject}`);

      } catch (error) {
        const errorMsg = `Thread import error (${thread.id}): ${error}`;
        console.error('❌', errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // メッセージの取り込み
    for (const message of messages) {
      try {
        // 重複チェック
        const existingMessage = await checkExistingMessage(message.id);
        
        if (existingMessage) {
          console.log(`⏭️  Message already exists: ${message.id}`);
          continue;
        }

        // 新しいメッセージとして保存
        await saveMessage(message);
        result.importedMessages++;

      } catch (error) {
        const errorMsg = `Message import error (${message.id}): ${error}`;
        console.error('❌', errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(`🎉 Import completed: ${result.importedThreads} threads, ${result.importedMessages} messages`);

  } catch (error) {
    const errorMsg = `Import process error: ${error}`;
    console.error('❌', errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * 既存スレッドの確認
 * TODO: ca-support2の実際のDB/APIに合わせて実装
 */
async function checkExistingThread(threadId: string): Promise<boolean> {
  // 実装例:
  // const existingThread = await db.thread.findUnique({ where: { id: threadId } });
  // return !!existingThread;
  
  // 一時的な実装（常に新規として扱う）
  return false;
}

/**
 * 既存メッセージの確認
 * TODO: ca-support2の実際のDB/APIに合わせて実装
 */
async function checkExistingMessage(messageId: string): Promise<boolean> {
  // 実装例:
  // const existingMessage = await db.message.findUnique({ where: { id: messageId } });
  // return !!existingMessage;
  
  // 一時的な実装（常に新規として扱う）
  return false;
}

/**
 * スレッドの保存
 * TODO: ca-support2の実際のDB/APIに合わせて実装
 */
async function saveThread(thread: GmailLikeThreadDTO): Promise<void> {
  // 実装例:
  // await db.thread.create({
  //   data: {
  //     id: thread.id,
  //     subject: thread.subject,
  //     snippet: thread.snippet,
  //     historyId: thread.historyId,
  //     labels: thread.labels,
  //     // ... その他のフィールド
  //   }
  // });
  
  // 一時的な実装（ログ出力のみ）
  console.log(`💾 Saving thread: ${thread.subject} (${thread.messages.length} messages)`);
  
  // メッセージも一緒に保存
  for (const message of thread.messages) {
    await saveMessage(message);
  }
}

/**
 * メッセージの保存
 * TODO: ca-support2の実際のDB/APIに合わせて実装
 */
async function saveMessage(message: GmailLikeMessageDTO): Promise<void> {
  // 実装例:
  // await db.message.create({
  //   data: {
  //     id: message.id,
  //     threadId: message.threadId,
  //     snippet: message.snippet,
  //     internalDate: message.internalDate,
  //     payload: message.payload,
  //     // ... その他のフィールド
  //   }
  // });
  
  // 一時的な実装（ログ出力のみ）
  console.log(`💾 Saving message: ${message.id} in thread ${message.threadId}`);
} 