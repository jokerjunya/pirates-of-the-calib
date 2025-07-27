import type { NextApiRequest, NextApiResponse } from 'next';

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
 * ca-support2からメール一覧を取得 (Ultra AI方式を参考)
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
    // TODO: 実際のca-support2データベース接続
    // 現在はプレースホルダー実装（参考事例に基づいたダミーデータ）
    
    const dummyMails = [
      {
        id: 'webcalib-001',
        subject: 'PDT求人への応募手続き依頼の連絡',
        from: 'system@rt-calib.r-agent.com',
        to: 'yuya_inagaki+005@r.recruit.co.jp',
        date: '2024-01-15T10:30:00Z',
        isRead: false,
        threadId: 'thread-001',
        snippet: 'PDT求人への応募に関する手続きについてご連絡いたします...',
        labels: ['重要', 'Web-CALIB'],
        sourceUrl: 'https://rt-calib.r-agent.com/webcalib/app/message_management33_view?messageNo=2496126158'
      },
      {
        id: 'webcalib-002',
        subject: '面談予約時のCS希望',
        from: 'hr@rt-calib.r-agent.com',
        to: 'yuya_inagaki+005@r.recruit.co.jp',
        date: '2024-01-14T14:20:00Z',
        isRead: true,
        threadId: 'thread-002',
        snippet: '面談予約の際のCS希望についてお知らせいたします...',
        labels: ['面談', 'Web-CALIB'],
        sourceUrl: 'https://rt-calib.r-agent.com/webcalib/app/message_management33_view?messageNo=2496126157'
      },
      {
        id: 'webcalib-003',
        subject: '面談希望日 回答のお願い【リクルートエー',
        from: 'support@rt-calib.r-agent.com',
        to: 'yuya_inagaki+005@r.recruit.co.jp',
        date: '2024-01-13T09:15:00Z',
        isRead: false,
        threadId: 'thread-003',
        snippet: '面談希望日についてのご回答をお願いいたします...',
        labels: ['面談', 'リクルート', 'Web-CALIB'],
        sourceUrl: 'https://rt-calib.r-agent.com/webcalib/app/message_management33_view?messageNo=2496125586'
      }
    ];

    // フィルタリング処理 (Dash AI方式)
    let filteredMails = [...dummyMails];
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredMails = filteredMails.filter(mail => 
        mail.subject.toLowerCase().includes(searchTerm) ||
        mail.from.toLowerCase().includes(searchTerm) ||
        mail.snippet.toLowerCase().includes(searchTerm)
      );
    }
    
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
    
    return {
      mails: paginatedMails,
      totalCount: filteredMails.length,
      lastSyncAt: new Date().toISOString(),
      stats: {
        unreadCount: filteredMails.filter(mail => !mail.isRead).length,
        totalSize: `${(filteredMails.length * 1.2).toFixed(1)} MB` // 概算
      }
    };
    
  } catch (error) {
    console.error('メール取得エラー:', error);
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