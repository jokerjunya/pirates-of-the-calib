import { chromium, Browser, Page } from 'playwright';
import { InternalMailDTO, ScraperConfig, ScrapeResult } from './types';
import { parseMailDetail } from './parser';

export class WebCalibScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = {
      headless: true,
      timeout: 30000,
      ...config
    };
  }

  /**
   * ブラウザを起動してログイン
   */
  async initialize(): Promise<void> {
    console.log('🚀 Playwright ブラウザを起動中...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless
    });
    
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(this.config.timeout!);
    
    await this.login();
  }

  /**
   * Web-CALIBにログイン
   */
  private async login(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔐 Web-CALIBにログイン中...');
    
    try {
      // ログインページURLを構築
      const fullLoginUrl = this.config.loginUrl.startsWith('http') 
        ? this.config.loginUrl 
        : `${this.config.baseUrl}${this.config.loginUrl}`;
      
      console.log(`🌐 アクセス中: ${fullLoginUrl}`);
      
      // ログインページにアクセス
      await this.page.goto(fullLoginUrl);
      
      // ログイン情報を入力
      await this.page.fill('input[name="accountId"]', this.config.username);
      await this.page.fill('input[name="password"]', this.config.password);
      
      // ログインボタンをクリック
      await this.page.click('input[name="loginButton"]');
      
      // ページ遷移を待機
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ ログイン完了');
      
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      throw error;
    }
  }

  /**
   * メール一覧を取得
   */
  async fetchMailList(): Promise<Array<{subject: string, href: string, date: string}>> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('📬 メール一覧を取得中...');
    
    try {
      // メール一覧ページURLを構築
      const baseListUrl = this.config.listUrl.startsWith('http') 
        ? this.config.listUrl 
        : `${this.config.baseUrl}${this.config.listUrl}`;
        
      const listUrl = this.config.jobseekerNo 
        ? `${baseListUrl}?jobseekerNo=${this.config.jobseekerNo}`
        : baseListUrl;
      
      console.log(`🌐 メール一覧アクセス中: ${listUrl}`);
        
      await this.page.goto(listUrl);
      await this.page.waitForLoadState('networkidle');
      
      // メール一覧テーブルから情報を抽出
      const mailList = await this.page.evaluate(() => {
        const table = document.querySelector('table.list2');
        if (!table) return [];
        
        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // ヘッダー行をスキップ
        
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;
          
          const linkElement = cells[1]?.querySelector('a[href*="message_management33_view"]');
          if (!linkElement) return null;
          
          return {
            subject: linkElement.textContent?.trim() || '',
            href: linkElement.getAttribute('href') || '',
            date: cells[0]?.textContent?.trim() || ''
          };
        }).filter(Boolean);
      });
      
      console.log(`📧 ${mailList.length}件のメールを発見`);
      return mailList as Array<{subject: string, href: string, date: string}>;
      
    } catch (error) {
      console.error('❌ メール一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 個別メールの詳細を取得
   */
  async fetchMailDetail(href: string): Promise<InternalMailDTO | null> {
    if (!this.page) throw new Error('Page not initialized');
    
    try {
      // 完全URLを構築
      const fullUrl = href.startsWith('http') 
        ? href 
        : `${this.config.baseUrl}${href}`;
      
      console.log(`📖 メール詳細を取得中: ${fullUrl}`);
      
      await this.page.goto(fullUrl);
      await this.page.waitForLoadState('networkidle');
      
      // フレームセット構造の場合の処理
      const frames = this.page.frames();
      let contentFrame = frames.find(frame => 
        frame.name() === 'body' || frame.url().includes('body')
      );
      
      // フレームが見つからない場合はメインページを使用
      const targetPage = contentFrame || this.page;
      
      // HTMLコンテンツを取得してパーサーに渡す
      const htmlContent = await targetPage.content();
      
      return parseMailDetail(htmlContent, href);
      
    } catch (error) {
      console.error(`❌ メール詳細取得エラー (${href}):`, error);
      return null;
    }
  }

  /**
   * 全メールをスクレイピング
   */
  async scrapeAllMails(): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      totalMails: 0,
      processedMails: 0,
      errors: [],
      mails: []
    };
    
    try {
      await this.initialize();
      
      const mailList = await this.fetchMailList();
      result.totalMails = mailList.length;
      
      for (const mailItem of mailList) {
        try {
          const mailDetail = await this.fetchMailDetail(mailItem.href);
          if (mailDetail) {
            result.mails.push(mailDetail);
            result.processedMails++;
          }
          
          // レート制限のため少し待機
          await this.page?.waitForTimeout(1000);
          
        } catch (error) {
          const errorMsg = `メール処理エラー (${mailItem.subject}): ${error}`;
          console.error('⚠️', errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      result.success = result.errors.length === 0;
      
      console.log(`🎉 スクレイピング完了: ${result.processedMails}/${result.totalMails}件処理`);
      
    } catch (error) {
      console.error('❌ スクレイピング全体エラー:', error);
      result.errors.push(`全体エラー: ${error}`);
    } finally {
      await this.cleanup();
    }
    
    return result;
  }

  /**
   * ブラウザをクリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('🧹 ブラウザをクリーンアップしました');
    }
  }
}

/**
 * 簡単な使用のためのヘルパー関数
 */
export async function fetchMails(config: ScraperConfig): Promise<InternalMailDTO[]> {
  const scraper = new WebCalibScraper(config);
  const result = await scraper.scrapeAllMails();
  
  if (!result.success) {
    console.warn('⚠️ スクレイピングで一部エラーが発生:', result.errors);
  }
  
  return result.mails;
} 