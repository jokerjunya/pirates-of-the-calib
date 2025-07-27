import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Web-CALIB メール一覧ページの再現
 * 既存スクレイピングロジックが期待する table.list2 構造を含む
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // jobseekerNoパラメータを取得（e-mail検索から渡される）
  const { jobseekerNo } = req.query;
  console.log(`📧 メール一覧要求: jobseekerNo=${jobseekerNo}`);

  // デモメールデータ（少数から開始）
  const demoMails = [
    {
      id: 'DEMO001',
      subject: '面談日時の件について',
      href: '/webcalib/app/message_management33_view?messageId=DEMO001&messageNo=001&jobseekerNo=J025870',
      sender: 'リクルートエージェント',
      recipient: 'yuya_inagaki+005@r.recruit.co.jp',
      processDate: '24/12/25 08:07',
      createDate: '24/12/25 08:00',
      size: '2.1KB',
      status: '未読'
    },
    {
      id: 'DEMO002',
      subject: '選考結果のご連絡',
      href: '/webcalib/app/message_management33_view?messageId=DEMO002&messageNo=002&jobseekerNo=J025870',
      sender: '株式会社サンプル採用担当',
      recipient: 'yuya_inagaki+005@r.recruit.co.jp',
      processDate: '24/12/24 15:30',
      createDate: '24/12/24 15:25',
      size: '1.8KB',
      status: '既読'
    },
    {
      id: 'DEMO003',
      subject: '新着求人のご紹介 - エンジニア職',
      href: '/webcalib/app/message_management33_view?messageId=DEMO003&messageNo=003&jobseekerNo=J025870',
      sender: 'リクルートエージェント',
      recipient: 'yuya_inagaki+005@r.recruit.co.jp',
      processDate: '24/12/23 10:15',
      createDate: '24/12/23 10:10',
      size: '3.2KB',
      status: '未読'
    }
  ];

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
        .list2 { width: 100%; border-collapse: collapse; background-color: white; }
        .list2 th { background-color: #e0e0e0; padding: 8px; border: 1px solid #ccc; font-size: 12px; }
        .list2 td { padding: 6px; border: 1px solid #ccc; font-size: 11px; }
        .list2 tr:nth-child(even) { background-color: #f9f9f9; }
        .list2 a { color: #0066cc; text-decoration: none; }
        .list2 a:hover { text-decoration: underline; }
        .demo-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Web-CALIB メッセージ管理 (デモサイト)</h1>
    </div>
    
    <div class="container">
        <div class="demo-notice">
            <strong>📧 デモサイト情報:</strong> 
            現在${demoMails.length}件のデモメールを表示中です。既存スクレイピングロジックとの互換性確認用です。
        </div>
        
        <!-- スクレイピングロジック対応：本番サイト構造に合わせたテーブル -->
        <table class="list2">
            <thead>
                <tr>
                    <th></th>
                    <th>コミュ</th>
                    <th>未読</th>
                    <th>件名</th>
                    <th>送信者</th>
                    <th>受信者</th>
                    <th>日付</th>
                    <th>メモ</th>
                    <th>処理日時</th>
                    <th>作成日時</th>
                    <th>サイズ</th>
                    <th>状態</th>
                </tr>
            </thead>
            <tbody>
                ${demoMails.map((mail, index) => `
                <tr>
                    <td><input type="checkbox" /></td>
                    <td>-</td>
                    <td>${mail.status === '未読' ? '●' : ''}</td>
                    <td><a href="${mail.href}">${mail.subject}</a></td>
                    <td>${mail.sender}</td>
                    <td>${mail.recipient}</td>
                    <td>${mail.processDate}</td>
                    <td>-</td>
                    <td>${mail.processDate}</td>
                    <td>${mail.createDate}</td>
                    <td>${mail.size}</td>
                    <td>${mail.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; color: #666; font-size: 12px;">
            <p>※ これはWeb-CALIBデモサイトです。実際のメールデータではありません。</p>
            <p>スクレイピングテスト用のダミーデータを表示しています。</p>
        </div>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(mailListHtml);
} 