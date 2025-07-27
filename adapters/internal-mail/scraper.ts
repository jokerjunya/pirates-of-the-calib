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
        'input[value="メッセージ管理"]',  // 最も可能性が高い
        'button:has-text("メッセージ管理")',
        'a:has-text("メッセージ管理")',
        'input[name="messageManagement"]',
        'input[onclick*="message"]',      // onclick属性にmessageが含まれる
        'input[onclick*="Message"]',      // 大文字小文字対応
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
      
      // デバッグ: メッセージ管理ページ到達後の状態確認
      console.log('📍 メッセージ管理後のURL:', this.page.url());
      console.log('📄 メッセージ管理後のページタイトル:', await this.page.title());
      
      // 実際にメッセージ管理ページに到達しているかチェック
      try {
        const hasMessageContent = await this.page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          const hasCS = bodyText.includes('CS通達');
          const hasMessage = bodyText.includes('メッセージ');
          const hasMail = bodyText.includes('面接');
          return { hasCS, hasMessage, hasMail, bodyPreview: bodyText.substring(0, 200) };
        });
        
        console.log('📄 ページ内容確認:');
        console.log(`   - CS通達含む: ${hasMessageContent.hasCS}`);
        console.log(`   - メッセージ含む: ${hasMessageContent.hasMessage}`);
        console.log(`   - 面接含む: ${hasMessageContent.hasMail}`);
        console.log(`   - 内容プレビュー: "${hasMessageContent.bodyPreview}..."`);
        
        if (!hasMessageContent.hasCS && !hasMessageContent.hasMail) {
          console.log('⚠️ メール内容が見つからない - 別のページに到達している可能性');
        }
      } catch (error) {
        console.log('⚠️ ページ内容確認エラー:', error);
      }
      
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
      // navigateToMessageManagement()の後、既にメール一覧ページにいるはず
      console.log('📍 現在のページでメール一覧を取得中...');
      console.log('🌐 現在のURL:', this.page.url());
      
      // ページが完全に読み込まれるまで少し待機
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
      
      // エラーページチェック
      if (pageTitle === 'エラー' || this.page.url().includes('error')) {
        console.log('❌ エラーページにいます！');
        
        // エラーメッセージを取得
        try {
          const errorMessage = await this.page.$eval('body', body => body.textContent);
          console.log('❌ エラーメッセージ:', errorMessage?.substring(0, 200));
        } catch {
          console.log('❌ エラーメッセージの取得に失敗');
        }
        
        console.log('💡 メッセージ管理ボタンクリック後、正しいページに到達していない可能性があります');
        console.log('💡 再度メッセージ管理の流れを確認してください');
      }
      
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
        
        // まず、現在のページ内の全てのテーブルを詳しく調査
        const allTables = document.querySelectorAll('table');
        console.log(`📊 ページ内の全テーブル数: ${allTables.length}`);
        
        // 各テーブルを詳しく調査してメール一覧テーブルを特定
        let table = null;
        let tableFound = false;
        
        for (let i = 0; i < allTables.length; i++) {
          const currentTable = allTables[i];
          const rows = currentTable.querySelectorAll('tr');
          const firstRowText = rows[0]?.textContent?.trim() || '';
          const hasMailLinks = currentTable.querySelectorAll('a[href*="CS通達"], a[href*="message"], a[href*="メール"]').length > 0;
          
          console.log(`📊 テーブル${i}: ${currentTable.className || '(クラス名なし)'}`);
          console.log(`    - 行数: ${rows.length}`);
          console.log(`    - 最初の行: "${firstRowText.substring(0, 50)}..."`);
          console.log(`    - メール系リンク数: ${hasMailLinks}`);
          
          // メール一覧テーブルの特徴：
          // 1. 複数の行がある
          // 2. CS通達、面接、メールなどのキーワードを含むリンクがある
          // 3. 求職者管理テーブルではない
          if (rows.length > 5 && hasMailLinks && !firstRowText.includes('イナガキ') && !firstRowText.includes('稲垣')) {
            console.log(`🎯 メール一覧テーブル発見: テーブル${i}`);
            table = currentTable;
            tableFound = true;
            break;
          }
        }
        
        if (!tableFound) {
          console.log('⚠️ 明確なメール一覧テーブルが見つからないため、全テーブルからメール系リンクを探索');
          
          // すべてのテーブルからメール系リンクを収集
          const allMailLinks = [];
          allTables.forEach((tbl, index) => {
            const mailLinks = tbl.querySelectorAll('a');
            mailLinks.forEach(link => {
              const href = link.getAttribute('href') || '';
              const text = link.textContent?.trim() || '';
              if ((href.includes('CS通達') || href.includes('message') || href.includes('面接') || 
                   text.includes('CS通達') || text.includes('面接') || text.includes('決算')) &&
                  !text.includes('稲垣') && !text.includes('イナガキ')) {
                console.log(`🔗 メール系リンク発見 (テーブル${index}): "${text}" → ${href}`);
                allMailLinks.push({
                  subject: text,
                  href: href,
                  date: link.closest('tr')?.querySelector('td')?.textContent?.trim() || '不明'
                });
              }
            });
          });
          
          if (allMailLinks.length > 0) {
            console.log(`📧 全テーブル探索で${allMailLinks.length}件のメールリンクを発見`);
            return allMailLinks;
          }
        }
        
        // メール一覧テーブルが特定できなかった場合の処理
        if (!tableFound) {
          console.log('❌ メール一覧テーブルが特定できませんでした');
          return [];
        }
        
        console.log('📊 テーブルが見つかりました、行を解析中...');
        const rows = Array.from(table.querySelectorAll('tr'));
        console.log(`📊 ${rows.length}行見つかりました`);
        
        // ヘッダー行を判定してスキップ（強化版）
        const dataRows = rows.filter((row, index) => {
          const text = row.textContent?.toLowerCase();
          const rowHTML = row.innerHTML?.toLowerCase();
          
          // 明確なヘッダー行判定
          const isHeader = text?.includes('件名') || text?.includes('日付') || 
                          text?.includes('subject') || text?.includes('date') ||
                          text?.includes('カナ氏名') || text?.includes('氏名') ||
                          text?.includes('▼') || text?.includes('▲') ||           // ソートボタン
                          text?.includes('所属') || text?.includes('担当') ||
                          rowHTML?.includes('href="#"') ||                         // 無効なリンク
                          index === 0; // 最初の行もヘッダーとして扱う
          
          if (isHeader) {
            console.log(`📊 ヘッダー行をスキップ: "${text?.substring(0, 50)}..."`);
          }
          
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
          let usedSelector = null;
          for (const selector of linkSelectors) {
            linkElement = row.querySelector(selector);
            if (linkElement) {
              usedSelector = selector;
              break;
            }
          }
          
          if (!linkElement) {
            console.log(`📊 行${index}: リンクが見つかりません`);
            return null;
          }
          
          const linkText = linkElement.textContent?.trim() || 'タイトル不明';
          const linkHref = linkElement.getAttribute('href') || '';
          
          // 無効なリンクを除外
          if (linkHref === '#' || linkHref === '' || 
              linkText === '▼' || linkText === '▲' ||
              linkText.includes('▼') || linkText.includes('▲')) {
            console.log(`📊 行${index}: 無効なリンクをスキップ - "${linkText}" (${linkHref})`);
            return null;
          }
          
          // メール関連のリンクかチェック
          const isMailLink = linkHref.includes('message_management') || 
                            linkHref.includes('mail') || 
                            linkHref.includes('メール') ||
                            (linkText.length > 3 && !linkText.includes('カナ') && !linkText.includes('氏名'));
          
          if (!isMailLink) {
            console.log(`📊 行${index}: メール以外のリンクをスキップ - "${linkText}"`);
            return null;
          }
          
          console.log(`📊 行${index}: ✅ 有効なメールリンク発見 - "${linkText}" (${usedSelector})`);
          console.log(`📊 行${index}: URL - ${linkHref}`);
          
          // 日付抽出の改善
          let dateText = '日付不明';
          
          // 最初のセルが日付の可能性
          if (cells[0]?.textContent?.trim()) {
            dateText = cells[0].textContent.trim();
          } else {
            // 日付パターンを探す
            const dateCell = Array.from(cells).find(cell => 
              cell.textContent?.match(/\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}/)
            );
            if (dateCell) {
              dateText = dateCell.textContent.trim();
            }
          }
          
          return {
            subject: linkText,
            href: linkHref,
            date: dateText
          };
        }).filter(Boolean);
      });
      
      console.log(`📧 ${mailList.length}件のメールを発見`);
      
      // 各メールの情報を詳しくログ出力
      if (mailList.length > 0) {
        console.log('📋 ✅ 有効なメール一覧:');
        mailList.forEach((mail, index) => {
          console.log(`  ${index + 1}. 件名: "${mail.subject}" | 日付: "${mail.date}" | URL: "${mail.href}"`);
        });
        console.log(`🎉 合計 ${mailList.length}件の有効なメールを発見しました！`);
      } else {
        console.log('⚠️ 有効なメールが0件でした。ページ構造を確認してください。');
        console.log('💡 メッセージ管理ボタンクリック後、正しいメール一覧ページに到達していない可能性があります。');
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