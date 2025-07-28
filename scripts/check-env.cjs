#!/usr/bin/env node

/**
 * 環境変数チェックスクリプト
 * Usage: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

// 必須環境変数
const REQUIRED_VARS = [
  'WEBCALIB_BASE_URL',
  'WEBCALIB_USERNAME', 
  'WEBCALIB_PASSWORD'
];

// 推奨環境変数
const RECOMMENDED_VARS = [
  'WEBCALIB_TARGET_EMAIL',
  'NEXT_PUBLIC_WEBCALIB_BASE_URL',
  'NEXT_PUBLIC_WEBCALIB_USERNAME'
];

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local ファイルが見つかりません');
    console.log('');
    console.log('🛠️  セットアップを実行してください:');
    console.log('   pnpm setup');
    console.log('');
    process.exit(1);
  }
  
  // .env.local を読み込み
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

function checkEnvironment() {
  console.log('🔍 環境変数をチェック中...');
  console.log('');
  
  const envVars = loadEnvFile();
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // 必須変数チェック
  console.log('✅ 必須環境変数:');
  REQUIRED_VARS.forEach(varName => {
    const value = envVars[varName];
    if (!value || value === 'your_username_here' || value === 'your_password_here' || value === 'your_email@example.com') {
      console.log(`   ❌ ${varName}: 未設定または初期値のまま`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${varName}: 設定済み`);
    }
  });
  
  console.log('');
  
  // 推奨変数チェック
  console.log('🔧 推奨環境変数:');
  RECOMMENDED_VARS.forEach(varName => {
    const value = envVars[varName];
    if (!value || value === 'your_username_here' || value === 'your_password_here' || value === 'your_email@example.com') {
      console.log(`   ⚠️  ${varName}: 未設定 (推奨)`);
      hasWarnings = true;
    } else {
      console.log(`   ✅ ${varName}: 設定済み`);
    }
  });
  
  console.log('');
  
  if (hasErrors) {
    console.log('❌ 必須環境変数が不足しています');
    console.log('');
    console.log('🔧 修正方法:');
    console.log('   1. .env.local ファイルを開く');
    console.log('   2. 必須項目に実際の値を設定');
    console.log('   3. 再度 pnpm quick-start を実行');
    console.log('');
    process.exit(1);
  }
  
  if (hasWarnings) {
    console.log('⚠️  一部推奨環境変数が未設定ですが、アプリは起動できます');
    console.log('');
  }
  
  console.log('✅ 環境変数チェック完了 - アプリを起動します');
  console.log('');
  console.log('🚀 起動後のアクセス方法:');
  console.log('   📧 ダッシュボード: http://localhost:3000/sync-dashboard');
  console.log('   🎯 デモサイト同期: 緑色の「デモサイト同期」ボタン');
  console.log('   🏢 本番サイト同期: 青色の「本番サイト同期」ボタン');
  console.log('');
}

// メイン実行
checkEnvironment(); 