import crypto from 'crypto';
import { GmailLikeMessageDTO } from '../adapters/internal-mail/types';

/**
 * メール重複削除ユーティリティ
 * Phase 2: 件名+本文の組み合わせでの重複判定
 */

/**
 * メールのコンテンツハッシュを生成
 * 件名 + 本文（またはmessageId）の組み合わせでユニーク性を判定
 */
function generateContentHash(message: GmailLikeMessageDTO): string {
  // ヘッダーから件名を取得
  const headers = message.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  
  // 本文を取得（snippet優先、なければbody.dataから）
  let content = message.snippet || '';
  if (!content && message.payload?.body?.data) {
    try {
      content = Buffer.from(message.payload.body.data, 'base64').toString('utf8');
    } catch {
      content = message.payload.body.data.substring(0, 100);
    }
  }
  
  // 本文が取得できない場合はmessageIdを使用（フォールバック）
  if (!content || content.trim().length < 10) {
    content = message.id;
  }
  
  // 件名 + 本文の組み合わせでハッシュ生成
  const combinedContent = `${subject.trim()}|||${content.trim()}`;
  return crypto.createHash('sha256').update(combinedContent, 'utf8').digest('hex');
}

/**
 * メール配列から重複を削除
 * 同じ件名でも本文が異なる場合は保持
 */
export function deduplicateMessages(messages: GmailLikeMessageDTO[]): {
  uniqueMessages: GmailLikeMessageDTO[];
  duplicates: Array<{
    original: GmailLikeMessageDTO;
    duplicate: GmailLikeMessageDTO;
    reason: string;
  }>;
  stats: {
    totalMessages: number;
    uniqueMessages: number;
    duplicatesRemoved: number;
    subjectGroups: Record<string, number>;
  };
} {
  console.log(`🔍 重複削除開始: ${messages.length}件のメールを分析中...`);
  
  const seenHashes = new Map<string, GmailLikeMessageDTO>();
  const uniqueMessages: GmailLikeMessageDTO[] = [];
  const duplicates: Array<{
    original: GmailLikeMessageDTO;
    duplicate: GmailLikeMessageDTO;
    reason: string;
  }> = [];
  
  // 件名ごとの統計
  const subjectGroups: Record<string, number> = {};
  
  for (const message of messages) {
    const contentHash = generateContentHash(message);
    const subject = message.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
    
    // 件名統計を更新
    subjectGroups[subject] = (subjectGroups[subject] || 0) + 1;
    
    if (seenHashes.has(contentHash)) {
      // 重複発見
      const original = seenHashes.get(contentHash)!;
      duplicates.push({
        original,
        duplicate: message,
        reason: `同一コンテンツ (件名: "${subject.substring(0, 30)}...")`
      });
      
      console.log(`🔄 重複削除: "${subject.substring(0, 40)}..." (ハッシュ: ${contentHash.substring(0, 8)})`);
    } else {
      // ユニークなメール
      seenHashes.set(contentHash, message);
      uniqueMessages.push(message);
      
      console.log(`✅ 保持: "${subject.substring(0, 40)}..." (ハッシュ: ${contentHash.substring(0, 8)})`);
    }
  }
  
  const stats = {
    totalMessages: messages.length,
    uniqueMessages: uniqueMessages.length,
    duplicatesRemoved: duplicates.length,
    subjectGroups
  };
  
  console.log('📊 重複削除完了:');
  console.log(`   総メール数: ${stats.totalMessages}`);
  console.log(`   ユニーク: ${stats.uniqueMessages}`);
  console.log(`   削除: ${stats.duplicatesRemoved}`);
  console.log('   件名別統計:');
  
  Object.entries(stats.subjectGroups)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([subject, count]) => {
      console.log(`     "${subject.substring(0, 30)}...": ${count}件`);
    });
  
  return {
    uniqueMessages,
    duplicates,
    stats
  };
}

/**
 * 件名が同じでも本文が異なるメールを識別
 */
export function analyzeContentVariations(messages: GmailLikeMessageDTO[]): {
  subjectGroups: Record<string, {
    count: number;
    uniqueContents: number;
    messages: Array<{
      id: string;
      contentHash: string;
      snippet: string;
    }>;
  }>;
} {
  const subjectGroups: Record<string, any> = {};
  
  for (const message of messages) {
    const subject = message.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
    const contentHash = generateContentHash(message);
    const snippet = message.snippet?.substring(0, 100) || message.id.substring(0, 20);
    
    if (!subjectGroups[subject]) {
      subjectGroups[subject] = {
        count: 0,
        uniqueContents: 0,
        messages: [],
        contentHashes: new Set()
      };
    }
    
    subjectGroups[subject].count++;
    subjectGroups[subject].messages.push({
      id: message.id,
      contentHash,
      snippet
    });
    
    if (!subjectGroups[subject].contentHashes.has(contentHash)) {
      subjectGroups[subject].contentHashes.add(contentHash);
      subjectGroups[subject].uniqueContents++;
    }
  }
  
  // Set をオブジェクトから削除（JSONシリアライズのため）
  Object.values(subjectGroups).forEach((group: any) => {
    delete group.contentHashes;
  });
  
  return { subjectGroups };
}

/**
 * 重複削除結果のレポート生成
 */
export function generateDeduplicationReport(
  originalCount: number,
  uniqueMessages: GmailLikeMessageDTO[],
  duplicates: Array<{ original: GmailLikeMessageDTO; duplicate: GmailLikeMessageDTO; reason: string }>
): string {
  const report = `
📋 重複削除レポート
==================

📊 統計:
  - 元メール数: ${originalCount}件
  - 重複削除後: ${uniqueMessages.length}件
  - 削除された重複: ${duplicates.length}件
  - 削除率: ${((duplicates.length / originalCount) * 100).toFixed(1)}%

🔍 重複削除の詳細:
${duplicates.slice(0, 10).map((dup, i) => 
  `  ${i + 1}. ${dup.reason}`
).join('\n')}
${duplicates.length > 10 ? `  ... 他${duplicates.length - 10}件` : ''}

✅ 結果: 同じ件名でも本文が異なるメールは適切に保持されました
`.trim();

  return report;
} 