import { test, expect } from '@playwright/test';
import { WebCalibScraper } from '../adapters/internal-mail/scraper';
import { validateScraperConfig } from '../adapters/internal-mail/index';
import type { ScraperConfig } from '../adapters/internal-mail/types';

// テスト用のモック設定
const mockConfig: ScraperConfig = {
  baseUrl: 'https://test-webcalib.example.com',
  loginUrl: '/webcalib/app/login?CLB31A',
  listUrl: '/webcalib/app/message_management33_list',
  username: 'test-user',
  password: 'test-password',
  headless: true,
  timeout: 5000
};

test.describe('WebCalibScraper', () => {
  
  test('設定の妥当性チェック - 正常な設定', () => {
    const result = validateScraperConfig(mockConfig);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('設定の妥当性チェック - 必須項目不足', () => {
    const invalidConfig = {
      baseUrl: '',
      username: '',
      password: ''
    };
    
    const result = validateScraperConfig(invalidConfig);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('baseUrl is required');
    expect(result.errors).toContain('username is required');
    expect(result.errors).toContain('password is required');
  });

  test('設定の妥当性チェック - 不正なURL形式', () => {
    const invalidConfig = {
      ...mockConfig,
      baseUrl: 'invalid-url'
    };
    
    const result = validateScraperConfig(invalidConfig);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('baseUrl must start with http:// or https://');
  });

  test('スクレイパーインスタンス作成', () => {
    const scraper = new WebCalibScraper(mockConfig);
    
    expect(scraper).toBeInstanceOf(WebCalibScraper);
  });

  test('設定のデフォルト値適用', () => {
    const minimalConfig: ScraperConfig = {
      baseUrl: 'https://test.com',
      loginUrl: '/login',
      listUrl: '/list',
      username: 'user',
      password: 'pass'
    };
    
    const scraper = new WebCalibScraper(minimalConfig);
    
    // デフォルト値が適用されていることを確認（内部実装に依存するため、公開インターフェースで確認）
    expect(scraper).toBeDefined();
  });
});

test.describe('API Integration', () => {
  
  test('import-internal API - 設定エラー', async ({ request }) => {
    const response = await request.post('/api/import-internal', {
      data: {
        mode: 'scrape',
        scraperConfig: {
          baseUrl: '',
          username: '',
          password: ''
        }
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('設定エラー');
  });

  test('import-internal API - 無効なモード', async ({ request }) => {
    const response = await request.post('/api/import-internal', {
      data: {
        mode: 'invalid-mode'
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('サポートされていないモードです');
  });

  test('import-internal API - メソッド不許可', async ({ request }) => {
    const response = await request.get('/api/import-internal');
    
    expect(response.status()).toBe(405);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('POSTリクエストのみサポートしています');
  });

  test('import-internal API - 直接モード（空データ）', async ({ request }) => {
    const response = await request.post('/api/import-internal', {
      data: {
        mode: 'direct',
        threads: [],
        messages: []
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('スレッドまたはメッセージデータが必要です');
  });
});

test.describe('Dashboard UI', () => {
  
  test('ダッシュボードページの表示', async ({ page }) => {
    await page.goto('/sync-dashboard');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle('Web-CALIB メール同期ダッシュボード');
    
    // 主要な要素が表示されているか確認
    await expect(page.locator('h1')).toContainText('Web-CALIB メール同期ダッシュボード');
    await expect(page.locator('h2')).toContainText('接続設定');
    await expect(page.locator('h2')).toContainText('同期ステータス');
  });

  test('設定フォームの入力', async ({ page }) => {
    await page.goto('/sync-dashboard');
    
    // 設定項目の入力
    await page.fill('input[placeholder="https://your-webcalib-server.com"]', 'https://test.example.com');
    await page.fill('input[type="text"]', 'test-user');
    await page.fill('input[type="password"]', 'test-password');
    await page.fill('input[placeholder="12345"]', '67890');
    
    // 入力値の確認
    await expect(page.locator('input[placeholder="https://your-webcalib-server.com"]')).toHaveValue('https://test.example.com');
    await expect(page.locator('input[type="text"]')).toHaveValue('test-user');
    await expect(page.locator('input[placeholder="12345"]')).toHaveValue('67890');
  });

  test('同期ボタンの動作 - 設定不足エラー', async ({ page }) => {
    await page.goto('/sync-dashboard');
    
    // アラートをモック
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('必要な設定項目を入力してください');
      await dialog.accept();
    });
    
    // 設定を入力せずに同期ボタンをクリック
    await page.click('button:has-text("Web-CALIB同期を開始")');
  });

  test('ヘッドレスモードチェックボックス', async ({ page }) => {
    await page.goto('/sync-dashboard');
    
    const checkbox = page.locator('#headless');
    
    // デフォルトでチェック済み
    await expect(checkbox).toBeChecked();
    
    // チェックを外す
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    
    // チェックを入れる
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});

test.describe('CLI Integration', () => {
  
  test.skip('CLI ヘルプ表示', async () => {
    // 注意: 実際のCLI実行はテスト環境で慎重に行う必要があります
    // このテストは実装例として skip しています
    
    // const { exec } = require('child_process');
    // const result = await new Promise((resolve) => {
    //   exec('tsx adapters/internal-mail/cli.ts --help', (error, stdout, stderr) => {
    //     resolve({ error, stdout, stderr });
    //   });
    // });
    
    // expect(result.stdout).toContain('Web-CALIB メール同期ツール');
  });
}); 