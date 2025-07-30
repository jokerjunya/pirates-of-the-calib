import type { NextApiRequest, NextApiResponse } from 'next';
import { loadCompanyEmails, getEmailById } from '../../../lib/email-data-loader';

/**
 * Web-CALIB メール詳細（message-detail）の再現
 * 編集可能なJSONデータから時系列順でA社選考プロセスの詳細を表示
 * 既存互換性維持のためのエンドポイント
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messageId, messageNo, jobseekerNo } = req.query;

  try {
    // 📅 修正: JSONファイルから時系列順データを読み込み、指定メールIDの詳細を取得
    const demoMails = loadCompanyEmails('chain_001');
    const mailDetail = getEmailById(messageId as string, demoMails);

    if (!mailDetail) {
      return res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>メールが見つかりません</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; text-align: center; }
        .error-container { background-color: white; padding: 20px; border: 1px solid #ccc; margin: 50px auto; max-width: 500px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h2>❌ メールが見つかりませんでした</h2>
        <p>指定されたメールID「${messageId}」は存在しません。</p>
        <p><a href="/api/mock-webcalib/app/message_management33_list?jobseekerNo=${jobseekerNo}">← メール一覧に戻る</a></p>
        <p><small>📝 データソース: <code>data/a-company-emails.json</code></small></p>
    </div>
</body>
</html>`);
    }

    // カテゴリ別アイコンを設定
    const categoryIcons = {
      interview_process: '🤝',
      question_answer: '❓',
      result_notification: '📋'
    };

    // フロー情報の解析
    const flowDescription = {
      'RA→CA': 'リクルートエージェント → キャリアアドバイザー',
      'CA→CS': 'キャリアアドバイザー → 求職者',
      'CS→CA': '求職者 → キャリアアドバイザー',
      'CA→RA': 'キャリアアドバイザー → リクルートエージェント'
    }[mailDetail.flow] || mailDetail.flow;

    // Web-CALIBメール詳細（旧形式）の構造を再現
    const mailDetailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB メッセージ詳細（旧互換）</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .mail-container { background-color: white; padding: 20px; border: 1px solid #ccc; border-radius: 4px; }
        .mail-header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
        .mail-info { margin-bottom: 10px; padding: 5px 0; }
        .mail-info label { font-weight: bold; color: #333; min-width: 80px; display: inline-block; }
        .mail-body { border: 1px solid #ddd; padding: 15px; background-color: #fafafa; white-space: pre-wrap; line-height: 1.6; }
        .demo-notice { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        .compatibility-notice { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; color: #721c24; }
        .category-badge { display: inline-block; background: #007bff; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; margin-left: 10px; }
        .navigation { margin-top: 30px; text-align: center; }
        .nav-button { color: #0066cc; text-decoration: none; padding: 10px 20px; border: 1px solid #0066cc; border-radius: 4px; margin: 0 10px; display: inline-block; }
        .nav-button:hover { background-color: #0066cc; color: white; }
        .data-source-info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 12px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="demo-notice">
        <strong>🎯 A社選考プロセス詳細（編集可能・旧互換）:</strong> 
        ${categoryIcons[mailDetail.category]} ${mailDetail.category.toUpperCase()}
        | messageId: <code>${messageId}</code> 
        | Step: <strong>${mailDetail.step}/11</strong>
        <br>
        <small>💡 編集可能なJSONファイルから読み込まれた時系列順メールです</small>
    </div>

    <div class="compatibility-notice">
        <strong>⚠️ 互換性エンドポイント:</strong> 
        これは <code>/message-detail</code> 互換性維持用のエンドポイントです。
        新しいメール詳細は <code>/app/message_management33_view</code> をご利用ください。
    </div>

    <div class="data-source-info">
        <strong>📝 データソース:</strong> 
        <code>data/a-company-emails.json</code> - メール内容を変更したい場合はJSONファイルを編集してください
        <br>
        <small>📅 時系列順: メール全体が古い順に整理されています（${mailDetail.date}）</small>
    </div>

    <div class="mail-container">
        <div class="mail-header">
            <h2>メッセージ詳細管理（互換モード）</h2>
            <span class="category-badge">${categoryIcons[mailDetail.category]} ${mailDetail.category.toUpperCase()}</span>
        </div>

        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
            <strong>📧 フロー情報:</strong> ${flowDescription} | 
            ステップ: ${mailDetail.step}/11 | 
            緊急度: ${mailDetail.urgency === 'high' ? '⚡ 緊急' : mailDetail.urgency === 'low' ? '📅 低' : '📋 標準'}
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
        <input type="hidden" name="messageNo" value="${messageNo}">
        <input type="hidden" name="jobseekerNo" value="${jobseekerNo}">
        <input type="hidden" name="subject" value="${mailDetail.subject}">
        <input type="hidden" name="from" value="${mailDetail.from}">
        <input type="hidden" name="to" value="${mailDetail.to}">
        <input type="hidden" name="date" value="${mailDetail.date}">
        <input type="hidden" name="category" value="${mailDetail.category}">
        <input type="hidden" name="step" value="${mailDetail.step}">
        <input type="hidden" name="flow" value="${mailDetail.flow}">
        <input type="hidden" name="urgency" value="${mailDetail.urgency}">
        <input type="hidden" name="companyName" value="${mailDetail.companyName}">

        <!-- メール本文 -->
        <div class="mail-body">
${mailDetail.body}
        </div>

        <div class="navigation">
            <a href="/api/mock-webcalib/app/message_management33_list?jobseekerNo=${jobseekerNo}" 
               class="nav-button">
               ← メッセージ一覧に戻る
            </a>
            <a href="/api/mock-webcalib/app/message_management33_view?messageId=${messageId}&messageNo=${messageNo}&jobseekerNo=${jobseekerNo}" 
               class="nav-button">
               📈 新形式で表示
            </a>
        </div>
    </div>

    <div style="margin-top: 20px; color: #666; font-size: 12px; text-align: center;">
        <p><strong>🔄 編集可能A社選考プロセス（互換モード）:</strong></p>
        <ul style="list-style: none; padding: 0; margin: 5px 0;">
            <li>• エンドポイント: <code>/message-detail</code>（互換性維持用）</li>
            <li>• カテゴリ: ${mailDetail.category} (${categoryIcons[mailDetail.category]})</li>
            <li>• フロー: ${flowDescription}</li>
            <li>• ステップ: ${mailDetail.step}/11</li>
            <li>• データソース: <code>data/a-company-emails.json</code>（編集可能）</li>
            <li>• 時系列: 古い順に整理されたメールチェーン</li>
        </ul>
        <p><small>※ これは編集可能なWeb-CALIBデモサイト（互換性維持用message-detail）です。</small></p>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(mailDetailHtml);

  } catch (error) {
    console.error('❌ メール詳細データの読み込みに失敗:', error);
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
        <h2>❌ メール詳細データの読み込みに失敗しました</h2>
        <p>JSONファイル <code>data/a-company-emails.json</code> の読み込みでエラーが発生しました。</p>
        <p><strong>エラー詳細:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p>messageId: <code>${messageId}</code></p>
        <p><a href="/api/mock-webcalib/app/message_management33_list?jobseekerNo=${jobseekerNo}">← メール一覧に戻る</a></p>
    </div>
</body>
</html>`);
  }
} 