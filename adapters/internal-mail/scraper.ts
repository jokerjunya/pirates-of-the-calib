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
    console.log('🚀 Playwright ブラウザを起動中（Internet Explorer互換モード）...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless
    });
    
    // Internet ExplorerのUser-Agentを設定
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      // IE互換性のための追加設定
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true
    });
    
    this.page = await context.newPage();
    this.page.setDefaultTimeout(this.config.timeout!);
    
          console.log('🌐 Internet Explorer User-Agent設定完了');
    
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
      let fullLoginUrl: string;
      if (this.config.loginUrl.startsWith('http')) {
        fullLoginUrl = this.config.loginUrl;
      } else {
        // baseURLの末尾のスラッシュとloginURLの先頭のスラッシュを正規化
        const cleanBaseUrl = this.config.baseUrl.replace(/\/+$/, '');
        const cleanLoginUrl = this.config.loginUrl.replace(/^\/+/, '');
        fullLoginUrl = `${cleanBaseUrl}/${cleanLoginUrl}`;
      }
      
      console.log(`🌐 ログインページアクセス中: ${fullLoginUrl}`);
      
      // ログインページにアクセス
      await this.page.goto(fullLoginUrl);
      
      // IE互換性のため複数の待機方法を試行
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch {
        console.log('⚠️ networkidle待機失敗、domcontentloaded で再試行...');
        try {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        } catch {
          console.log('⚠️ domcontentloaded待機も失敗、固定時間待機...');
          await this.page.waitForTimeout(5000);
        }
      }
      
      // デバッグ: ページの状態を確認
      console.log('🔍 ページロード完了、DOM構造を確認中...');
      
      // スクリーンショットを保存
      try {
        await this.page.screenshot({ path: 'debug-login-page.png', fullPage: true });
        console.log('📸 スクリーンショット保存: debug-login-page.png');
      } catch (error) {
        console.log('⚠️ スクリーンショット保存失敗:', error);
      }
      
      // DOM情報を取得してデバッグ
      try {
        const pageTitle = await this.page.title();
        console.log('📄 ページタイトル:', pageTitle);
        
        // 全てのinput要素を探す
        const allInputs = await this.page.$$eval('input', inputs => 
          inputs.map(input => ({
            tag: input.tagName,
            type: input.type,
            name: input.name,
            id: input.id,
            className: input.className,
            placeholder: input.placeholder
          }))
        );
        console.log('🔍 見つかったinput要素:', JSON.stringify(allInputs, null, 2));
        
        // 全てのform要素を探す
        const allForms = await this.page.$$eval('form', forms => 
          forms.map(form => ({
            action: form.action,
            method: form.method,
            name: form.name,
            id: form.id
          }))
        );
        console.log('📝 見つかったform要素:', JSON.stringify(allForms, null, 2));
        
      } catch (error) {
        console.log('⚠️ DOM解析エラー:', error);
      }
      
      // ログイン情報を入力（複数のセレクターを試行）
      console.log('🔍 ユーザー名入力欄を探しています...');
      const usernameSelectors = [
        'input[name="accountId"]',
        'input[name="username"]', 
        'input[name="userId"]',
        'input[name="loginId"]',
        'input[type="text"]',
        'input[type="TEXT"]',  // IE大文字対応
        '#accountId',
        '#username',
        '#userId',
        'input:first-of-type',  // 最初のinput要素
        'form input[type="text"]',
        'form input:first-child',
        '[name="accountId"]',
        '[name="username"]'
      ];
      
      let usernameInputFound = false;
      for (const selector of usernameSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.fill(selector, this.config.username);
          console.log(`✅ ユーザー名入力完了: ${selector}`);
          usernameInputFound = true;
          break;
        } catch {
          console.log(`⚠️ セレクター失敗: ${selector}`);
          continue;
        }
      }
      
      if (!usernameInputFound) {
        throw new Error('ユーザー名入力欄が見つかりませんでした');
      }
      
      console.log('🔍 パスワード入力欄を探しています...');
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[type="PASSWORD"]',  // IE大文字対応
        '#password',
        'form input[type="password"]',
        '[name="password"]'
      ];
      
      let passwordInputFound = false;
      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.fill(selector, this.config.password);
          console.log(`✅ パスワード入力完了: ${selector}`);
          passwordInputFound = true;
          break;
        } catch {
          console.log(`⚠️ セレクター失敗: ${selector}`);
          continue;
        }
      }
      
      if (!passwordInputFound) {
        throw new Error('パスワード入力欄が見つかりませんでした');
      }
      
      // ログインボタンをクリック
      console.log('🔍 ログインボタンを探しています...');
      const loginButtonSelectors = [
        'input[name="loginButton"]',
        'input[type="submit"]',
        'input[type="SUBMIT"]',  // IE大文字対応
        'button[type="submit"]',
        'button:has-text("ログイン")',
        'input[value="ログイン"]',
        'input[value="LOGIN"]',
        'input[value="Login"]',
        '#loginButton',
        '.login-button',
        'form input[type="submit"]',
        'form button',
        '[name="loginButton"]',
        'input:last-of-type'  // 最後のinput要素（ボタンの可能性）
      ];
      
      let loginButtonFound = false;
      for (const selector of loginButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          console.log(`✅ ログインボタンクリック完了: ${selector}`);
          loginButtonFound = true;
          break;
        } catch {
          console.log(`⚠️ セレクター失敗: ${selector}`);
          continue;
        }
      }
      
      if (!loginButtonFound) {
        throw new Error('ログインボタンが見つかりませんでした');
      }
      
      // ページ遷移を待機
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ ログイン完了');
      
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      
      // エラー時でもスクリーンショットを保存
      try {
        if (this.page) {
          await this.page.screenshot({ path: 'debug-login-error.png', fullPage: true });
          console.log('📸 エラー時スクリーンショット保存: debug-login-error.png');
        }
      } catch (screenshotError) {
        console.log('⚠️ エラー時スクリーンショット保存失敗:', screenshotError);
      }
      
      throw error;
    }
  }

  /**
   * e-mail検索を実行してメッセージ管理ページに遷移
   */
  async navigateToMessageManagement(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 e-mail検索を実行中...');
    
    try {
      // 1. e-mail検索ページに遷移
      const searchPageUrl = `${this.config.baseUrl.replace(/\/+$/, '')}/webcalib/app/jobseeker_management_view`;
      console.log(`🌐 e-mail検索ページアクセス中: ${searchPageUrl}`);
      
      await this.page.goto(searchPageUrl);
      await this.page.waitForLoadState('networkidle');
      
      // 2. e-mailアドレスを入力（設定から取得、またはデフォルト）
      const targetEmail = this.config.targetEmail || 'yuya_inagaki+005@r.recruit.co.jp';
      console.log(`📧 検索対象e-mail: ${targetEmail}`);
      
      // e-mail入力欄を探して入力
      const emailInputSelectors = [
        'input[name="email"]',
        'input[name="e-mail"]',
        'input[name="emailAddress"]',
        'input[type="email"]',
        'input[placeholder*="mail"]',
        'input[placeholder*="メール"]'
      ];
      
      let emailInputFound = false;
      for (const selector of emailInputSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.fill(selector, targetEmail);
          emailInputFound = true;
          console.log(`✅ e-mail入力完了: ${selector}`);
          break;
        } catch {
          continue;
        }
      }
      
      if (!emailInputFound) {
        throw new Error('e-mail入力欄が見つかりませんでした');
      }
      
      // 3. 検索ボタンをクリック
      const searchButtonSelectors = [
        'input[name="search"]',
        'input[value="検索"]',
        'button:has-text("検索")',
        'input[type="submit"]',
        '.search-button',
        '#searchButton'
      ];
      
      let searchButtonFound = false;
      for (const selector of searchButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          searchButtonFound = true;
          console.log(`✅ 検索ボタンクリック完了: ${selector}`);
          break;
        } catch {
          continue;
        }
      }
      
      if (!searchButtonFound) {
        throw new Error('検索ボタンが見つかりませんでした');
      }
      
      await this.page.waitForLoadState('networkidle');
      
      // 4. メッセージ管理ボタンをクリック
      console.log('🔘 メッセージ管理ボタンを探しています...');
      
      const messageManagementSelectors = [
        'button:has-text("メッセージ管理")',
        'input[value="メッセージ管理"]',
        'a:has-text("メッセージ管理")',
        'input[name="messageManagement"]',
        '.message-management',
        '#messageManagement'
      ];
      
      let managementButtonFound = false;
      for (const selector of messageManagementSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          await this.page.click(selector);
          managementButtonFound = true;
          console.log(`✅ メッセージ管理ボタンクリック完了: ${selector}`);
          break;
        } catch {
          continue;
        }
      }
      
      if (!managementButtonFound) {
        throw new Error('メッセージ管理ボタンが見つかりませんでした');
      }
      
      await this.page.waitForLoadState('networkidle');
      console.log('🎉 メッセージ管理ページに到達しました');
      
    } catch (error) {
      console.error('❌ メッセージ管理ページへの遷移エラー:', error);
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
      
      // デバッグ: メール一覧ページの構造を詳しく調べる
      console.log('🔍 メール一覧ページの構造を調査中...');
      
      // スクリーンショット保存
      try {
        await this.page.screenshot({ path: 'debug-maillist-page.png', fullPage: true });
        console.log('📸 メール一覧スクリーンショット保存: debug-maillist-page.png');
      } catch (error) {
        console.log('⚠️ スクリーンショット保存失敗:', error);
      }
      
      // ページタイトル確認
      const pageTitle = await this.page.title();
      console.log('📄 メール一覧ページタイトル:', pageTitle);
      
      // テーブル要素を全て探す
      try {
        const allTables = await this.page.$$eval('table', tables => 
          tables.map((table, index) => ({
            index,
            id: table.id,
            className: table.className,
            rowCount: table.querySelectorAll('tr').length,
            cellContent: Array.from(table.querySelectorAll('td')).slice(0, 5).map(td => td.textContent?.trim().substring(0, 50))
          }))
        );
        console.log('📊 見つかったテーブル:', JSON.stringify(allTables, null, 2));
      } catch (error) {
        console.log('⚠️ テーブル解析エラー:', error);
      }
      
      // リンク要素を探す
      try {
        const allLinks = await this.page.$$eval('a', links => 
          links.map(link => ({
            href: link.href,
            text: link.textContent?.trim(),
            className: link.className
          })).filter(link => 
            link.href.includes('message_management') || 
            link.text?.length > 0
          ).slice(0, 10)
        );
        console.log('🔗 見つかったリンク:', JSON.stringify(allLinks, null, 2));
      } catch (error) {
        console.log('⚠️ リンク解析エラー:', error);
      }
      
      // div要素の調査（テーブル以外の可能性）
      try {
        const allDivs = await this.page.$$eval('div', divs => 
          divs.map((div, index) => ({
            index,
            id: div.id,
            className: div.className,
            textContent: div.textContent?.trim().substring(0, 100)
          })).filter(div => 
            div.textContent && div.textContent.length > 10
          ).slice(0, 10)
        );
        console.log('📦 主要なdiv要素:', JSON.stringify(allDivs, null, 2));
      } catch (error) {
        console.log('⚠️ div解析エラー:', error);
      }
      
      // メール一覧テーブルから情報を抽出（複数パターンに対応）
      const mailList = await this.page.evaluate(() => {
        console.log('🔍 JavaScript側でメール一覧を検索中...');
        
        // パターン1: table.list2（元のパターン）
        let table = document.querySelector('table.list2');
        console.log('📊 table.list2の結果:', table ? 'あり' : 'なし');
        
        // パターン2: 他のテーブルクラス
        if (!table) {
          const tableSelectors = ['table.list', 'table', '.list2', '.list'];
          for (const selector of tableSelectors) {
            table = document.querySelector(selector);
            if (table) {
              console.log(`📊 ${selector}で見つかりました`);
              break;
            }
          }
        }
        
        // パターン3: div要素によるリスト
        if (!table) {
          console.log('📊 テーブルが見つからないため、div要素を探します');
          const divContainers = document.querySelectorAll('div');
          for (const div of divContainers) {
            const links = div.querySelectorAll('a[href*="message_management33_view"]');
            if (links.length > 0) {
              console.log('📊 div内にメールリンクを発見');
              const results = Array.from(links).map(link => ({
                subject: link.textContent?.trim() || 'タイトル不明',
                href: link.getAttribute('href') || '',
                date: link.closest('tr')?.querySelector('td')?.textContent?.trim() || 
                      link.parentElement?.textContent?.match(/\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}/)?.[0] || '日付不明'
              }));
              return results;
            }
          }
        }
        
        if (!table) {
          console.log('❌ テーブルまたはメールリストが見つかりませんでした');
          
          // 最後の手段：全てのリンクからメール関連を探す
          const allLinks = document.querySelectorAll('a');
          const mailLinks = Array.from(allLinks).filter(link => 
            link.href.includes('message_management33_view') || 
            link.href.includes('message_management') ||
            link.textContent?.includes('件名') ||
            link.textContent?.includes('メール')
          );
          
          console.log(`🔗 全リンクから${mailLinks.length}件のメール関連リンクを発見`);
          
          if (mailLinks.length > 0) {
            return mailLinks.map(link => ({
              subject: link.textContent?.trim() || 'リンクタイトル不明',
              href: link.getAttribute('href') || '',
              date: 'リンクから日付取得不可'
            }));
          }
          
          return [];
        }
        
        console.log('📊 テーブルが見つかりました、行を解析中...');
        const rows = Array.from(table.querySelectorAll('tr'));
        console.log(`📊 ${rows.length}行見つかりました`);
        
        // ヘッダー行を判定してスキップ
        const dataRows = rows.filter((row, index) => {
          const text = row.textContent?.toLowerCase();
          const isHeader = text?.includes('件名') || text?.includes('日付') || 
                          text?.includes('subject') || text?.includes('date') ||
                          index === 0; // 最初の行もヘッダーとして扱う
          return !isHeader;
        });
        
        console.log(`📊 データ行: ${dataRows.length}行`);
        
        return dataRows.map((row, index) => {
          const cells = row.querySelectorAll('td, th');
          console.log(`📊 行${index}: ${cells.length}セル`);
          
          if (cells.length === 0) return null;
          
          // リンク要素を探す（複数パターン）
          const linkSelectors = [
            'a[href*="message_management33_view"]',
            'a[href*="message_management"]',
            'a[href*="view"]',
            'a'
          ];
          
          let linkElement = null;
          for (const selector of linkSelectors) {
            linkElement = row.querySelector(selector);
            if (linkElement) break;
          }
          
          if (!linkElement) {
            console.log(`📊 行${index}: リンクが見つかりません`);
            return null;
          }
          
          console.log(`📊 行${index}: リンク発見 - ${linkElement.textContent?.trim()}`);
          
          return {
            subject: linkElement.textContent?.trim() || 'タイトル不明',
            href: linkElement.getAttribute('href') || '',
            date: cells[0]?.textContent?.trim() || 
                  Array.from(cells).find(cell => 
                    cell.textContent?.match(/\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}/)
                  )?.textContent?.trim() || '日付不明'
          };
        }).filter(Boolean);
      });
      
      console.log(`📧 ${mailList.length}件のメールを発見`);
      
      // 各メールの情報を詳しくログ出力
      if (mailList.length > 0) {
        console.log('📋 発見されたメール一覧:');
        mailList.forEach((mail, index) => {
          console.log(`  ${index + 1}. 件名: "${mail.subject}" | 日付: "${mail.date}" | URL: "${mail.href}"`);
        });
      } else {
        console.log('⚠️ メールが0件でした。ページ構造を確認してください。');
      }
      
      return mailList as Array<{subject: string, href: string, date: string}>;
      
    } catch (error) {
      console.error('❌ メール一覧取得エラー:', error);
      
      // エラー時でもスクリーンショットを保存
      try {
        if (this.page) {
          await this.page.screenshot({ path: 'debug-maillist-error.png', fullPage: true });
          console.log('📸 メール一覧エラー時スクリーンショット保存: debug-maillist-error.png');
        }
      } catch (screenshotError) {
        console.log('⚠️ エラー時スクリーンショット保存失敗:', screenshotError);
      }
      
      // エラー時でも空配列を返して処理を続行
      console.log('🔄 エラーが発生しましたが、処理を続行します');
      return [];
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
      
      // 新しいフロー: ログイン → e-mail検索 → メッセージ管理 → メール一覧
      await this.navigateToMessageManagement();
      
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