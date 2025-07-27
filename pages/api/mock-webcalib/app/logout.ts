import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Web-CALIB ログイン画面の再現
 * 実際のWeb-CALIBでは /logout URLがログイン画面として機能する
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // GETリクエストのみ対応（ログイン画面表示）
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Web-CALIBログイン画面のHTML構造を再現
  const loginPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>Web-CALIB システム ログイン</title>
    <style>
        body { font-family: MS PGothic, sans-serif; background-color: #f0f0f0; }
        .login-container { width: 400px; margin: 100px auto; background: white; padding: 20px; border: 1px solid #ccc; }
        .login-title { text-align: center; font-size: 18px; margin-bottom: 20px; color: #333; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ccc; font-size: 14px; }
        .login-button { width: 100%; padding: 10px; background-color: #0066cc; color: white; border: none; font-size: 14px; cursor: pointer; }
        .login-button:hover { background-color: #0052a3; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-title">Web-CALIB システム</div>
        
        <!-- 既存スクレイピングロジックが期待するフォーム構造 -->
        <form method="post" action="/api/mock-webcalib/auth/login">
            <div class="form-group">
                <label for="username">ユーザー名:</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">パスワード:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <div class="form-group">
                <button type="submit" class="login-button">ログイン</button>
            </div>
        </form>
        
        <!-- デバッグ情報（本番では削除） -->
        <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; font-size: 12px;">
            <strong>デモサイト情報:</strong><br>
            ユーザー名: 7777319<br>
            パスワード: password1!<br>
            <em>※ これはデモサイトです</em>
        </div>
    </div>
</body>
</html>`;

  // Content-Typeを適切に設定
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(loginPageHtml);
} 