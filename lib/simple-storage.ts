import fs from 'fs';
import path from 'path';
import { GmailLikeThreadDTO, GmailLikeMessageDTO } from '../adapters/internal-mail/types';

// ストレージファイルのパス
const STORAGE_DIR = path.join(process.cwd(), 'data');
const THREADS_FILE = path.join(STORAGE_DIR, 'threads.json');
const MESSAGES_FILE = path.join(STORAGE_DIR, 'messages.json');

// 型定義
interface StoredThread extends GmailLikeThreadDTO {
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage extends GmailLikeMessageDTO {
  createdAt: string;
  updatedAt: string;
}

/**
 * ストレージディレクトリの初期化
 */
function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('📁 ストレージディレクトリを作成しました:', STORAGE_DIR);
  }
}

/**
 * スレッドデータの保存
 */
export async function saveThread(thread: GmailLikeThreadDTO): Promise<void> {
  try {
    ensureStorageDir();
    
    const storedThread: StoredThread = {
      ...thread,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 既存データの読み込み
    let threads: StoredThread[] = [];
    if (fs.existsSync(THREADS_FILE)) {
      const data = fs.readFileSync(THREADS_FILE, 'utf8');
      threads = JSON.parse(data);
    }

    // 重複チェック（スレッドIDベース）
    const existingIndex = threads.findIndex(t => t.id === thread.id);
    if (existingIndex >= 0) {
      threads[existingIndex] = { ...storedThread, createdAt: threads[existingIndex].createdAt };
      console.log(`🔄 スレッド更新: ${thread.subject}`);
    } else {
      threads.push(storedThread);
      console.log(`💾 スレッド保存: ${thread.subject} (${thread.messages.length} messages)`);
    }

    // ファイルに保存
    fs.writeFileSync(THREADS_FILE, JSON.stringify(threads, null, 2));

    // メッセージも保存
    for (const message of thread.messages) {
      await saveMessage(message);
    }

  } catch (error) {
    console.error('❌ スレッド保存エラー:', error);
    throw new Error(`スレッド保存に失敗しました: ${error}`);
  }
}

/**
 * メッセージデータの保存
 */
export async function saveMessage(message: GmailLikeMessageDTO): Promise<void> {
  try {
    ensureStorageDir();
    
    const storedMessage: StoredMessage = {
      ...message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 既存データの読み込み
    let messages: StoredMessage[] = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
      messages = JSON.parse(data);
    }

    // 重複チェック（メッセージIDベース）
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = { ...storedMessage, createdAt: messages[existingIndex].createdAt };
      console.log(`🔄 メッセージ更新: ${message.id}`);
    } else {
      messages.push(storedMessage);
      console.log(`💾 メッセージ保存: ${message.id} in thread ${message.threadId}`);
    }

    // ファイルに保存
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));

  } catch (error) {
    console.error('❌ メッセージ保存エラー:', error);
    throw new Error(`メッセージ保存に失敗しました: ${error}`);
  }
}

/**
 * 全スレッドの取得
 */
export async function getAllThreads(): Promise<StoredThread[]> {
  try {
    if (!fs.existsSync(THREADS_FILE)) {
      return [];
    }

    const data = fs.readFileSync(THREADS_FILE, 'utf8');
    const threads: StoredThread[] = JSON.parse(data);
    
    // 作成日時でソート（新しい順）
    return threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  } catch (error) {
    console.error('❌ スレッド取得エラー:', error);
    return [];
  }
}

/**
 * 全メッセージの取得
 */
export async function getAllMessages(): Promise<StoredMessage[]> {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) {
      return [];
    }

    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const messages: StoredMessage[] = JSON.parse(data);
    
    // 作成日時でソート（新しい順）
    return messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  } catch (error) {
    console.error('❌ メッセージ取得エラー:', error);
    return [];
  }
}

/**
 * メッセージ検索（件名、送信者、本文による検索）
 */
export async function searchMessages(query: string): Promise<StoredMessage[]> {
  try {
    const allMessages = await getAllMessages();
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      return allMessages;
    }

    return allMessages.filter(message => {
      // 件名での検索
      const subject = message.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      if (subject.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // 送信者での検索
      const from = message.payload?.headers?.find(h => h.name === 'From')?.value || '';
      if (from.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // 本文での検索（プレーンテキストのみ）
      const body = message.payload?.body?.data || '';
      if (body.toLowerCase().includes(searchTerm)) {
        return true;
      }

      return false;
    });

  } catch (error) {
    console.error('❌ メッセージ検索エラー:', error);
    return [];
  }
}

/**
 * ストレージ統計情報の取得
 */
export async function getStorageStats(): Promise<{
  threadCount: number;
  messageCount: number;
  lastSyncAt: string;
  storageSize: string;
}> {
  try {
    const threads = await getAllThreads();
    const messages = await getAllMessages();
    
    // ファイルサイズ計算
    let totalSize = 0;
    if (fs.existsSync(THREADS_FILE)) {
      totalSize += fs.statSync(THREADS_FILE).size;
    }
    if (fs.existsSync(MESSAGES_FILE)) {
      totalSize += fs.statSync(MESSAGES_FILE).size;
    }

    // 最新の同期時刻
    const lastSyncAt = messages.length > 0 
      ? messages[0].createdAt 
      : new Date().toISOString();

    return {
      threadCount: threads.length,
      messageCount: messages.length,
      lastSyncAt,
      storageSize: `${(totalSize / 1024).toFixed(1)} KB`
    };

  } catch (error) {
    console.error('❌ 統計情報取得エラー:', error);
    return {
      threadCount: 0,
      messageCount: 0,
      lastSyncAt: new Date().toISOString(),
      storageSize: '0 KB'
    };
  }
}

/**
 * 既存スレッドの確認
 */
export async function checkExistingThread(threadId: string): Promise<boolean> {
  try {
    const threads = await getAllThreads();
    return threads.some(thread => thread.id === threadId);
  } catch (error) {
    console.error('❌ スレッド存在確認エラー:', error);
    return false;
  }
}

/**
 * 既存メッセージの確認
 */
export async function checkExistingMessage(messageId: string): Promise<boolean> {
  try {
    const messages = await getAllMessages();
    return messages.some(message => message.id === messageId);
  } catch (error) {
    console.error('❌ メッセージ存在確認エラー:', error);
    return false;
  }
} 