import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Web-CALIB メール詳細ページの再現
 * 既存パーサーロジックが期待するHTML構造を含む
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messageId } = req.query;

  // デモメール詳細データ
  const demoMailDetails: { [key: string]: any } = {
    'DEMO001': {
      id: 'DEMO001',
      subject: '面談日時の件について',
      from: 'リクルートエージェント <19703@r-agent.com>',
      to: 'yuya_inagaki+005@r.recruit.co.jp',
      date: '24/12/25 08:07',
      body: `
稲垣様

いつもお世話になっております。
リクルートエージェントの田中です。

先日お話しさせていただいた株式会社〇〇の面談の件でご連絡いたします。

■面談詳細
日時：2024年12月28日（土）14:00-15:00
場所：オンライン（Teams）
面談官：技術部長 山田様

準備していただきたい資料：
・履歴書・職務経歴書
・ポートフォリオ
・質問事項（あれば）

何かご不明な点がございましたら、お気軽にご連絡ください。

よろしくお願いいたします。

リクルートエージェント
田中 太郎
`,
      attachments: []
    },
    'DEMO002': {
      id: 'DEMO002',
      subject: '選考結果のご連絡',
      from: '株式会社サンプル採用担当 <hr@sample-corp.com>',
      to: 'yuya_inagaki+005@r.recruit.co.jp',
      date: '24/12/24 15:30',
      body: `
稲垣 雄也様

この度は弊社の選考にご応募いただき、誠にありがとうございました。
人事部の佐藤です。

先日実施いたしました一次面接の結果についてご連絡いたします。

慎重に検討させていただいた結果、誠に残念ながら今回は見送らせていただくこととなりました。

今回の結果となりました理由は以下の通りです：
・技術スキルは十分であるものの、今回の求める経験領域とのマッチング
・チーム開発経験の部分で、より経験豊富な方を優先したこと

なお、今後別のポジションで適性が合致する可能性もございますので、
その際は改めてご連絡させていただく場合もございます。

末筆ながら、稲垣様の今後のご活躍をお祈り申し上げます。

株式会社サンプル
人事部 佐藤 花子
`,
      attachments: []
    },
    'DEMO003': {
      id: 'DEMO003', 
      subject: '新着求人のご紹介 - エンジニア職',
      from: 'リクルートエージェント <system@r-agent.com>',
      to: 'yuya_inagaki+005@r.recruit.co.jp',
      date: '24/12/23 10:15',
      body: `
稲垣様

リクルートエージェントです。
あなたのご希望に合致する新着求人をご紹介いたします。

■求人情報
企業名：株式会社テックイノベーション
職種：フルスタックエンジニア
年収：500-700万円
勤務地：東京都渋谷区（リモートワーク可）

■業務内容
・Webアプリケーションの設計・開発
・React/Node.js を使用したフロントエンド・バックエンド開発
・AWSを活用したインフラ構築・運用
・チーム開発におけるコードレビュー

■求めるスキル
・JavaScript/TypeScript 実務経験3年以上
・React.js での開発経験
・Git を使用したチーム開発経験
・AWSの基本的な知識

■働き方
・フレックスタイム制
・リモートワーク可（週2日出社）
・副業OK

ご興味がございましたら、お気軽にご連絡ください。

リクルートエージェント
キャリアアドバイザー 鈴木
`,
      attachments: [
        { name: '求人詳細資料.pdf', size: '245KB' }
      ]
    }
  };

  const mailDetail = demoMailDetails[messageId as string];

  if (!mailDetail) {
    return res.status(404).json({ error: 'Mail not found' });
  }

  // Web-CALIBメール詳細画面のHTML構造を再現
  // 既存パーサーが期待するDOM構造を含む
  const mailDetailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB メール詳細</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .mail-container { background-color: white; padding: 20px; border: 1px solid #ccc; }
        .mail-header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
        .mail-info { margin-bottom: 10px; }
        .mail-info label { font-weight: bold; color: #333; min-width: 80px; display: inline-block; }
        .mail-body { border: 1px solid #ddd; padding: 15px; background-color: #fafafa; white-space: pre-wrap; }
        .attachments { margin-top: 20px; padding: 10px; background-color: #f0f0f0; border: 1px solid #ddd; }
        .demo-notice { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="demo-notice">
        <strong>📧 デモメール詳細:</strong> 
        メッセージID: ${mailDetail.id} - 既存パーサーロジックとの互換性確認用
    </div>

    <div class="mail-container">
        <div class="mail-header">
            <h2>メール詳細</h2>
        </div>

        <!-- 既存パーサーが期待するメール情報構造 -->
        <div class="mail-info">
            <label>件名：</label><span class="subject">${mailDetail.subject}</span>
        </div>
        
        <div class="mail-info">
            <label>送信者：</label><span class="from">${mailDetail.from}</span>
        </div>
        
        <div class="mail-info">
            <label>受信者：</label><span class="to">${mailDetail.to}</span>
        </div>
        
        <div class="mail-info">
            <label>日時：</label><span class="date">${mailDetail.date}</span>
        </div>

        <!-- Hidden inputs（Web-CALIBの特徴的な構造） -->
        <input type="hidden" name="messageId" value="${mailDetail.id}">
        <input type="hidden" name="subject" value="${mailDetail.subject}">
        <input type="hidden" name="from" value="${mailDetail.from}">
        <input type="hidden" name="to" value="${mailDetail.to}">
        <input type="hidden" name="date" value="${mailDetail.date}">

        <!-- メール本文 -->
        <div class="mail-body">
${mailDetail.body}
        </div>

        <!-- 添付ファイル（もしあれば） -->
        ${mailDetail.attachments.length > 0 ? `
        <div class="attachments">
            <h4>📎 添付ファイル</h4>
            ${mailDetail.attachments.map(att => `
            <div style="margin: 5px 0;">
                <span>📄 ${att.name} (${att.size})</span>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
            <a href="/api/mock-webcalib/app/message_management33_list" 
               style="color: #0066cc; text-decoration: none; padding: 10px 20px; border: 1px solid #0066cc;">
               ← メール一覧に戻る
            </a>
        </div>
    </div>

    <div style="margin-top: 20px; color: #666; font-size: 12px; text-align: center;">
        <p>※ これはWeb-CALIBデモサイトです。実際のメールデータではありません。</p>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(mailDetailHtml);
} 