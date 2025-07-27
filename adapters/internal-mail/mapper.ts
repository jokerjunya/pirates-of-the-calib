import { 
  InternalMailDTO, 
  GmailLikeThreadDTO, 
  GmailLikeMessageDTO, 
  GmailPayloadDTO,
  GmailHeaderDTO,
  GmailBodyDTO 
} from './types';

/**
 * InternalMailDTO配列をGmailLikeThreadDTO配列に変換
 * 同じthreadIdを持つメールをグループ化してスレッドを作成
 */
export function mapToGmailLikeThreads(internalMails: InternalMailDTO[]): GmailLikeThreadDTO[] {
  // threadIdでグループ化
  const threadMap = new Map<string, InternalMailDTO[]>();
  
  for (const mail of internalMails) {
    const threadId = mail.threadId || mail.id;
    if (!threadMap.has(threadId)) {
      threadMap.set(threadId, []);
    }
    threadMap.get(threadId)!.push(mail);
  }
  
  // 各スレッドを変換
  const threads: GmailLikeThreadDTO[] = [];
  
  for (const [threadId, mails] of threadMap) {
    // 時系列順にソート
    mails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const thread = mapToGmailLikeThread(threadId, mails);
    threads.push(thread);
  }
  
  return threads;
}

/**
 * 単一のInternalMailDTOをGmailLikeMessageDTOに変換
 */
export function mapToGmailLikeMessage(internalMail: InternalMailDTO): GmailLikeMessageDTO {
  const headers = createGmailHeaders(internalMail);
  const body = createGmailBody(internalMail);
  const payload = createGmailPayload(internalMail, headers, body);
  
  return {
    id: internalMail.id,
    threadId: internalMail.threadId || internalMail.id,
    labelIds: createLabelIds(internalMail),
    snippet: createSnippet(internalMail.body),
    historyId: generateHistoryId(internalMail),
    internalDate: new Date(internalMail.date).getTime().toString(),
    payload,
    sizeEstimate: estimateSize(internalMail)
  };
}

/**
 * 内部関数: スレッド作成
 */
function mapToGmailLikeThread(threadId: string, mails: InternalMailDTO[]): GmailLikeThreadDTO {
  const messages = mails.map(mapToGmailLikeMessage);
  const latestMail = mails[mails.length - 1];
  
  return {
    id: threadId,
    subject: latestMail.subject,
    snippet: createSnippet(latestMail.body),
    historyId: generateHistoryId(latestMail),
    messages,
    labels: ['INTERNAL_MAIL', 'INBOX'] // Web-CALIB由来のメールとして識別
  };
}

/**
 * Gmail風のヘッダー作成
 */
function createGmailHeaders(mail: InternalMailDTO): GmailHeaderDTO[] {
  const headers: GmailHeaderDTO[] = [
    { name: 'Message-ID', value: mail.messageId },
    { name: 'Date', value: mail.date },
    { name: 'From', value: mail.from },
    { name: 'To', value: mail.to.join(', ') },
    { name: 'Subject', value: mail.subject }
  ];
  
  if (mail.cc && mail.cc.length > 0) {
    headers.push({ name: 'Cc', value: mail.cc.join(', ') });
  }
  
  if (mail.bcc && mail.bcc.length > 0) {
    headers.push({ name: 'Bcc', value: mail.bcc.join(', ') });
  }
  
  // Web-CALIB特有のヘッダー
  headers.push(
    { name: 'X-Source', value: 'Web-CALIB' },
    { name: 'X-Priority', value: mail.priority || 'normal' }
  );
  
  if (mail.threadId) {
    headers.push({ name: 'X-Thread-ID', value: mail.threadId });
  }
  
  return headers;
}

/**
 * Gmail風のボディ作成
 */
function createGmailBody(mail: InternalMailDTO): GmailBodyDTO {
  const bodyData = Buffer.from(mail.body, 'utf-8').toString('base64');
  
  return {
    size: Buffer.byteLength(mail.body, 'utf-8'),
    data: bodyData
  };
}

/**
 * Gmail風のペイロード作成
 */
function createGmailPayload(
  mail: InternalMailDTO, 
  headers: GmailHeaderDTO[], 
  body: GmailBodyDTO
): GmailPayloadDTO {
  const payload: GmailPayloadDTO = {
    partId: '0',
    mimeType: 'text/plain',
    filename: '',
    headers,
    body
  };
  
  // 添付ファイルがある場合
  if (mail.attachments && mail.attachments.length > 0) {
    payload.mimeType = 'multipart/mixed';
    payload.parts = [
      // メイン本文パート
      {
        partId: '0.0',
        mimeType: 'text/plain',
        filename: '',
        headers: [
          { name: 'Content-Type', value: 'text/plain; charset=UTF-8' }
        ],
        body
      },
      // 添付ファイルパート
      ...mail.attachments.map((attachment, index) => ({
        partId: `0.${index + 1}`,
        mimeType: attachment.contentType,
        filename: attachment.name,
        headers: [
          { name: 'Content-Type', value: attachment.contentType },
          { name: 'Content-Disposition', value: `attachment; filename="${attachment.name}"` }
        ],
        body: {
          attachmentId: attachment.id,
          size: attachment.size,
          data: attachment.content ? attachment.content.toString('base64') : undefined
        }
      }))
    ];
  }
  
  return payload;
}

/**
 * ラベルID作成
 */
function createLabelIds(mail: InternalMailDTO): string[] {
  const labels = ['INTERNAL_MAIL'];
  
  if (mail.isRead) {
    labels.push('UNREAD');
  }
  
  if (mail.priority === 'high') {
    labels.push('IMPORTANT');
  }
  
  // 件名や差出人に基づく自動分類
  if (mail.subject.toLowerCase().includes('urgent') || 
      mail.subject.toLowerCase().includes('緊急')) {
    labels.push('URGENT');
  }
  
  if (mail.from.includes('noreply') || mail.from.includes('no-reply')) {
    labels.push('NOTIFICATION');
  }
  
  return labels;
}

/**
 * スニペット作成（本文の要約）
 */
function createSnippet(body: string): string {
  // HTMLタグを除去
  const plainText = body.replace(/<[^>]*>/g, '');
  
  // 改行や余分な空白を整理
  const cleaned = plainText.replace(/\s+/g, ' ').trim();
  
  // 最初の150文字を取得
  return cleaned.length > 150 
    ? cleaned.substring(0, 150) + '...'
    : cleaned;
}

/**
 * HistoryID生成（メールの更新履歴追跡用）
 */
function generateHistoryId(mail: InternalMailDTO): string {
  // メールIDと日付からハッシュを生成
  const hashInput = `${mail.id}-${mail.date}`;
  const hash = Buffer.from(hashInput).toString('base64').substring(0, 16);
  return hash;
}

/**
 * メールサイズ推定
 */
function estimateSize(mail: InternalMailDTO): number {
  let size = Buffer.byteLength(JSON.stringify(mail), 'utf-8');
  
  // 添付ファイルサイズも加算
  if (mail.attachments) {
    size += mail.attachments.reduce((total, attachment) => 
      total + attachment.size, 0
    );
  }
  
  return size;
}

/**
 * バッチ変換のヘルパー関数
 */
export function convertInternalMailsToGmailFormat(
  internalMails: InternalMailDTO[]
): {
  threads: GmailLikeThreadDTO[];
  messages: GmailLikeMessageDTO[];
  totalCount: number;
  threadCount: number;
} {
  console.log(`🔄 ${internalMails.length}件のメールを Gmail 形式に変換中...`);
  
  const threads = mapToGmailLikeThreads(internalMails);
  const messages = internalMails.map(mapToGmailLikeMessage);
  
  console.log(`✅ 変換完了: ${threads.length}スレッド, ${messages.length}メッセージ`);
  
  return {
    threads,
    messages,
    totalCount: messages.length,
    threadCount: threads.length
  };
}

/**
 * 個別変換のヘルパー関数
 */
export function convertSingleMail(mail: InternalMailDTO): {
  thread: GmailLikeThreadDTO;
  message: GmailLikeMessageDTO;
} {
  const message = mapToGmailLikeMessage(mail);
  const thread: GmailLikeThreadDTO = {
    id: mail.threadId || mail.id,
    subject: mail.subject,
    snippet: createSnippet(mail.body),
    historyId: generateHistoryId(mail),
    messages: [message],
    labels: ['INTERNAL_MAIL', 'INBOX']
  };
  
  return { thread, message };
} 