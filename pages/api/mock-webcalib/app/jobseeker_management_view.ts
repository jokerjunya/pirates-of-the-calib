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
        .container { background-color: white; padding: 20px; border: 1px solid #ccc; max-width: 600px; margin: 0 auto; }
        .header { background-color: #0066cc; color: white; padding: 15px; text-align: center; margin-bottom: 20px; }
        .result-info { padding: 15px; background-color: #d4edda; border: 1px solid #c3e6cb; margin-bottom: 20px; }
        .jobseeker-info { padding: 15px; background-color: #f8f9fa; border: 1px solid #dee2e6; margin-bottom: 20px; }
        .action-buttons { text-align: center; margin-top: 20px; }
        .message-button { padding: 12px 25px; background-color: #28a745; color: white; border: none; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; margin: 0 10px; }
        .message-button:hover { background-color: #218838; color: white; }
        .back-button { padding: 12px 25px; background-color: #6c757d; color: white; border: none; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; }
        .back-button:hover { background-color: #5a6268; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>求職者検索結果</h1>
        </div>
        
        <div class="result-info">
            <strong>✅ 検索完了:</strong> 該当する求職者が見つかりました
        </div>
        
        <!-- 既存スクレイピングロジックが期待するjobseekerNo情報 -->
        <div class="jobseeker-info">
            <h3>📋 求職者情報</h3>
            <p><strong>e-mailアドレス:</strong> ${email || 'yuya_inagaki+005@r.recruit.co.jp'}</p>
            <p><strong>求職者番号:</strong> <span class="jobseeker-no">${demoJobseekerNo}</span></p>
            <p><strong>氏名:</strong> 稲垣 雄也</p>
            <p><strong>登録日:</strong> 2024-01-15</p>
        </div>
        
        <!-- Hidden inputs（スクレイピングロジックが期待するDOM構造） -->
        <input type="hidden" name="jobseekerNo" value="${demoJobseekerNo}">
        <input type="hidden" name="email" value="${email || 'yuya_inagaki+005@r.recruit.co.jp'}">
        
        <!-- スクレイピングロジックが期待するメッセージ管理ボタン -->
        <div class="action-buttons">
            <a href="/webcalib/app/message_management33_list?jobseekerNo=${demoJobseekerNo}" 
               class="message-button"
               id="messageManagementButton">
               📧 メッセージ管理
            </a>
            
            <a href="/api/mock-webcalib/app/jobseeker_management_view" 
               class="back-button">
               ← 検索に戻る
            </a>
        </div>
        
        <!-- デバッグ情報 -->
        <div style="margin-top: 30px; padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; font-size: 12px;">
            <strong>🎯 スクレイピング用情報:</strong><br>
            jobseekerNo: ${demoJobseekerNo}<br>
            URL Parameter: jobseekerNo=${demoJobseekerNo}<br>
            <em>※ 既存スクレイピングロジックがこの情報を自動取得します</em>
        </div>
    </div>
    
    <!-- URLパラメータとしてjobseekerNoを含める（JavaScript経由で更新） -->
    <script>
    // スクレイピングロジックが期待するURL構造を提供
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('jobseekerNo', '${demoJobseekerNo}');
    window.history.replaceState({}, '', currentUrl.toString());
    
    // ページ内テキストにjobseekerNoを含める（スクレイピング検出用）
    document.body.innerHTML += '<div style="display:none;">JobseekerNo: ${demoJobseekerNo}</div>';
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(searchResultHtml);
    
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
} 