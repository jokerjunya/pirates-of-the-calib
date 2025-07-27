import * as cheerio from 'cheerio';
import { InternalMailDTO, AttachmentDTO } from './types';

/**
 * Web-CALIBの詳細ページHTMLをパースしてInternalMailDTOに変換
 */
export function parseMailDetail(htmlContent: string, href: string): InternalMailDTO | null {
  try {
    const $ = cheerio.load(htmlContent);
    
    // メールIDを生成（hrefから抽出またはランダム生成）
    const urlParams = new URLSearchParams(href.split('?')[1] || '');
    const messageId = urlParams.get('messageId') || 
                      urlParams.get('id') || 
                      generateMessageId(href);
    
    // Hidden inputからメタデータを抽出
    const from = extractHiddenInput($, 'from') || 
                 extractFromEmailHeaders($, 'From') || '';
    const to = parseEmailList(extractHiddenInput($, 'to') || 
                             extractFromEmailHeaders($, 'To') || '');
    const cc = parseEmailList(extractHiddenInput($, 'cc') || 
                             extractFromEmailHeaders($, 'Cc') || '');
    const date = extractHiddenInput($, 'date') || 
                 extractHiddenInput($, 'sendDate') || 
                 extractFromEmailHeaders($, 'Date') || '';
    const subject = extractHiddenInput($, 'subject') || 
                    extractFromEmailHeaders($, 'Subject') || 
                    $('title').text() || '';
    
    // メール本文を抽出
    const body = extractMailBody($);
    
    // 添付ファイルを抽出
    const attachments = extractAttachments($, href);
    
    // 既読状態を判定（通常、詳細ページを開いた時点で既読）
    const isRead = true;
    
    // 優先度を抽出（あれば）
    const priority = extractPriority($);
    
    const mailDTO: InternalMailDTO = {
      id: messageId,
      messageId,
      threadId: generateThreadId(subject),
      subject: subject.trim(),
      from: from.trim(),
      to,
      cc: cc.length > 0 ? cc : undefined,
      date: normalizeDate(date),
      body: body.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      isRead,
      priority
    };
    
    console.log(`✅ メール解析完了: ${subject.substring(0, 50)}...`);
    return mailDTO;
    
  } catch (error) {
    console.error('❌ HTML解析エラー:', error);
    return null;
  }
}

/**
 * Hidden inputから値を抽出
 */
function extractHiddenInput($: cheerio.CheerioAPI, name: string): string {
  return $(`input[name="${name}"]`).val()?.toString() || '';
}

/**
 * メールヘッダーから情報を抽出
 */
function extractFromEmailHeaders($: cheerio.CheerioAPI, headerName: string): string {
  // 一般的なヘッダー表示パターンを検索
  const patterns = [
    `th:contains("${headerName}") + td`,
    `td:contains("${headerName}:") + td`,
    `label:contains("${headerName}") + input`,
    `.header-${headerName.toLowerCase()}`,
    `[data-header="${headerName.toLowerCase()}"]`
  ];
  
  for (const pattern of patterns) {
    const value = $(pattern).text() || $(pattern).val()?.toString();
    if (value && value.trim()) {
      return value.trim().replace(`${headerName}:`, '').trim();
    }
  }
  
  return '';
}

/**
 * メール本文を抽出
 */
function extractMailBody($: cheerio.CheerioAPI): string {
  // 一般的な本文コンテナを検索
  const bodySelectors = [
    '#dispArea',           // Web-CALIBでよく使われる
    '.mailBody',
    '.message-body',
    '.mail-content',
    'pre[name="body"]',
    'textarea[name="body"]',
    '.body-content',
    'div[data-body="true"]'
  ];
  
  for (const selector of bodySelectors) {
    const element = $(selector);
    if (element.length > 0) {
      // HTMLタグを除去してテキストのみ取得
      let text = element.text();
      if (text && text.trim()) {
        return text.trim();
      }
      
      // HTMLが含まれている場合はhtmlを取得
      const html = element.html();
      if (html && html.trim()) {
        return html.trim();
      }
    }
  }
  
  // フォールバック: bodyタグの中身を取得
  const bodyText = $('body').text();
  if (bodyText && bodyText.length > 100) {
    return bodyText.trim();
  }
  
  return '';
}

/**
 * 添付ファイル情報を抽出
 */
function extractAttachments($: cheerio.CheerioAPI, baseHref: string): AttachmentDTO[] {
  const attachments: AttachmentDTO[] = [];
  
  // 添付ファイルリンクを検索
  const attachmentSelectors = [
    'a[href*="attachment"]',
    'a[href*="download"]',
    'a[href*="file"]',
    '.attachment-link',
    '[data-attachment-id]'
  ];
  
  attachmentSelectors.forEach(selector => {
    $(selector).each((i, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      const fileName = $el.text().trim() || $el.attr('data-filename') || '';
      const fileSize = parseInt($el.attr('data-size') || '0');
      
      if (href && fileName) {
        attachments.push({
          id: `${baseHref}-attachment-${i}`,
          name: fileName,
          size: fileSize,
          contentType: guessContentType(fileName),
          downloadUrl: href.startsWith('http') ? href : `${getBaseUrl(baseHref)}${href}`
        });
      }
    });
  });
  
  return attachments;
}

/**
 * 優先度を抽出
 */
function extractPriority($: cheerio.CheerioAPI): 'high' | 'normal' | 'low' | undefined {
  const prioritySelectors = [
    'input[name="priority"]',
    '.priority',
    '[data-priority]'
  ];
  
  for (const selector of prioritySelectors) {
    const value = $(selector).text() || $(selector).val()?.toString() || $(selector).attr('data-priority');
    if (value) {
      const normalized = value.toLowerCase();
      if (normalized.includes('high') || normalized.includes('重要') || normalized.includes('緊急')) {
        return 'high';
      }
      if (normalized.includes('low') || normalized.includes('低')) {
        return 'low';
      }
    }
  }
  
  return 'normal';
}

/**
 * ユーティリティ関数群
 */

function parseEmailList(emailString: string): string[] {
  if (!emailString) return [];
  
  return emailString
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

function generateMessageId(href: string): string {
  const urlHash = Buffer.from(href).toString('base64').substring(0, 16);
  return `webcalib-${urlHash}-${Date.now()}`;
}

function generateThreadId(subject: string): string {
  // 件名から "Re:" や "Fw:" を除去してスレッドIDを生成
  const cleanSubject = subject.replace(/^(Re:|Fw:|Fwd:)\s*/i, '').trim();
  const subjectHash = Buffer.from(cleanSubject).toString('base64').substring(0, 16);
  return `thread-${subjectHash}`;
}

function normalizeDate(dateString: string): string {
  if (!dateString) return new Date().toISOString();
  
  try {
    // 日本語の日付形式に対応
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // フォールバック: 現在時刻を使用
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

function getBaseUrl(href: string): string {
  try {
    const url = new URL(href);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
} 