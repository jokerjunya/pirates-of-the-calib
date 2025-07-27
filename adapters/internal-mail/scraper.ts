import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { InternalMailDTO, ScraperConfig, ScrapeResult } from './types';
import { parseMailDetail } from './parser';

export class WebCalibScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
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
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      // IE互換性のための追加設定
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true
    });
    
    this.page = await this.context.newPage();
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
      
      // 🔍 jobseekerNoを正しく取得
      try {
        const jobseekerNoFromPage = await this.page.evaluate(() => {
          // URLパラメータから取得
          const urlParams = new URLSearchParams(window.location.search);
          const fromUrl = urlParams.get('jobseekerNo');
          if (fromUrl) return fromUrl;
          
          // ページ内のテキストから取得（J025870形式）
          const pageText = document.body.innerText;
          const match = pageText.match(/J\d{6}/);
          if (match) return match[0];
          
          // フォーム要素から取得
          const inputs = document.querySelectorAll('input[name*="jobseeker"], input[value*="J0"]');
          for (const input of inputs) {
            const value = (input as HTMLInputElement).value;
            if (value && value.match(/J\d{6}/)) return value;
          }
          
          // リンクのhrefから取得
          const links = document.querySelectorAll('a[href*="jobseekerNo="]');
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href;
            const match = href.match(/jobseekerNo=([^&]+)/);
            if (match) return match[1];
          }
          
          return null;
        });
        
        if (jobseekerNoFromPage) {
          console.log(`🎯 jobseekerNo取得成功: ${jobseekerNoFromPage}`);
          // configを更新
          this.config.jobseekerNo = jobseekerNoFromPage;
        } else {
          console.log('⚠️ jobseekerNoが取得できませんでした - ページから手動で確認が必要');
          // ページの詳細情報を出力してデバッグ
          const pageInfo = await this.page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            bodyText: document.body.innerText.substring(0, 500)
          }));
          console.log('📄 デバッグ情報:', pageInfo);
        }
      } catch (error) {
        console.log('⚠️ jobseekerNo取得エラー:', error);
      }
      
      // 4. メッセージ管理ボタンを探して詳細調査
      console.log('🔘 メッセージ管理ボタンを探しています...');
      
      // まず、ページ上の全ボタン・リンクを調査
      try {
        const allButtons = await this.page.$$eval('input, button, a', elements =>
          elements.map(el => ({
            tag: el.tagName,
            type: el.type || '',
            value: el.value || '',
            text: el.textContent?.trim() || '',
            onclick: el.onclick?.toString() || '',
            href: el.href || '',
            className: el.className || ''
          })).filter(el => 
            el.text.includes('メッセージ') || 
            el.value.includes('メッセージ') ||
            el.onclick.includes('message') ||
            el.href.includes('message')
          )
        );
        
        console.log('📋 メッセージ関連のボタン・リンク一覧:');
        allButtons.forEach((btn, i) => {
          console.log(`  ${i + 1}. ${btn.tag} - text:"${btn.text}" value:"${btn.value}" onclick:"${btn.onclick.substring(0, 100)}"`);
        });
        
        if (allButtons.length === 0) {
          console.log('⚠️ メッセージ関連のボタンが見つかりません！');
          console.log('💡 メッセージ管理機能は別の方法でアクセスする必要がある可能性があります');
        }
      } catch (error) {
        console.log('⚠️ ボタン調査エラー:', error);
      }
      
      const messageManagementSelectors = [
        'input[value="メッセージ管理"]',  // 最も可能性が高い
        'button:has-text("メッセージ管理")',
        'a:has-text("メッセージ管理")',
        'input[name="messageManagement"]',
        'input[onclick*="message"]',      // onclick属性にmessageが含まれる
        'input[onclick*="Message"]',      // 大文字小文字対応
        '.message-management',
        '#messageManagement',
        'a[href*="message_management"]',  // 新しく追加
        'a[href*="メッセージ"]'          // 新しく追加
      ];
      
      let managementButtonFound = false;
      for (const selector of messageManagementSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          
          // 新しいタブが開く可能性があるため、新しいページを監視
          console.log('🔍 新しいタブの開始を監視中...');
          
          const beforeUrl = this.page.url();
          console.log(`🔍 クリック前URL: ${beforeUrl}`);
          
          // 新しいページ（タブ）が開くのを待機
          const [newPage] = await Promise.all([
            this.context!.waitForEvent('page'), // 新しいページを待機
            this.page.click(selector) // ボタンをクリック
          ]);
          
          managementButtonFound = true;
          console.log(`✅ メッセージ管理ボタンクリック完了: ${selector}`);
          console.log('🎯 新しいタブが開きました！');
          
          // 新しいページに切り替え
          this.page = newPage;
          await this.page.waitForLoadState('networkidle');
          
          const newUrl = this.page.url();
          const newTitle = await this.page.title();
          console.log(`📱 新しいタブ情報: "${newTitle}" - ${newUrl}`);
          
          // JavaScriptの実行とページ遷移を待機
          console.log('⏳ 新しいタブでのページ読み込み完了を待機中...');
          
          // より長い待機時間でページ変化を監視
          let urlChanged = false;
          for (let i = 0; i < 10; i++) { // 10秒間監視
            await this.page.waitForTimeout(1000);
            const currentUrl = this.page.url();
            const currentTitle = await this.page.title();
            
            console.log(`⏱️  ${i + 1}秒後: URL="${currentUrl}" タイトル="${currentTitle}"`);
            
            if (currentUrl !== beforeUrl) {
              console.log('✅ URL変化を確認 - ページ遷移成功');
              urlChanged = true;
              break;
            }
            
            // フレーム変化も監視
            const frames = await this.page.frames();
            if (frames.length > 1) {
              console.log(`📦 フレーム数変化を検出: ${frames.length}個`);
              for (let j = 0; j < frames.length; j++) {
                try {
                  const frameUrl = frames[j].url();
                  const frameTitle = await frames[j].title();
                  console.log(`   フレーム${j}: "${frameTitle}" - ${frameUrl}`);
                } catch (e) {
                  console.log(`   フレーム${j}: アクセス不可`);
                }
              }
            }
          }
          
          const afterUrl = this.page.url();
          if (!urlChanged && beforeUrl === afterUrl) {
            console.log('⚠️ 10秒待機後もURLが変化していません');
            console.log('💡 フレーム内でページ変化が発生している可能性があります');
          }
          
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
   * フレーム内からメール一覧を抽出
   */
  async extractMailListFromFrame(frame: any): Promise<Array<{subject: string, href: string, date: string}>> {
    console.log('🔍 フレーム内メール一覧を抽出中...');
    
    try {
      const mailList = await frame.$$eval('table tr, .list2 tr, div[class*="mail"], a[href*="message"]', (elements: any[]) =>
        elements.map(el => {
          const text = el.textContent?.trim() || '';
          const href = el.href || (el.querySelector('a') as HTMLAnchorElement)?.href || '';
          
          // メール関連のキーワードを含むかチェック
          const isMailRelated = 
            text.includes('CS通達') || 
            text.includes('面接') || 
            text.includes('メール') ||
            href.includes('message_management33_view') ||
            href.includes('message');
          
          if (isMailRelated && text.length > 5 && href.length > 10) {
            return {
              subject: text.substring(0, 100),
              href: href,
              date: new Date().toISOString().split('T')[0] // 暫定的な日付
            };
          }
          return null;
        }).filter(item => item !== null)
      );
      
      console.log(`🎯 フレーム内で${mailList.length}件のメールを発見:`);
      mailList.forEach((mail, i) => {
        console.log(`   ${i + 1}. "${mail.subject}" - ${mail.href}`);
      });
      
      return mailList;
    } catch (error) {
      console.log('⚠️ フレーム内メール抽出エラー:', error);
      return [];
    }
  }

  /**
   * メール一覧を取得
   */
  async fetchMailList(): Promise<Array<{subject: string, href: string, date: string}>> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('📬 メール一覧を取得中...');
    console.log('🔍 === fetchMailList デバッグ開始 ===');
    
    // targetFrameが設定されている場合、そのフレームを使用
    const targetFrame = (this as any).targetFrame;
    console.log('🔍 targetFrame設定状況:', targetFrame ? 'あり' : 'なし');
    console.log('🔍 targetFrame値:', targetFrame);
    console.log('🔍 targetFrame型:', typeof targetFrame);
    
    if (targetFrame) {
      console.log('🔍 targetFrame詳細:', {
        url: targetFrame.url ? targetFrame.url() : '不明',
        type: typeof targetFrame
      });
      console.log('🎯 発見されたtargetFrameを使用してメール一覧を取得中...');
      try {
        const frameUrl = targetFrame.url();
        const frameTitle = await targetFrame.title();
        console.log(`📍 使用フレーム: "${frameTitle}" - ${frameUrl}`);
        
        const frameMailList = await this.extractMailListFromFrame(targetFrame);
        
        if (frameMailList.length > 0) {
          console.log(`🎉 フレーム内で${frameMailList.length}件のメールを正常取得！処理を完了します`);
          return frameMailList; // 成功時は即座に返す
        } else {
          console.log('⚠️ フレーム内でメールが見つかりませんでした - メインページにフォールバック');
        }
      } catch (error) {
        console.log('⚠️ targetFrame使用エラー:', error);
        console.log('💡 メインページでの取得にフォールバック');
      }
    }
    
    try {
      // navigateToMessageManagement()の後、既にメール一覧ページにいるはず
      console.log('📍 メインページでメール一覧を取得中...');
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
      
      // 🚀 フレームセット構造の調査
      try {
        console.log('🔍 フレームセット構造を調査中...');
        
        // フレーム構造の確認
        const frames = await this.page.frames();
        console.log(`📦 検出されたフレーム数: ${frames.length}`);
        
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          try {
            const frameUrl = frame.url();
            const frameTitle = await frame.title();
            console.log(`  フレーム${i}: URL="${frameUrl}" タイトル="${frameTitle}"`);
            
            // 各フレームで「CS通達」「面接」「メール」を検索
            const frameContent = await frame.content();
            const hasCS = frameContent.includes('CS通達');
            const hasInterview = frameContent.includes('面接');
            const hasMail = frameContent.includes('メール');
            
                         if (hasCS || hasInterview || hasMail) {
               console.log(`🎯 フレーム${i}にメール関連コンテンツを発見！ CS通達:${hasCS} 面接:${hasInterview} メール:${hasMail}`);
               
               // このフレームのHTMLを保存
               const fs = require('fs');
               fs.writeFileSync(`debug-frame-${i}.html`, frameContent, 'utf8');
               console.log(`📄 フレーム${i}のHTML保存: debug-frame-${i}.html`);
               
               // フレーム内でメール一覧を直接探してみる
               try {
                 const frameMailList = await frame.$$eval('table tr, .list2 tr, div[class*="mail"], a[href*="message"]', links =>
                   links.map(link => ({
                     tag: link.tagName,
                     text: link.textContent?.trim() || '',
                     href: (link as HTMLAnchorElement).href || '',
                     className: link.className || ''
                   })).filter(link => 
                     (link.text.includes('CS通達') || 
                      link.text.includes('面接') || 
                      link.href.includes('message_management33_view')) &&
                     link.text.length > 0
                   )
                 );
                 
                 if (frameMailList.length > 0) {
                   console.log(`🎯 フレーム${i}内でメール一覧発見！`);
                   frameMailList.forEach((mail, j) => {
                     console.log(`   ${j + 1}. "${mail.text}" - ${mail.href}`);
                   });
                   
                   // フレーム内のメール一覧で実際にメールが見つかった場合、このフレームで作業を続行
                   const hasRealMailLinks = frameMailList.some(mail => 
                     mail.href.includes('message_management33_view'));
                   const hasMailKeywords = frameMailList.some(mail => 
                     mail.text.includes('CS通達') || 
                     mail.text.includes('CS希望') || 
                     mail.text.includes('面接') || 
                     mail.text.includes('面談') || 
                     mail.text.includes('メール'));
                   
                   // 実際のメールリンクがあり、かつキーワードがマッチし、かつtargetFrameが未設定の場合のみ設定
                   if (frameMailList.length > 0 && hasRealMailLinks && hasMailKeywords && !(this as any).targetFrame) {
                     console.log(`🎯 フレーム${i}で実際のメール一覧を発見！このフレームを使用します`);
                     console.log(`🎯 マッチしたメール数: ${frameMailList.length}件`);
                     console.log(`🎯 実際のメールリンク存在: ${hasRealMailLinks}`);
                     // このフレームでメール取得作業を継続するためのフラグ
                     (this as any).targetFrame = frame;
                   } else if (frameMailList.length > 0) {
                     console.log(`⚠️ フレーム${i}でメール発見も条件不一致: メール数=${frameMailList.length}, リンク=${hasRealMailLinks}, キーワード=${hasMailKeywords}, targetFrame既存=${!!(this as any).targetFrame}`);
                   }
                 }
               } catch (frameMailError) {
                 console.log(`⚠️ フレーム${i}のメール一覧探索エラー:`, frameMailError.message);
               }
             }
          } catch (frameError) {
            console.log(`⚠️ フレーム${i}の調査エラー:`, frameError.message);
          }
        }
      } catch (error) {
        console.log('⚠️ フレーム調査エラー:', error);
      }
      
      // 🚀 直接メール一覧ページアクセスを試行
      try {
        console.log('🔍 直接メール一覧ページアクセスを試行中...');
        
        // 可能性のあるメール一覧URL
        const possibleMailUrls = [
          `${this.config.baseUrl}/webcalib/app/message_management_view?jobseekerNo=${this.config.jobseekerNo}`,
          `${this.config.baseUrl}/webcalib/app/message_management33_list?jobseekerNo=${this.config.jobseekerNo}`,
          `${this.config.baseUrl}/webcalib/app/message_list?jobseekerNo=${this.config.jobseekerNo}`,
          `${this.config.baseUrl}/webcalib/app/mail_list?jobseekerNo=${this.config.jobseekerNo}`
        ];
        
        for (const mailUrl of possibleMailUrls) {
          try {
            console.log(`🌐 試行URL: ${mailUrl}`);
            await this.page.goto(mailUrl);
            await this.page.waitForLoadState('networkidle');
            
            const pageTitle = await this.page.title();
            const pageContent = await this.page.content();
            const hasCS = pageContent.includes('CS通達');
            const hasInterview = pageContent.includes('面接');
            
            console.log(`📄 結果 - タイトル: "${pageTitle}" CS通達:${hasCS} 面接:${hasInterview}`);
            
            if (hasCS || hasInterview) {
              console.log(`🎯 メール一覧ページ発見！ URL: ${mailUrl}`);
              const fs = require('fs');
              fs.writeFileSync('debug-direct-maillist.html', pageContent, 'utf8');
              console.log('📄 直接アクセス成功のHTML保存: debug-direct-maillist.html');
              break;
            }
          } catch (directError) {
            console.log(`⚠️ 直接アクセス失敗: ${mailUrl} - ${directError.message}`);
          }
        }
      } catch (error) {
        console.log('⚠️ 直接アクセス試行エラー:', error);
      }
      
      // 🚀 完全ページHTML取得・保存
      try {
        const fullHTML = await this.page.content();
        const fs = require('fs');
        fs.writeFileSync('debug-maillist-full.html', fullHTML, 'utf8');
        console.log('📄 完全HTML保存: debug-maillist-full.html (ファイルを開いて実際の構造を確認可能)');
        
        // HTMLの重要な部分を抽出して表示
        const htmlPreview = fullHTML.substring(0, 2000);
        console.log('📄 HTML先頭2000文字:', htmlPreview);
        
        // 「CS通達」「面接」「メール」キーワード周辺のHTML抽出
        const keywordPattern = /(CS通達|面接|メール|message)/gi;
        const matches = [];
        let match;
        while ((match = keywordPattern.exec(fullHTML)) !== null) {
          const start = Math.max(0, match.index - 200);
          const end = Math.min(fullHTML.length, match.index + 200);
          const context = fullHTML.substring(start, end);
          matches.push({
            keyword: match[0],
            position: match.index,
            context: context.replace(/\s+/g, ' ')
          });
          if (matches.length >= 10) break; // 最初の10件まで
        }
        
        console.log('🔍 キーワード「CS通達/面接/メール」周辺のHTML:');
        matches.forEach((m, i) => {
          console.log(`  ${i + 1}. "${m.keyword}" (位置: ${m.position})`);
          console.log(`     文脈: "${m.context.substring(0, 150)}..."`);
        });
        
      } catch (error) {
        console.log('⚠️ 完全HTML取得エラー:', error);
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
      
      // メール一覧を実際に取得する処理（メインページ用のフォールバック）
      console.log('📋 メインページでのメール一覧取得を試行...');
      
      const mailList = await this.page.evaluate(() => {
        const mails: Array<{subject: string, href: string, date: string}> = [];
        
        // table.list2やその他のメール一覧テーブルを検索
        const tableRows = document.querySelectorAll('table.list2 tr, table tr');
        console.log(`🔍 ${tableRows.length}個のテーブル行を発見`);
        
        for (const row of tableRows) {
          const link = row.querySelector('a[href*="message_management33_view"]');
          if (link && link.textContent) {
            const subject = link.textContent.trim();
            const href = (link as HTMLAnchorElement).href;
            
            // メール関連キーワードをチェック
            if (subject.includes('CS通達') || subject.includes('面接') || subject.includes('メール') || subject.length > 5) {
              mails.push({
                subject: subject.substring(0, 100),
                href: href,
                date: new Date().toISOString().split('T')[0]
              });
            }
          }
        }
        
        return mails;
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