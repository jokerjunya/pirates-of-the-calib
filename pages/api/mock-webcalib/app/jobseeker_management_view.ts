import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Web-CALIB e-mail検索ページの再現
 * 既存スクレイピングロジックが期待するjobseeker_management_view構造を提供
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  
  // GET: 検索画面表示
  if (req.method === 'GET') {
    const searchPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB 求職者管理</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .container { background-color: white; padding: 20px; border: 1px solid #ccc; max-width: 600px; margin: 0 auto; }
        .header { background-color: #0066cc; color: white; padding: 15px; text-align: center; margin-bottom: 20px; }
        .search-form { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-group input { width: 300px; padding: 8px; border: 1px solid #ccc; font-size: 14px; }
        .search-button { padding: 10px 20px; background-color: #0066cc; color: white; border: none; font-size: 14px; cursor: pointer; }
        .search-button:hover { background-color: #0052a3; }
        .demo-notice { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>求職者管理システム - e-mail検索</h1>
        </div>
        
        <div class="demo-notice">
            <strong>🔍 デモサイト - e-mail検索:</strong> 
            下記のフォームで求職者のe-mailアドレスを検索できます。
        </div>
        
        <!-- 既存スクレイピングロジックが期待するフォーム構造 -->
        <div class="search-form">
            <form method="post" action="/api/mock-webcalib/app/jobseeker_management_view">
                <div class="form-group">
                    <label for="email">e-mailアドレス:</label>
                    <input type="email" 
                           id="email" 
                           name="email" 
                           placeholder="例: yuya_inagaki+005@r.recruit.co.jp"
                           required>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="search-button" name="search" value="検索">
                        🔍 検索
                    </button>
                </div>
            </form>
        </div>
        
        <!-- デバッグ情報 -->
        <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7; font-size: 12px;">
            <strong>📧 デモ検索情報:</strong><br>
            デフォルト検索e-mail: yuya_inagaki+005@r.recruit.co.jp<br>
            検索後のjobseekerNo: J025870 (自動生成)<br>
            <em>※ これはWeb-CALIBデモサイトです</em>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(searchPageHtml);
    
  } 
  // POST: 検索実行・結果表示
  else if (req.method === 'POST') {
    const { email } = req.body;
    
    // デモ用jobseekerNo生成（実際のWeb-CALIBではDBから取得）
    const demoJobseekerNo = 'J025870';
    
    const searchResultHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB 求職者検索結果</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .result-container { background-color: white; padding: 20px; border: 1px solid #ccc; }
        .result-header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
        .jobseeker-info { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; }
        .message-button { 
            background-color: #0066cc; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block;
            margin: 10px 5px;
        }
        .message-button:hover { background-color: #0052a3; }
        .demo-notice { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="demo-notice">
        <strong>📧 デモサイト検索結果:</strong> 
        検索されたe-mail: <code>${email}</code> | 求職者番号: <code>${demoJobseekerNo}</code>
    </div>
    
    <div class="result-container">
        <div class="result-header">
            <h2>🔍 求職者検索結果</h2>
        </div>
        
        <div class="jobseeker-info">
            <p><strong>求職者番号:</strong> ${demoJobseekerNo}</p>
            <p><strong>検索対象e-mail:</strong> ${email}</p>
            <p><strong>検索結果:</strong> 1件見つかりました</p>
        </div>
        
        <div>
            <a href="/webcalib/app/message_management33_list?jobseekerNo=${demoJobseekerNo}" 
               class="message-button" 
               id="messageManagementButton"
               target="_blank">📧 メッセージ管理</a>
        </div>
        
        <div style="margin-top: 20px; color: #666; font-size: 12px;">
            <p>※ これはWeb-CALIBデモサイトです。実際の求職者データではありません。</p>
        </div>
    </div>
</body>
</html>
        `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(searchResultHtml);
    
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
} 