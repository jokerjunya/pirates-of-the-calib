import type { NextApiRequest, NextApiResponse } from 'next';
import { loadCompanyEmails, getAvailableCompanyChains } from '../../../../lib/email-data-loader';

/**
 * Web-CALIB メール一覧ページの再現
 * 既存スクレイピングロジックが期待する table.list2 構造を含む
 * 編集可能なJSONデータから時系列順（昇順）でA社選考プロセスを表示
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // jobseekerNoパラメータを取得（e-mail検索から渡される）
  const { jobseekerNo } = req.query;
  console.log(`📧 メール一覧要求: jobseekerNo=${jobseekerNo}`);

  try {
    // 📅 修正: JSONファイルからデータを読み込み、時系列順（昇順）で取得
    const demoMails = loadCompanyEmails('chain_001');
    const companyChains = getAvailableCompanyChains();
    const currentChain = companyChains[0]; // A社チェーンを使用
    
    console.log(`✨ ${demoMails.length}件のA社選考プロセスメール（時系列順）を読み込みました`);

    // カテゴリ別統計を計算
    const categoryStats = demoMails.reduce((stats, mail) => {
      stats[mail.category] = (stats[mail.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // 未読メール数を計算
    const unreadCount = demoMails.filter(mail => mail.status === '未読').length;

    // フロー別統計を計算
    const flowStats = demoMails.reduce((stats, mail) => {
      stats[mail.flow] = (stats[mail.flow] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // 緊急度別統計
    const urgencyStats = demoMails.reduce((stats, mail) => {
      stats[mail.urgency] = (stats[mail.urgency] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // Web-CALIBメール一覧画面のHTML構造を再現
    const mailListHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB メッセージ管理</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; }
        .header { background-color: #0066cc; color: white; padding: 10px; text-align: center; }
        .container { padding: 20px; }
        .list2 { width: 100%; border-collapse: collapse; background-color: white; margin-top: 10px; }
        .list2 th { background-color: #e0e0e0; padding: 8px; border: 1px solid #ccc; font-size: 12px; }
        .list2 td { padding: 6px; border: 1px solid #ccc; font-size: 11px; }
        .list2 tr:nth-child(even) { background-color: #f9f9f9; }
        .list2 tr.unread { background-color: #fff8dc; font-weight: bold; }
        .list2 tr.high-priority { border-left: 4px solid #ff4444; }
        .list2 a { color: #0066cc; text-decoration: none; }
        .list2 a:hover { text-decoration: underline; }
        .demo-notice { background-color: #e8f5e8; border: 1px solid #4caf50; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        .stats-panel { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
        .stat-item { background: white; padding: 8px; border-radius: 3px; text-align: center; }
        .stat-item.high { background: #fff0f0; border-left: 3px solid #ff4444; }
        .company-info { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 15px; border-radius: 4px; }
        .flow-indicator { font-size: 10px; background: #007bff; color: white; padding: 2px 6px; border-radius: 10px; margin-right: 5px; }
        .urgency-high { color: #ff4444; font-weight: bold; }
        .data-source-info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 12px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Web-CALIB メッセージ管理 (編集可能デモサイト)</h1>
    </div>
    
    <div class="container">
        <div class="demo-notice">
            <strong>🎯 A社選考プロセス完全再現:</strong> 
            <strong>${currentChain.companyName}</strong>の<strong>${currentChain.position}</strong>職について、
            <strong>${demoMails.length}件</strong>のリアルなメールフローを<strong>時系列順（古い順）</strong>で表示中です。
            <br>
            <small>
            📅 時系列表示: ${demoMails[0]?.date} ～ ${demoMails[demoMails.length - 1]?.date}（古い順）
            </small>
        </div>
        
        <!-- データソース情報パネル -->
        <div class="data-source-info">
            <strong>📝 データソース:</strong> 
            <code>data/a-company-emails.json</code> - メールデータが編集可能になりました！
            <br>
            <small>
            💡 メール内容を変更したい場合は、上記JSONファイルを編集してページをリロードしてください
            </small>
        </div>
        
        <!-- 企業情報パネル -->
        <div class="company-info">
            <strong>🏢 選考企業情報:</strong><br>
            企業名: <strong>${currentChain.companyName}</strong> | 
            職種: <strong>${currentChain.position}</strong> | 
            ステータス: <strong>${currentChain.status === 'ongoing' ? '選考中' : currentChain.status}</strong> | 
            メール数: <strong>${currentChain.mailCount}件</strong>
        </div>
        
        <!-- 統計パネル -->
        <div class="stats-panel">
            <strong>📊 メールフロー統計</strong>
            <div class="stats-grid">
                <div class="stat-item">
                    <div>📧 総メール数</div>
                    <div><strong>${demoMails.length}</strong></div>
                </div>
                <div class="stat-item ${unreadCount > 0 ? 'high' : ''}">
                    <div>🔔 未読</div>
                    <div><strong>${unreadCount}</strong></div>
                </div>
                <div class="stat-item ${urgencyStats.high > 0 ? 'high' : ''}">
                    <div>🚨 緊急</div>
                    <div><strong>${urgencyStats.high || 0}</strong></div>
                </div>
                <div class="stat-item">
                    <div>🤝 面接関連</div>
                    <div><strong>${categoryStats.interview_process || 0}</strong></div>
                </div>
                <div class="stat-item">
                    <div>❓ Q&A</div>
                    <div><strong>${categoryStats.question_answer || 0}</strong></div>
                </div>
                <div class="stat-item">
                    <div>📋 結果通知</div>
                    <div><strong>${categoryStats.result_notification || 0}</strong></div>
                </div>
                <div class="stat-item">
                    <div>🔄 RA→CA</div>
                    <div><strong>${flowStats['RA→CA'] || 0}</strong></div>
                </div>
                <div class="stat-item">
                    <div>👤 CA→CS</div>
                    <div><strong>${flowStats['CA→CS'] || 0}</strong></div>
                </div>
            </div>
        </div>
        
        <!-- スクレイピングロジック対応：本番サイト構造に合わせたテーブル -->
        <table class="list2">
            <thead>
                <tr>
                    <th width="30"></th>
                    <th width="50">コミュ</th>
                    <th width="40">未読</th>
                    <th width="350">件名</th>
                    <th width="130">送信者</th>
                    <th width="130">受信者</th>
                    <th width="100">処理日時</th>
                    <th width="40">メモ</th>
                    <th width="100">作成日時</th>
                    <th width="50">サイズ</th>
                    <th width="50">状態</th>
                </tr>
            </thead>
            <tbody>
                ${demoMails.map((mail, index) => `
                <tr class="${mail.status === '未読' ? 'unread' : ''} ${mail.urgency === 'high' ? 'high-priority' : ''}">
                    <td><input type="checkbox" /></td>
                    <td>-</td>
                    <td>${mail.status === '未読' ? '●' : ''}</td>
                    <td>
                        <span class="flow-indicator">${mail.flow}</span>
                        <a href="/api/mock-webcalib${mail.href}" title="${mail.subject}">
                            ${mail.subject.length > 50 ? mail.subject.substring(0, 50) + '...' : mail.subject}
                        </a>
                        ${mail.urgency === 'high' ? '<span class="urgency-high">⚡</span>' : ''}
                        ${mail.attachments.length > 0 ? ' 📎' : ''}
                        <small style="color: #666;">(Step ${mail.step})</small>
                    </td>
                    <td title="${mail.sender}">${mail.sender.length > 18 ? mail.sender.substring(0, 18) + '...' : mail.sender}</td>
                    <td title="${mail.recipient}">${mail.recipient.includes('@') ? mail.recipient.split('@')[0] + '...' : mail.recipient}</td>
                    <td>${mail.processDate}</td>
                    <td>-</td>
                    <td>${mail.createDate}</td>
                    <td>${mail.size}</td>
                    <td>${mail.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; color: #666; font-size: 12px;">
            <p><strong>🔄 編集可能デモサイト特徴:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
                <li><strong>📝 編集可能:</strong> <code>data/a-company-emails.json</code>でメール内容を自由に変更</li>
                <li><strong>📅 時系列表示:</strong> 実際のメールのように古い順（昇順）で表示</li>
                <li><strong>📊 データ分離:</strong> ページロジックとデータが分離され、保守しやすい構成</li>
                <li><strong>🔄 実際のフロー:</strong> RA→CA→CS→CAの実際のメールフローを時系列で再現</li>
                <li><strong>🎯 互換性:</strong> 既存スクレイピングロジックとの完全互換性確保</li>
            </ul>
            <p><small>※ これは編集可能なWeb-CALIBデモサイトです。実際の${currentChain.companyName}のメールデータではありません。</small></p>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(mailListHtml);

  } catch (error) {
    console.error('❌ メールデータの読み込みに失敗:', error);
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>エラー - データ読み込み失敗</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; text-align: center; }
        .error-container { background-color: white; padding: 20px; border: 1px solid #ccc; margin: 50px auto; max-width: 600px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h2>❌ メールデータの読み込みに失敗しました</h2>
        <p>JSONファイル <code>data/a-company-emails.json</code> の読み込みでエラーが発生しました。</p>
        <p><strong>エラー詳細:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p>ファイルの形式が正しいか確認してください。</p>
    </div>
</body>
</html>`);
  }
} 