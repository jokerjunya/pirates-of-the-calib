# 🎯 Epic: Web-CALIB デモサイト構築

## 📋 背景・目的

現在のWeb-CALIBスクレイピングシステムは実際のサイトでテストしているため、以下の制約があります：

- **データ数が限定的**: 実際のメールデータが少なく、大量データでのテストができない
- **パターンの不足**: 様々な送信者・受信者・件名パターンのテストが困難  
- **エラーシナリオのテスト不足**: ネットワークエラーや異常データの再現が困難

## 🎯 目標

- [x] **互換性**: 既存スクレイピングロジックが**無変更**で動作するデモサイト
- [ ] **大量データ**: 300件以内のリアルなデモメールデータ
- [x] **基本再現**: ログイン・一覧・詳細ページの構造再現
- [ ] **完全再現**: フレームセット構造・認証フローの忠実な再現

## ✅ **Phase 1完了: 基本機能実装**

### 実装済み機能
- **Next.js API Routes**: `/api/mock-webcalib/` 配下
- **ログイン画面**: `/api/mock-webcalib/app/logout` 
- **認証処理**: POST `/api/mock-webcalib/auth/login`
- **メール一覧**: `/api/mock-webcalib/app/message_management33_list`
- **メール詳細**: `/api/mock-webcalib/message-detail?messageId=XXX`
- **3件のデモデータ**: リアルなビジネスシナリオ

### 動作確認済み
- [x] 既存スクレイピングロジックが**ほぼ完全に動作**
- [x] `table.list2` 構造の正確な再現
- [x] ログイン認証処理の成功
- [x] Playwright IE互換性の確保
- [x] メール詳細の解析成功

### 技術仕様
- **URL構造**: `http://localhost:3000/api/mock-webcalib/`
- **認証情報**: username `7777319` / password `password1!`
- **HTML構造**: Web-CALIB特有のDOM構造を忠実に再現
- **文字コード**: Shift_JIS対応
- **IE互換性**: User-Agent対応済み

## 🔧 **Phase 2計画: 完全動作の実現**

### 必要な追加実装
- [ ] **e-mail検索ページ**: `/webcalib/app/jobseeker_management_view`
- [ ] **フレームセット構造**: 13フレーム構造の実装
- [ ] **セッション管理**: より現実的な認証フロー
- [ ] **メール詳細リンク修正**: 現在のリンク先調整

### 優先度: High
1. e-mail検索ページ（スクレイピング完全動作に必須）
2. メール詳細リンクの修正
3. エラーハンドリングの改善

## 📊 **Phase 3計画: データ拡張**

### デモデータ生成
- [ ] **300件のメールデータ**作成スクリプト
- [ ] **多様なパターン**:
  - 送信者: リクルートエージェント、企業担当者、システム通知
  - 件名: 面談予約、選考結果、求人紹介、確認依頼
  - 時系列: 過去1年分の分散データ
  - 添付ファイル: PDF、画像等の多様性

### リアルシナリオ
- **転職活動フロー**: 応募 → 書類選考 → 面談 → 結果
- **エージェント対応**: 初回面談 → 求人紹介 → フォローアップ
- **企業とのやりとり**: 面談調整 → 選考フィードバック → 内定通知

## 🚀 **技術的成果**

### Code Changes
```
 5 files changed, 544 insertions(+)
 create mode 100644 docs/DEMO_SITE_ISSUE.md
 create mode 100644 pages/api/mock-webcalib/app/logout.ts
 create mode 100644 pages/api/mock-webcalib/app/message_management33_list.ts
 create mode 100644 pages/api/mock-webcalib/auth/login.ts
 create mode 100644 pages/api/mock-webcalib/message-detail.ts
```

### Branch Info
- **Feature Branch**: `feature/demo-webcalib-site`
- **Commit**: `c5c7761` - "feat: Web-CALIBデモサイトの基本機能実装"
- **URL**: https://github.com/jokerjunya/pirates-of-the-calib/tree/feature/demo-webcalib-site

## 📋 **Next Actions**

### Immediate (1-2 days)
- [ ] e-mail検索ページの実装
- [ ] 完全スクレイピングテストの実行
- [ ] 基本問題の修正

### Short-term (1 week)  
- [ ] デモデータ生成スクリプト作成
- [ ] 100件規模でのテスト実行
- [ ] パフォーマンス測定

### Medium-term (2-3 weeks)
- [ ] 300件データでの大規模テスト
- [ ] エラーシナリオの実装
- [ ] フレームセット完全再現

## 🎖️ **Contributors**
- Initial implementation: @jokerjunya 
- Testing & validation: @jokerjunya

---

**関連PR**: https://github.com/jokerjunya/pirates-of-the-calib/pull/new/feature/demo-webcalib-site 