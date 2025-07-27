import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Web-CALIB 認証処理
 * ログイン後のリダイレクト処理を再現
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  // デモ用の認証チェック（実際のWeb-CALIBの認証情報）
  if (username === '7777319' && password === 'password1!') {
    // 認証成功 - メール一覧ページにリダイレクト
    // 実際のWeb-CALIBの動作を模倣してHTMLレスポンスを返す
    const successPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>ログイン成功</title>
    <meta http-equiv="refresh" content="1;url=/api/mock-webcalib/app/message_management33_list">
</head>  
<body>
    <div style="text-align: center; margin-top: 100px;">
        <h2>ログインしています...</h2>
        <p>メール管理画面に移動しています。</p>
        <p><a href="/api/mock-webcalib/app/message_management33_list">手動で移動する場合はこちら</a></p>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(successPageHtml);
    
  } else {
    // 認証失敗 - ログイン画面に戻る
    const errorPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="Shift_JIS">
    <title>ログインエラー</title>
    <meta http-equiv="refresh" content="3;url=/api/mock-webcalib/app/logout">
</head>
<body>
    <div style="text-align: center; margin-top: 100px;">
        <h2 style="color: red;">ログインに失敗しました</h2>
        <p>ユーザー名またはパスワードが正しくありません。</p>
        <p>3秒後にログイン画面に戻ります...</p>
        <p><a href="/api/mock-webcalib/app/logout">すぐに戻る場合はこちら</a></p>
        
        <div style="margin-top: 20px; color: #666;">
            <small>デモ用認証情報: 7777319 / password1!</small>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(401).send(errorPageHtml);
  }
} 