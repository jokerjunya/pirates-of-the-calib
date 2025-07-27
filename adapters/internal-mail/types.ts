/**
 * Web-CALIB内部メールのDTO型定義
 */
export interface InternalMailDTO {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  body: string;
  attachments?: AttachmentDTO[];
  isRead: boolean;
  priority?: 'high' | 'normal' | 'low';
  messageId: string;
  threadId?: string;
}

export interface AttachmentDTO {
  id: string;
  name: string;
  size: number;
  contentType: string;
  downloadUrl?: string;
  content?: Buffer;
}

/**
 * ca-support2 (Gmail互換) のDTO型定義
 */
export interface GmailLikeThreadDTO {
  id: string;
  subject: string;
  snippet: string;
  historyId: string;
  messages: GmailLikeMessageDTO[];
  labels: string[];
}

export interface GmailLikeMessageDTO {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailPayloadDTO;
  sizeEstimate: number;
}

export interface GmailPayloadDTO {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeaderDTO[];
  body: GmailBodyDTO;
  parts?: GmailPayloadDTO[];
}

export interface GmailHeaderDTO {
  name: string;
  value: string;
}

export interface GmailBodyDTO {
  attachmentId?: string;
  size: number;
  data?: string; // Base64エンコード
}

/**
 * スクレイピング設定
 */
export interface ScraperConfig {
  baseUrl: string;
  loginUrl: string;
  listUrl: string;
  username: string;
  password: string;
  targetEmail?: string;      // 検索対象のe-mailアドレス
  searchUrl?: string;        // e-mail検索ページのURL
  jobseekerNo?: string;
  headless?: boolean;
  timeout?: number;
}

/**
 * スクレイピング結果
 */
export interface ScrapeResult {
  success: boolean;
  totalMails: number;
  processedMails: number;
  errors: string[];
  mails: InternalMailDTO[];
} 