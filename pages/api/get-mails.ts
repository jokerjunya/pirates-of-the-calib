import type { NextApiRequest, NextApiResponse } from 'next';
// 簡易ストレージの利用
import { getAllMessages, searchMessages, getStorageStats } from '../../lib/simple-storage';

/**
 * メール一覧レスポンス型定義 (Ultra AI & Dash AI方式を参考)
 */
interface MailListResponse {
  success: boolean;
  data?: {
    mails: Array<{
      id: string;
      subject: string;
      from: string;
      to: string;
      date: string;
      isRead: boolean;
      threadId: string;
      snippet: string; // Ultra AIのsummary機能を参考
      labels: string[];
      sourceUrl?: string; // Event Genieのsource linking機能を参考
    }>;
    totalCount: number;
    lastSyncAt: string;
    stats: {
      unreadCount: number;
      totalSize: string;
    };
  };
  error?: string;
}

/**
 * クエリパラメータ型定義
 */
interface GetMailsQuery {
  limit?: string;
  offset?: string;
  search?: string;
  label?: string;
  unreadOnly?: string;
}

/**
 * 簡易ストレージからメール一覧を取得 (Phase 1実装)
 */
async function fetchMailsFromCaSupport2(
  limit: number = 100,
  offset: number = 0,
  filters: {
    search?: string;
    label?: string;
    unreadOnly?: boolean;
  } = {}
): Promise<MailListResponse['data']> {
  try {
    // Phase 1: 簡易ストレージから実際のメールデータを取得
    console.log('📧 簡易ストレージからメールデータを取得中...');
    
    let messages = filters.search 
      ? await searchMessages(filters.search)
      : await getAllMessages();

    console.log(`📧 ストレージから${messages.length}件のメッセージを取得`);

    // メールデータの変換（GmailLikeMessageDTO → Mail形式）
    const convertedMails = messages.map(message => {
      // ヘッダーから情報を抽出
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
      
      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To');
      const dateStr = getHeader('Date') || message.internalDate;
      
      // メール本文の抽出（snippet優先、なければbody.dataから）
      let snippet = message.snippet || '';
      if (!snippet && message.payload?.body?.data) {
        // Base64デコードを試行
        try {
          snippet = Buffer.from(message.payload.body.data, 'base64').toString('utf8').substring(0, 200);
        } catch {
          snippet = '本文を取得できませんでした';
        }
      }

      // 元メールのURL構築（messageIdから）
      let sourceUrl = '';
      if (message.id && message.id.includes('webcalib-')) {
        // メッセージIDからmessageNoを抽出
        const parts = message.id.split('-');
        if (parts.length >= 2) {
          sourceUrl = `https://rt-calib.r-agent.com/webcalib/app/message_management33_view?messageNo=${parts[1]}&jobseekerNo=J025870`;
        }
      }

      return {
        id: message.id,
        subject,
        from,
        to,
        date: dateStr || message.createdAt,
        isRead: true, // 一旦全て既読として扱う
        threadId: message.threadId || 'thread-default',
        snippet: snippet.substring(0, 200) + (snippet.length > 200 ? '...' : ''),
        labels: ['Web-CALIB'], // 基本ラベル
        sourceUrl
      };
    });

    // フィルタリング処理
    let filteredMails = [...convertedMails];
    
    if (filters.label) {
      filteredMails = filteredMails.filter(mail => 
        mail.labels.some(label => 
          label.toLowerCase().includes(filters.label!.toLowerCase())
        )
      );
    }
    
    if (filters.unreadOnly) {
      filteredMails = filteredMails.filter(mail => !mail.isRead);
    }

    // ページネーション
    const paginatedMails = filteredMails.slice(offset, offset + limit);
    
    // 統計情報を取得
    const stats = await getStorageStats();
    
    console.log(`✅ ${paginatedMails.length}件のメールを変換完了`);
    
    return {
      mails: paginatedMails,
      totalCount: filteredMails.length,
      lastSyncAt: stats.lastSyncAt,
      stats: {
        unreadCount: filteredMails.filter(mail => !mail.isRead).length,
        totalSize: stats.storageSize
      }
    };
    
  } catch (error) {
    console.error('❌ メール取得エラー:', error);
    throw new Error('メールの取得に失敗しました');
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MailListResponse>
) {
  // GETリクエストのみ許可 (Ultra AI方式)
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'GETリクエストのみサポートしています'
    });
  }

  try {
    const query = req.query as GetMailsQuery;
    
    // パラメータ解析 (Dash AI方式を参考)
    const limit = Math.min(parseInt(query.limit || '50'), 100); // 最大100件
    const offset = Math.max(parseInt(query.offset || '0'), 0);
    const filters = {
      search: query.search,
      label: query.label,
      unreadOnly: query.unreadOnly === 'true'
    };

    console.log(`📧 メール一覧取得: limit=${limit}, offset=${offset}`, filters);

    // メール取得実行
    const data = await fetchMailsFromCaSupport2(limit, offset, filters);
    
    console.log(`✅ ${data.mails.length}件のメールを取得完了`);

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ メール一覧取得API エラー:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '内部サーバーエラー'
    });
  }
} 