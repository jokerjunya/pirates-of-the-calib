#!/bin/bash

# Web-CALIB メールスクレイピングシステム 簡単起動スクリプト
# Usage: ./start.sh [option]

set -e

# カラー定義
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo -e "${CYAN}🚀 Web-CALIB メールスクレイピングシステム${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./start.sh [option]"
    echo ""
    echo "オプション:"
    echo "  setup     初回セットアップ (依存関係インストール + 環境設定)"
    echo "  quick     クイックスタート (環境チェック + 起動)"
    echo "  dev       開発サーバー起動"
    echo "  demo      デモサイト同期テスト"
    echo "  help      このヘルプを表示"
    echo ""
    echo "例:"
    echo "  ./start.sh setup    # 初回セットアップ"
    echo "  ./start.sh quick    # クイックスタート"
    echo ""
    echo "🔧 トラブルシューティング:"
    echo "  環境変数エラーが発生した場合："
    echo "  - quickオプション使用時に自動修復メニューが表示されます"
    echo "  - デバッグモードで詳細な診断情報を確認できます"
    echo "  - node scripts/check-env.cjs --debug で手動デバッグ可能"
    echo ""
    echo "📧 起動後のアクセス:"
    echo "  - ダッシュボード: http://localhost:3000/sync-dashboard"
    echo "  - デモサイト同期: 緑色の「デモサイト同期」ボタン"
    echo "  - 本番サイト同期: 青色の「本番サイト同期」ボタン"
    echo ""
}

# Node.js/pnpmチェック
check_requirements() {
    echo -e "${BLUE}🔍 システム要件をチェック中...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js が見つかりません${NC}"
        echo "Node.js をインストールしてください: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}⚠️  pnpm が見つかりません。npmを使用します${NC}"
        PACKAGE_MANAGER="npm"
    else
        PACKAGE_MANAGER="pnpm"
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    echo -e "${GREEN}✅ パッケージマネージャー: $PACKAGE_MANAGER${NC}"
    echo ""
}

# セットアップ実行
run_setup() {
    echo -e "${CYAN}🛠️  初回セットアップを開始...${NC}"
    echo ""
    
    # 依存関係インストール
    echo -e "${BLUE}📦 依存関係をインストール中...${NC}"
    $PACKAGE_MANAGER install
    
    # Playwright ブラウザインストール
    echo -e "${BLUE}🌐 Playwright ブラウザをインストール中...${NC}"
    $PACKAGE_MANAGER playwright install chromium
    
    # 環境変数テンプレート作成
    echo -e "${BLUE}🔧 環境変数テンプレートを作成中...${NC}"
    node scripts/create-env.cjs
    
    echo ""
    echo -e "${GREEN}✅ セットアップ完了！${NC}"
    echo ""
    echo -e "${YELLOW}📝 次のステップ:${NC}"
    echo "   1. .env.local ファイルを編集して実際の値を設定"
    echo "   2. ./start.sh quick でアプリを起動"
}

# クイックスタート実行
run_quick_start() {
    echo -e "${CYAN}🚀 クイックスタートを開始...${NC}"
    echo ""
    
    # 環境変数チェック
    echo -e "${BLUE}🔍 環境変数をチェック中...${NC}"
    if ! node scripts/check-env.cjs; then
        echo ""
        echo -e "${RED}❌ 環境変数チェックが失敗しました${NC}"
        echo ""
        
        # デバッグ情報の提供
        echo -e "${YELLOW}🔧 デバッグ情報:${NC}"
        echo "   現在のディレクトリ: $(pwd)"
        echo "   .env.local ファイル存在: $([ -f .env.local ] && echo '✅ あり' || echo '❌ なし')"
        
        if [ -f .env.local ]; then
            echo "   .env.local ファイルサイズ: $(wc -c < .env.local) bytes"
            echo "   .env.local の先頭5行:"
            head -5 .env.local | sed 's/^/     /'
            echo ""
            
            # 自動修復を提案
            echo -e "${CYAN}🛠️  自動修復を試行しますか？${NC}"
            echo "   1. 環境チェックスクリプトを再実行"
            echo "   2. 環境チェックスクリプトをデバッグモードで再実行"
            echo "   3. 強制的に開発サーバーを起動"
            echo "   4. セットアップからやり直し"
            echo ""
            read -p "選択してください (1/2/3/4/n): " choice
            
            case "$choice" in
                1)
                    echo -e "${BLUE}🔄 環境チェックスクリプトを再実行中...${NC}"
                    node scripts/check-env.cjs || {
                        echo -e "${RED}❌ 再実行も失敗しました${NC}"
                        echo -e "${YELLOW}💡 環境チェックをスキップして起動を続行しますか？ (y/n)${NC}"
                        read -p "" force_start
                        if [ "$force_start" = "y" ] || [ "$force_start" = "Y" ]; then
                            echo -e "${YELLOW}⚠️  環境チェックをスキップして起動します${NC}"
                        else
                            echo -e "${RED}起動を中止します${NC}"
                            exit 1
                        fi
                    }
                    ;;
                2)
                    echo -e "${BLUE}🐛 環境チェックスクリプトをデバッグモードで再実行中...${NC}"
                    node scripts/check-env.cjs --debug || {
                        echo -e "${RED}❌ デバッグモードでも失敗しました${NC}"
                        echo -e "${YELLOW}💡 上記のデバッグ情報を確認して .env.local を修正してください${NC}"
                        echo -e "${YELLOW}💡 環境チェックをスキップして起動を続行しますか？ (y/n)${NC}"
                        read -p "" force_start
                        if [ "$force_start" = "y" ] || [ "$force_start" = "Y" ]; then
                            echo -e "${YELLOW}⚠️  環境チェックをスキップして起動します${NC}"
                        else
                            echo -e "${RED}起動を中止します${NC}"
                            exit 1
                        fi
                    }
                    ;;
                3)
                    echo -e "${YELLOW}⚠️  環境チェックをスキップして起動します${NC}"
                    ;;
                4)
                    echo -e "${BLUE}🛠️  セットアップを実行します...${NC}"
                    run_setup
                    return
                    ;;
                *)
                    echo -e "${RED}起動を中止します${NC}"
                    echo ""
                    echo -e "${CYAN}💡 ヒント:${NC}"
                    echo "   - ./start.sh setup で初回セットアップを実行"
                    echo "   - ./start.sh help でヘルプを表示"
                    exit 1
                    ;;
            esac
        else
            echo -e "${RED}❌ .env.local ファイルが見つかりません${NC}"
            echo ""
            echo -e "${CYAN}🛠️  初回セットアップを実行しますか？ (y/n)${NC}"
            read -p "" setup_choice
            if [ "$setup_choice" = "y" ] || [ "$setup_choice" = "Y" ]; then
                run_setup
                return
            else
                echo -e "${RED}起動を中止します${NC}"
                exit 1
            fi
        fi
    fi
    
    # 開発サーバー起動
    echo ""
    echo -e "${BLUE}🌐 開発サーバーを起動中...${NC}"
    echo -e "${GREEN}📧 ダッシュボード: http://localhost:3000/sync-dashboard${NC}"
    echo ""
    $PACKAGE_MANAGER dev
}

# 開発サーバー起動
run_dev() {
    echo -e "${CYAN}🌐 開発サーバーを起動...${NC}"
    $PACKAGE_MANAGER dev
}

# デモサイト同期テスト
run_demo() {
    echo -e "${CYAN}🎯 デモサイト同期テストを実行...${NC}"
    echo ""
    echo -e "${BLUE}📧 ダッシュボードにアクセスして「デモサイト同期」ボタンをクリックしてください${NC}"
    echo -e "${GREEN}URL: http://localhost:3000/sync-dashboard${NC}"
    run_dev
}

# メイン処理
main() {
    # システム要件チェック
    check_requirements
    
    case "$1" in
        setup)
            run_setup
            ;;
        quick)
            run_quick_start
            ;;
        dev)
            run_dev
            ;;
        demo)
            run_demo
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            echo -e "${YELLOW}オプションが指定されていません。ヘルプを表示します:${NC}"
            echo ""
            show_help
            ;;
        *)
            echo -e "${RED}❌ 不明なオプション: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@" 