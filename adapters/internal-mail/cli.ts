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
    loginUrl: process.env.WEBCALIB_LOGIN_URL || '/webcalib/app/logout?sn=21f10a00b9a7d4f4836e5f6077a672af&CLB31A',
    listUrl: process.env.WEBCALIB_LIST_URL || '/webcalib/app/message_management33_list',
    username: process.env.WEBCALIB_USERNAME || '',
    password: process.env.WEBCALIB_PASSWORD || '',
    targetEmail: process.env.WEBCALIB_TARGET_EMAIL || 'yuya_inagaki+005@r.recruit.co.jp',
    jobseekerNo: process.env.WEBCALIB_JOBSEEKER_NO || undefined,
    headless: process.env.WEBCALIB_HEADLESS !== 'false', // デフォルトはheadless
    timeout: parseInt(process.env.WEBCALIB_TIMEOUT || '30000')
  };
  
  return config;
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
  WEBCALIB_USERNAME     # ログインユーザー名 (必須)
  WEBCALIB_PASSWORD     # ログインパスワード (必須)
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
WEBCALIB_USERNAME=your-username
WEBCALIB_PASSWORD=your-password

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