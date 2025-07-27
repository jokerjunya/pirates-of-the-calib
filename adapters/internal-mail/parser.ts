import * as cheerio from 'cheerio';
import { InternalMailDTO, AttachmentDTO } from './types';

/**
 * Web-CALIBの詳細ページHTMLをパースしてInternalMailDTOに変換
 * Phase 1.5: Web-CALIB実際の構造に対応した解析ロジック
 */
export function parseMailDetail(htmlContent: string, href: string, listSubject?: string): InternalMailDTO | null {
  try {
    const $ = cheerio.load(htmlContent);
    
    // メールIDを生成（hrefから抽出またはランダム生成）
    const urlParams = new URLSearchParams(href.split('?')[1] || '');
    const messageId = urlParams.get('messageId') || 
                      urlParams.get('messageNo') || 
                      urlParams.get('id') || 
                      generateMessageId(href);
    
    // Web-CALIB構造に対応した情報抽出（複数のパターンを試行）
    const subject = extractSubject($, listSubject) || '';
    const from = extractFrom($) || '';
    const to = parseEmailList(extractTo($) || '');
    const cc = parseEmailList(extractCc($) || '');
    const date = extractDate($) || '';
    
    // メール本文を抽出（Web-CALIB専用ロジック）
    const body = extractWebCalibMailBody($);
    
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
    console.log(`📧 From: ${from}, To: ${to.join(',')}, Body: ${body.substring(0, 100)}...`);
    
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
 * Web-CALIB: 件名抽出（複数パターン対応）
 */
function extractSubject($: cheerio.CheerioAPI, listSubject?: string): string {
  // 1. リストから渡された件名を優先使用
  if (listSubject && listSubject.trim()) {
    return listSubject.trim();
  }
  
  // 2. 標準的なパターンを試行
  const patterns = [
    // Hidden input
    'input[name="subject"]',
    'input[name="mailSubject"]',
    'input[name="title"]',
    // Table cell patterns
    'td:contains("件名") + td',
    'td:contains("Subject") + td',
    'th:contains("件名") + td',
    'th:contains("Subject") + td',
    // Span/div patterns
    '.subject',
    '.mail-subject',
    '#subject',
    // Text content patterns
    'td:contains("件名：") ~ td',
    'span:contains("件名：") ~ span'
  ];
  
  for (const pattern of patterns) {
    const element = $(pattern).first();
    let value = element.val()?.toString() || element.text()?.trim();
    if (value && value.length > 0 && !value.includes('件名') && !value.includes('Subject')) {
      return value;
    }
  }
  
  // 3. Page title from title tag
  const title = $('title').text().trim();
  if (title && title !== 'メッセージ詳細' && title !== 'エラー') {
    return title;
  }
  
  return '';
}

/**
 * Web-CALIB: 送信者抽出
 * Phase 2: Web-CALIB詳細ページ専用の抽出ロジック
 */
function extractFrom($: cheerio.CheerioAPI): string {
  // Phase 2: Web-CALIB詳細ページ特有のパターンを優先
  const webCalibPatterns = [
    // Web-CALIBフォーム内の送信者フィールド
    'input[name*="from"], input[name*="sender"], input[name*="sendUser"]',
    // テーブル形式での送信者表示
    'th:contains("送信者") + td, td:contains("送信者：") + td',
    'th:contains("From") + td, td:contains("From：") + td', 
    // 詳細表示エリア内の送信者情報
    'table tr:has(th:contains("送信者")) td:nth-child(2)',
    'table tr:has(td:contains("送信者")) td:nth-child(2)',
    // Web-CALIBシステム特有のクラス・ID
    '.sender-info, #senderInfo, .mail-from',
    // フレーム内の送信者表示
    'frameset frame[name*="detail"] table td:contains("@")',
  ];
  
  // Web-CALIB専用パターンでの検索
  for (const pattern of webCalibPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      if (value) {
        // Web-CALIBの実際の送信者パターンを検出
        // 例: "リクルートエージェント <19703@r-agent.com>"
        if (value.includes('@') && 
            (value.includes('recruit') || value.includes('r-agent') || value.includes('リクルート'))) {
          // システム表示ではない実際の送信者を優先
          if (!value.includes('Web-CALIB System') && 
              !value.includes('system@rt-calib') &&
              !value.includes('送信者') && 
              !value.includes('From') &&
              value.length > 5) {
            console.log(`🎯 Web-CALIB送信者検出: "${value}"`);
            return value;
          }
        }
      }
    }
  }
  
  // 追加検索: テキスト全体から送信者らしきパターンを抽出
  const bodyText = $('body').text();
  const senderPatterns = [
    // "送信者：リクルートエージェント <email@domain>" パターン
    /送信者[：:]\s*([^<>\n]+<[^<>\s]+@[^<>\s]+>)/g,
    // "From: Name <email@domain>" パターン  
    /From[：:]\s*([^<>\n]+<[^<>\s]+@[^<>\s]+>)/g,
    // "リクルートエージェント <email@domain>" 単体パターン
    /(リクルート[^<\n]*<[^<>\s]+@r-agent\.com>)/g,
    // エージェント系のメールアドレスパターン
    /([^<\n]*<[^<>\s]*@r-agent\.com>)/g,
  ];
  
  for (const regex of senderPatterns) {
    const matches = bodyText.match(regex);
    if (matches && matches.length > 0) {
      const match = matches[0].replace(/^(送信者|From)[：:]\s*/, '').trim();
      if (match && match.length > 5) {
        console.log(`🎯 パターンマッチ送信者検出: "${match}"`);
        return match;
      }
    }
  }
  
  // 最終フォールバック: 従来のパターン検索
  const fallbackPatterns = [
    'input[type="hidden"]',
    'table td',
    'div'
  ];
  
  for (const pattern of fallbackPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      // 従来のメールアドレスパターンを検索
      if (value && (value.includes('@') || value.includes('recruit') || value.includes('rt-calib'))) {
        // 不要な文字列を除去
        if (!value.includes('送信者') && !value.includes('From') && 
            !value.includes('ログアウト') && value.length > 5) {
          return value;
        }
      }
    }
  }
  
  // 最終フォールバック: デフォルト送信者を設定
  return 'Web-CALIB System <system@rt-calib.r-agent.com>';
}

/**
 * Web-CALIB: 宛先抽出
 * Phase 2: Web-CALIB詳細ページ専用の抽出ロジック
 */
function extractTo($: cheerio.CheerioAPI): string {
  // Phase 2: Web-CALIB特有のパターンを優先
  const webCalibPatterns = [
    // Web-CALIBフォーム内の宛先フィールド
    'input[name*="to"], input[name*="recipient"], input[name*="mailTo"]',
    // テーブル形式での宛先表示
    'th:contains("宛先") + td, td:contains("宛先：") + td',
    'th:contains("To") + td, td:contains("To：") + td',
    'th:contains("受信者") + td, td:contains("受信者：") + td',
    // 詳細表示エリア内の宛先情報
    'table tr:has(th:contains("宛先")) td:nth-child(2)',
    'table tr:has(td:contains("宛先")) td:nth-child(2)',
    'table tr:has(th:contains("受信者")) td:nth-child(2)',
    // Web-CALIBシステム特有のクラス・ID
    '.recipient-info, #recipientInfo, .mail-to',
  ];
  
  // Web-CALIB専用パターンでの検索
  for (const pattern of webCalibPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      if (value) {
        // Web-CALIBの実際の受信者パターンを検出
        // 例: "yuya_inagaki+005@r.recruit.co.jp"
        if (value.includes('@') && 
            (value.includes('recruit.co.jp') || value.includes('r.recruit.co.jp'))) {
          // 不要な文字列を除去
          if (!value.includes('宛先') && !value.includes('To') && !value.includes('受信者') &&
              value.length > 5) {
            console.log(`🎯 Web-CALIB受信者検出: "${value}"`);
            return value;
          }
        }
      }
    }
  }
  
  // 追加検索: テキスト全体から受信者らしきパターンを抽出
  const bodyText = $('body').text();
  const recipientPatterns = [
    // "宛先：email@domain" パターン
    /宛先[：:]\s*([^<\s\n]+@[^<\s\n]+)/g,
    // "To: email@domain" パターン  
    /To[：:]\s*([^<\s\n]+@[^<\s\n]+)/g,
    // "受信者：email@domain" パターン
    /受信者[：:]\s*([^<\s\n]+@[^<\s\n]+)/g,
    // recruit.co.jp系のメールアドレスパターン
    /([^<\s\n]+@r\.recruit\.co\.jp)/g,
    /([^<\s\n]+@recruit\.co\.jp)/g,
  ];
  
  for (const regex of recipientPatterns) {
    const matches = bodyText.match(regex);
    if (matches && matches.length > 0) {
      const match = matches[0].replace(/^(宛先|To|受信者)[：:]\s*/, '').trim();
      if (match && match.includes('@') && match.length > 5) {
        console.log(`🎯 パターンマッチ受信者検出: "${match}"`);
        return match;
      }
    }
  }
  
  // 最終フォールバック: 従来のパターン検索
  const fallbackPatterns = [
    'input[type="hidden"]',
    'table td',
    'div'
  ];
  
  for (const pattern of fallbackPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      if (value && value.includes('@') && value.length > 5) {
        if (!value.includes('宛先') && !value.includes('To') && !value.includes('受信者')) {
          return value;
        }
      }
    }
  }
  
  return '';
}

/**
 * Web-CALIB: CC抽出
 */
function extractCc($: cheerio.CheerioAPI): string {
  const patterns = [
    'input[name="cc"]',
    'input[name="ccEmail"]',
    'td:contains("CC") + td',
    'td:contains("Cc") + td',
    'th:contains("CC") + td',
    'th:contains("Cc") + td',
    '.cc',
    '#cc'
  ];
  
  for (const pattern of patterns) {
    const element = $(pattern).first();
    let value = element.val()?.toString() || element.text()?.trim();
    if (value && value.length > 0 && !value.includes('CC') && !value.includes('Cc')) {
      return value;
    }
  }
  
  return '';
}

/**
 * Web-CALIB: 日付抽出
 * Phase 2: Web-CALIB詳細ページ専用の抽出ロジック
 */
function extractDate($: cheerio.CheerioAPI): string {
  // Phase 2: Web-CALIB特有のパターンを優先
  const webCalibPatterns = [
    // Web-CALIBフォーム内の日付フィールド
    'input[name*="date"], input[name*="sendDate"], input[name*="mailDate"]',
    // テーブル形式での日付表示
    'th:contains("日付") + td, td:contains("日付：") + td',
    'th:contains("送信日") + td, td:contains("送信日：") + td',
    'th:contains("Date") + td, td:contains("Date：") + td',
    'th:contains("作成日時") + td, td:contains("作成日時：") + td',
    'th:contains("処理日時") + td, td:contains("処理日時：") + td',
    // 詳細表示エリア内の日付情報
    'table tr:has(th:contains("日付")) td:nth-child(2)',
    'table tr:has(td:contains("日付")) td:nth-child(2)',
    'table tr:has(th:contains("送信日")) td:nth-child(2)',
    // Web-CALIBシステム特有のクラス・ID
    '.date-info, #dateInfo, .mail-date',
  ];
  
  // Web-CALIB専用パターンでの検索
  for (const pattern of webCalibPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      if (value) {
        // Web-CALIBの日付パターンを検出
        // 例: "24/12/25 08:07:17" または "2024-12-25 08:07:17"
        if (isValidDateFormat(value)) {
          if (!value.includes('日付') && !value.includes('Date') && !value.includes('送信日')) {
            console.log(`🎯 Web-CALIB日付検出: "${value}"`);
            return value;
          }
        }
      }
    }
  }
  
  // 追加検索: テキスト全体から日付らしきパターンを抽出
  const bodyText = $('body').text();
  const datePatterns = [
    // "日付：24/12/25 08:07:17" パターン
    /日付[：:]\s*(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/g,
    // "送信日：24/12/25 08:07:17" パターン  
    /送信日[：:]\s*(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/g,
    // "作成日時：24/12/25 08:07:17" パターン
    /作成日時[：:]\s*(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/g,
    // 単独の日時パターン "24/12/25 08:07:17"
    /(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/g,
    // ISO形式 "2024-12-25 08:07:17"
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g,
  ];
  
  for (const regex of datePatterns) {
    const matches = bodyText.match(regex);
    if (matches && matches.length > 0) {
      const match = matches[0].replace(/^(日付|送信日|作成日時|Date)[：:]\s*/, '').trim();
      if (match && isValidDateFormat(match)) {
        console.log(`🎯 パターンマッチ日付検出: "${match}"`);
        return match;
      }
    }
  }
  
  // 最終フォールバック: 従来のパターン検索
  const fallbackPatterns = [
    'input[type="hidden"]',
    'table td',
    'div'
  ];
  
  for (const pattern of fallbackPatterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      
      if (value && isValidDateFormat(value)) {
        if (!value.includes('日付') && !value.includes('Date') && !value.includes('送信日')) {
          return value;
        }
      }
    }
  }
  
  return '';
}

/**
 * 日付形式の妥当性チェック
 */
function isValidDateFormat(value: string): boolean {
  if (!value || value.length < 8) return false;
  
  // Web-CALIB でよく使われる日付パターン
  const datePatterns = [
    /^\d{2}\/\d{2}\/\d{2}/, // 24/12/25
    /^\d{4}\/\d{2}\/\d{2}/, // 2024/12/25
    /^\d{2}-\d{2}-\d{2}/, // 24-12-25
    /^\d{4}-\d{2}-\d{2}/, // 2024-12-25
    /^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/, // 24/12/25 08:07
    /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/, // 2024/12/25 08:07
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/, // 2024-12-25 08:07
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO format
  ];
  
  return datePatterns.some(pattern => pattern.test(value.trim()));
}

/**
 * Web-CALIB: メール本文抽出（専用ロジック）
 * Phase 1.5: より積極的な本文抽出アプローチ
 */
function extractWebCalibMailBody($: cheerio.CheerioAPI): string {
  const patterns = [
    // Textarea patterns
    'textarea[name="body"]',
    'textarea[name="content"]',
    'textarea[name="message"]',
    'textarea[name="mailBody"]',
    'textarea',
    // Div patterns  
    '.mail-body',
    '.message-body',
    '.content',
    '#mailBody',
    '#content',
    // Table patterns
    'td:contains("本文") + td',
    'td:contains("内容") + td',
    'th:contains("本文") + td',
    'th:contains("内容") + td',
    // Pre/code patterns
    'pre',
    'code.mail-content',
    // 広範囲パターン
    'table td',
    'div',
    'p'
  ];
  
  for (const pattern of patterns) {
    const elements = $(pattern);
    for (let i = 0; i < elements.length; i++) {
      const element = $(elements[i]);
      let value = element.val()?.toString() || element.text()?.trim();
      if (value && value.length > 20 && 
          !value.includes('本文') && !value.includes('内容') &&
          !value.includes('メッセージ管理') && !value.includes('ログアウト')) {
        // メール本文らしいパターンをチェック
        if (value.includes('面談') || value.includes('応募') || 
            value.includes('求人') || value.includes('CS') ||
            value.includes('希望') || value.includes('回答') ||
            value.length > 50) {
          return value;
        }
      }
    }
  }
  
  // 積極的フォールバック: 全テキストから意味のある部分を抽出
  const allText = $('body').text().replace(/\s+/g, ' ').trim();
  if (allText && allText.length > 100) {
    // キーワードベースで本文らしい部分を特定
    const keywords = ['面談', '応募', '求人', 'PDT', 'CS', '希望', '回答', 'リクルート'];
    let bestMatch = '';
    let bestScore = 0;
    
    // 文を分割して分析
    const sentences = allText.split(/[。．！？\n]/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      let score = 0;
      for (const keyword of keywords) {
        if (sentence.includes(keyword)) {
          score += keyword.length;
        }
      }
      
      if (score > bestScore && sentence.length > 20) {
        bestScore = score;
        bestMatch = sentence.trim();
      }
    }
    
    if (bestMatch) {
      return bestMatch.substring(0, 500); // 最大500文字
    }
    
    // 最終フォールバック: ナビゲーション要素を除去した全体テキスト
    const cleanedText = allText
      .replace(/メッセージ管理|ログアウト|戻る|次へ|前へ|Copyright|All Rights Reserved/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanedText.length > 50) {
      return cleanedText.substring(0, 800); // 最大800文字
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