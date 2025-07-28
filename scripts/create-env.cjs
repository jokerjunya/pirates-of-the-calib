#!/usr/bin/env node

/**
 * 環境変数テンプレートファイル作成スクリプト
 * Usage: node scripts/create-env.js
 */

const fs = require('fs');
const path = require('path');

const ENV_TEMPLATE = `# Web-CALIB メールスクレイピングシステム 環境変数設定
# 🚀 このファイルはセットアップ時に自動生成されました

# ===========================================
# Web-CALIB 接続設定 (必須)
# ===========================================
WEBCALIB_BASE_URL=https://rt-calib.r-agent.com
WEBCALIB_USERNAME=your_username_here
WEBCALIB_PASSWORD=your_password_here

# ===========================================
# スクレイピング設定 (推奨)
# ===========================================
WEBCALIB_TARGET_EMAIL=your_email@example.com
WEBCALIB_JOBSEEKER_NO=
WEBCALIB_HEADLESS=true
WEBCALIB_TIMEOUT=30000

# ===========================================
# Next.js アプリケーション設定
# ===========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEBCALIB_BASE_URL=https://rt-calib.r-agent.com
NEXT_PUBLIC_WEBCALIB_USERNAME=your_username_here
NEXT_PUBLIC_WEBCALIB_TARGET_EMAIL=your_email@example.com
NEXT_PUBLIC_WEBCALIB_JOBSEEKER_NO=

# ===========================================
# 開発設定 (オプション)
# ===========================================
NODE_ENV=development
PORT=3000
PLAYWRIGHT_BROWSER_PATH=

# ===========================================
# 🎯 デモサイト設定 (テスト用)
# ===========================================
# デモサイト同期ボタン用の自動設定
# - ユーザー名: 7777319
# - パスワード: password1!
# - メール: demo@example.com (自動設定)
`;

function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  // 既存の.env.localがある場合はバックアップ
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`📦 既存の.env.localをバックアップしました: ${backupPath}`);
  }
  
  // 新しい.env.localを作成
  fs.writeFileSync(envPath, ENV_TEMPLATE);
  console.log('✅ .env.local テンプレートファイルを作成しました');
  console.log('');
  console.log('🔧 次のステップ:');
  console.log('   1. .env.local ファイルを開いて実際の値を設定してください');
  console.log('   2. 特に以下の項目は必須です:');
  console.log('      - WEBCALIB_USERNAME (Web-CALIBユーザー名)');
  console.log('      - WEBCALIB_PASSWORD (Web-CALIBパスワード)');
  console.log('      - WEBCALIB_TARGET_EMAIL (検索対象メールアドレス)');
  console.log('');
  console.log('🎯 設定後は以下のコマンドでアプリを起動できます:');
  console.log('   pnpm quick-start');
}

// メイン実行
createEnvFile(); 