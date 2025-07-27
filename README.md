# Web-CALIB メールスクレイピング → ca-support2 連携システム

このプロジェクトは、社内メールシステム **Web-CALIB** からメールをスクレイピングして、**ca-support2**（Gmail ラッパー）に取り込む「抜き取りアプリ」です。目的は **AI が返信生成できる共通メールストア** を構築することです。

## 🎯 システム概要

```
Web-CALIB → Playwright スクレイピング → Gmail 形式変換 → ca-support2 取り込み
```

## 🛠️ 技術スタック

- **スクレイピング**: Playwright (TypeScript)
- **HTMLパース**: Cheerio
- **フレームワーク**: Next.js 14
- **DTO変換**: カスタムマッピング関数
- **UI**: React + Tailwind CSS
- **CLI**: tsx

## 📁 プロジェクト構造

```
calib-hacking/
├── adapters/internal-mail/          # メールスクレイピング機能
│   ├── types.ts                     # 型定義
│   ├── scraper.ts                   # Playwrightスクレイパー
│   ├── parser.ts                    # HTMLパーサー
│   ├── mapper.ts                    # DTO変換
│   ├── cli.ts                       # CLIエントリーポイント
│   └── index.ts                     # メインエクスポート
├── pages/
│   ├── api/import-internal.ts       # メール取り込みAPI
│   └── sync-dashboard.tsx           # 同期ダッシュボード
├── package.json
└── README.md
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
# パッケージインストール
pnpm install

# Playwright ブラウザのインストール
pnpm playwright:install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成：

```bash
# Web-CALIB 接続設定
WEBCALIB_BASE_URL=https://your-webcalib-server.com
WEBCALIB_USERNAME=your-username
WEBCALIB_PASSWORD=your-password

# オプション設定
WEBCALIB_JOBSEEKER_NO=12345
WEBCALIB_HEADLESS=true
WEBCALIB_TIMEOUT=30000

# Next.js アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. アプリケーション起動

```bash
# 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:3000/sync-dashboard にアクセス
```

## 📋 使用方法

### CLI での同期実行

```bash
# 環境変数を設定してCLI実行
export WEBCALIB_BASE_URL="https://your-server.com"
export WEBCALIB_USERNAME="your-username"
export WEBCALIB_PASSWORD="your-password"

# 同期実行
pnpm sync:internal

# ヘルプ表示
pnpm sync:internal --help

# 設定例表示
pnpm sync:internal --config
```

### Web UI での同期実行

1. ブラウザで `http://localhost:3000/sync-dashboard` にアクセス
2. Web-CALIB接続情報を入力
3. 「Web-CALIB同期を開始」ボタンをクリック
4. 進行状況を確認し、結果を表示

### API での直接呼び出し

```bash
# スクレイピングモード
curl -X POST http://localhost:3000/api/import-internal \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "scrape",
    "scraperConfig": {
      "baseUrl": "https://your-server.com",
      "username": "your-username",
      "password": "your-password",
      "headless": true
    }
  }'

# 直接データ送信モード
curl -X POST http://localhost:3000/api/import-internal \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "direct",
    "threads": [...],
    "messages": [...]
  }'
```

## 🔧 設定オプション

### ScraperConfig

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `baseUrl` | ✅ | - | Web-CALIBのベースURL |
| `username` | ✅ | - | ログインユーザー名 |
| `password` | ✅ | - | ログインパスワード |
| `loginUrl` | ❌ | `/webcalib/app/login?CLB31A` | ログインページURL |
| `listUrl` | ❌ | `/webcalib/app/message_management33_list` | メール一覧URL |
| `jobseekerNo` | ❌ | - | 求職者番号 |
| `headless` | ❌ | `true` | ヘッドレスモード |
| `timeout` | ❌ | `30000` | タイムアウト（ms） |

## 🧪 テスト実行

```bash
# 単体テスト実行
pnpm test

# Playwright E2Eテスト実行
pnpm test:playwright

# テストカバレッジ表示
pnpm test --coverage
```

## 📊 機能詳細

### スクレイピング機能 (`adapters/internal-mail/scraper.ts`)

- Playwrightを使用したブラウザ自動化
- ログイン処理と認証状態の維持
- `table.list2` からメール一覧の取得
- フレームセット構造の詳細ページ解析
- エラーハンドリングとリトライ機能

### HTMLパーサー (`adapters/internal-mail/parser.ts`)

- Cheerioを使用したDOM解析
- Hidden input からメタデータ抽出
- メール本文の取得（複数パターン対応）
- 添付ファイル情報の抽出
- 日本語文字エンコーディング対応

### DTO変換 (`adapters/internal-mail/mapper.ts`)

- InternalMailDTO → GmailLikeDTO 変換
- スレッドのグループ化
- Gmail風ヘッダー生成
- Base64エンコーディング
- 添付ファイルのマルチパート対応

### API Route (`pages/api/import-internal.ts`)

- 3つのモード対応（scrape/direct/sync）
- リアルタイムスクレイピング実行
- ca-support2システムへの取り込み
- 重複チェックとエラーハンドリング
- 詳細な実行結果レポート

## 🔗 ca-support2 連携

現在の api/import-internal.ts では、ca-support2 システムへの実際の取り込み部分は TODO として残されています。既存の ca-support2 システムの仕様に合わせて以下の関数を実装してください：

- `checkExistingThread()` - 既存スレッドの重複チェック
- `checkExistingMessage()` - 既存メッセージの重複チェック  
- `saveThread()` - スレッドの保存
- `saveMessage()` - メッセージの保存

## 🐛 トラブルシューティング

### よくある問題

1. **ログインエラー**
   - ユーザー名・パスワードを確認
   - Web-CALIBのログインURLが正しいか確認
   - ネットワーク接続を確認

2. **スクレイピングエラー**
   - Web-CALIBのDOM構造変更の可能性
   - セレクタ（`table.list2`等）の確認
   - タイムアウト設定の調整

3. **パース エラー**
   - HTMLの構造変更の可能性
   - Hidden inputの名前属性確認
   - 文字エンコーディングの確認

### デバッグ方法

```bash
# ヘッドレスモードOFFでブラウザ表示
export WEBCALIB_HEADLESS=false
pnpm sync:internal

# 詳細ログ表示
DEBUG=1 pnpm sync:internal
```

## 🚧 今後の拡張予定

- [ ] 添付ファイルのダウンロード機能
- [ ] リアルタイム同期（Webhook対応）
- [ ] Docker化とCI/CD対応
- [ ] メール分類とラベリング自動化
- [ ] 差分同期（増分更新）
- [ ] パフォーマンス最適化

## 📝 注意事項

- Web-CALIBの利用規約を遵守してください
- スクレイピング頻度を適切に制限してください
- 認証情報は安全に管理してください
- 本プロダクションでの使用前に十分なテストを実施してください

## 🤝 貢献

バグレポートや機能改善の提案は Issue または Pull Request でお待ちしています。

## �� ライセンス

ISC License 