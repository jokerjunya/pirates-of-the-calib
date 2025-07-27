#!/usr/bin/env node

/**
 * Web-CALIB メール同期 CLI
 * 
 * 使用方法:
 *   pnpm sync:internal
 *   npm run sync:internal
 *   tsx adapters/internal-mail/cli.ts
 */

import { syncWebCalibMails, validateScraperConfig, generateMailStatistics } from './index';
import type { ScraperConfig } from './types';

// 環境変数から設定を読み込み
function loadConfigFromEnv(): ScraperConfig {
  const config = {
    baseUrl: process.env.WEBCALIB_BASE_URL || 'https://rt-calib.r-agent.com',
    // 実際のWeb-CALIBログインページURL（logoutページがログイン画面として機能）
    loginUrl: process.env.WEBCALIB_LOGIN_URL || '/webcalib/app/logout?sn=21f10a00b9a7d4f4836e5f6077a672af&CLB31A',
    listUrl: process.env.WEBCALIB_LIST_URL || '/webcalib/app/message_management33_list',
    username: process.env.WEBCALIB_USERNAME || '7777319',
    password: process.env.WEBCALIB_PASSWORD || 'password1!',
    targetEmail: process.env.WEBCALIB_TARGET_EMAIL || 'yuya_inagaki+005@r.recruit.co.jp',
    jobseekerNo: process.env.WEBCALIB_JOBSEEKER_NO || undefined,
    headless: process.env.WEBCALIB_HEADLESS !== 'false', // デフォルトはheadless
    timeout: parseInt(process.env.WEBCALIB_TIMEOUT || '30000')
  };
  
  return config;
}

/**
 * Phase 3: ネットワーク接続テスト機能
 */
async function testNetworkConnection(baseUrl: string): Promise<boolean> {
  console.log('🌐 ネットワーク接続テスト中...');
  
  try {
    const testUrls = [
      baseUrl,
      `${baseUrl}/webcalib/app/logout?sn=21f10a00b9a7d4f4836e5f6077a672af&CLB31A`,
      // DNS解決テスト用の代替URL
      'https://google.com', // 基本的なインターネット接続確認
    ];
    
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    
    let connectionsSuccessful = 0;
    let loginPageWorking = false;
    let internetWorking = false;
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      try {
        console.log(`🔗 接続テスト: ${url}`);
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
        
        if (response && response.status() < 400) {
          console.log(`  ✅ 成功 (HTTP ${response.status()})`);
          connectionsSuccessful++;
          
          // ログインページ（index 1）の成功を記録
          if (i === 1) {
            loginPageWorking = true;
          }
          // インターネット接続確認（index 2 = Google）の成功を記録
          if (i === 2) {
            internetWorking = true;
          }
        } else {
          console.log(`  ⚠️ 警告 (HTTP ${response?.status() || 'no response'})`);
          // ベースURLの404は正常な場合があることを明記
          if (i === 0 && response?.status() === 404) {
            console.log(`  💡 ベースURLの404は正常です（Web-CALIBはルートページが存在しません）`);
          }
        }
      } catch (error) {
        console.log(`  ❌ 失敗: ${error instanceof Error ? error.message : String(error)}`);
        
        // DNS解決の問題かどうかを判定
        if (error instanceof Error && error.message.includes('ERR_NAME_NOT_RESOLVED')) {
          console.log(`  💡 DNS解決エラーの可能性: ${url}`);
        }
      }
    }
    
    await browser.close();
    
    const successRate = (connectionsSuccessful / testUrls.length) * 100;
    console.log(`📊 接続テスト完了: ${connectionsSuccessful}/${testUrls.length} 成功 (${successRate.toFixed(1)}%)`);
    
    // より詳細な診断結果を表示
    if (loginPageWorking) {
      console.log('✅ 重要: Web-CALIBログインページは正常に動作しています');
    }
    if (internetWorking) {
      console.log('✅ インターネット接続は正常です');
    }
    if (!loginPageWorking) {
      console.log('⚠️ Web-CALIBログインページに接続できませんでした');
    }
    
    // 実際の業務に必要な接続（ログインページとインターネット）があれば継続
    return loginPageWorking && internetWorking;
    
  } catch (error) {
    console.error('❌ ネットワーク接続テストエラー:', error);
    return false;
  }
}

// ヘルプメッセージ
function showHelp() {
  console.log(`
🌐 Web-CALIB メール同期ツール

使用方法:
  pnpm sync:internal              # 環境変数から設定を読み込んで実行
  pnpm sync:internal --help       # このヘルプを表示
  pnpm sync:internal --config     # 設定例を表示

必要な環境変数:
  WEBCALIB_BASE_URL     # Web-CALIBのベースURL (デフォルト: https://rt-calib.r-agent.com)
  WEBCALIB_USERNAME     # ログインユーザー名 (デフォルト: 7777319)
  WEBCALIB_PASSWORD     # ログインパスワード (デフォルト: password1!)
  WEBCALIB_TARGET_EMAIL # 検索対象e-mail (デフォルト: yuya_inagaki+005@r.recruit.co.jp)
  
オプション環境変数:
  WEBCALIB_LOGIN_URL    # ログインURL (デフォルト: /webcalib/app/logout?sn=...&CLB31A)
  WEBCALIB_LIST_URL     # メール一覧URL (デフォルト: /webcalib/app/message_management33_list)
  WEBCALIB_JOBSEEKER_NO # 求職者番号 (オプション)
  WEBCALIB_HEADLESS     # ヘッドレスモード (デフォルト: true, false で GUI表示)
  WEBCALIB_TIMEOUT      # タイムアウト(ms) (デフォルト: 30000)

例:
  export WEBCALIB_BASE_URL="https://your-server.com"
  export WEBCALIB_USERNAME="your-username"
  export WEBCALIB_PASSWORD="your-password"
  pnpm sync:internal
`);
}

// 設定例を表示
function showConfigExample() {
  console.log(`
📝 .env ファイル設定例:

# Web-CALIB 接続設定
WEBCALIB_BASE_URL=https://rt-calib.r-agent.com
WEBCALIB_USERNAME=7777319
WEBCALIB_PASSWORD=password1!

# オプション設定
WEBCALIB_TARGET_EMAIL=yuya_inagaki+005@r.recruit.co.jp
WEBCALIB_JOBSEEKER_NO=12345
WEBCALIB_HEADLESS=true
WEBCALIB_TIMEOUT=30000

# Next.js アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
`);
}

// メイン実行関数
async function main() {
  const args = process.argv.slice(2);
  
  // ヘルプ表示
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // 設定例表示
  if (args.includes('--config')) {
    showConfigExample();
    process.exit(0);
  }
  
  console.log('🚀 Web-CALIB メール同期を開始します...\n');
  
  try {
    // 設定を読み込み
    const config = loadConfigFromEnv();
    
    // 設定の妥当性チェック
    const validation = validateScraperConfig(config);
    
    if (!validation.valid) {
      console.error('❌ 設定エラー:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      console.log('\n💡 --help オプションで使用方法を確認してください');
      process.exit(1);
    }
    
    // Phase 3: ネットワーク接続テスト実行
    console.log('🔍 Phase 3: ネットワーク診断開始...');
    const networkOk = await testNetworkConnection(config.baseUrl);
    
    if (!networkOk) {
      console.error('\n❌ ネットワーク接続に問題があります');
      console.log('\n🔧 トラブルシューティング:');
      console.log('  1. インターネット接続を確認してください');
      console.log('  2. Web-CALIBサーバー (rt-calib.r-agent.com) にアクセス可能か確認してください');
      console.log('  3. 企業ファイアウォールやプロキシ設定を確認してください');
      console.log('  4. DNS設定を確認してください');
      console.log('\n⚠️ 接続問題があっても処理を続行しますが、エラーが発生する可能性があります');
      console.log('続行しますか？ (強制続行する場合は何かキーを押してください)');
      
      // 10秒待機後に続行
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('🔄 処理を続行します...\n');
    } else {
      console.log('✅ ネットワーク接続テスト完了\n');
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  設定の警告:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      console.log();
    }
    
    // 設定情報を表示（パスワードはマスク）
    console.log('📋 同期設定:');
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log(`  Username: ${config.username}`);
    console.log(`  Password: ${'*'.repeat(config.password.length)}`);
    console.log(`  Headless: ${config.headless}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    if (config.jobseekerNo) {
      console.log(`  Jobseeker No: ${config.jobseekerNo}`);
    }
    console.log();
    
    // 同期実行
    const result = await syncWebCalibMails(config);
    
    if (result.success) {
      console.log('\n🎉 同期が正常に完了しました!\n');
      
      // 統計情報を表示
      if (result.internalMails.length > 0) {
        const stats = generateMailStatistics(result.internalMails);
        
        console.log('📊 同期結果:');
        console.log(`  総メール数: ${stats.totalMails}`);
        console.log(`  スレッド数: ${result.summary.totalThreads}`);
        console.log(`  ユニーク送信者: ${stats.uniqueSenders}`);
        console.log(`  添付ファイル: ${stats.attachmentCount}`);
        console.log(`  平均本文長: ${stats.averageBodyLength}文字`);
        
        if (stats.dateRange.earliest && stats.dateRange.latest) {
          console.log(`  期間: ${new Date(stats.dateRange.earliest).toLocaleDateString()} - ${new Date(stats.dateRange.latest).toLocaleDateString()}`);
        }
        
        console.log('  優先度分布:');
        Object.entries(stats.priorityDistribution).forEach(([priority, count]) => {
          console.log(`    ${priority}: ${count}件`);
        });
      }
      
      console.log('\n💡 次のステップ:');
      console.log('  1. Next.js アプリケーションを起動: pnpm dev');
      console.log('  2. /api/import-internal エンドポイントにデータを送信');
      console.log('  3. ca-support2 UI でメールを確認');
      
    } else {
      console.error('\n❌ 同期でエラーが発生しました:');
      result.summary.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 予期しないエラーが発生しました:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n\n⏹️  同期を中断しています...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  同期を終了しています...');
  process.exit(0);
});

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 CLI実行エラー:', error);
    process.exit(1);
  });
} 