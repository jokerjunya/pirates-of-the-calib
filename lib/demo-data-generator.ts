/**
 * Web-CALIB デモサイト用メールデータ生成システム
 * 300件以内のリアルなビジネスシナリオに基づくメールデータを生成
 */

// 送信者パターン（リクルートエージェント系）
const RECRUITER_SENDERS = [
  { name: 'リクルートエージェント', email: '19703@r-agent.com', department: 'キャリアアドバイザー' },
  { name: 'リクルートエージェント', email: 'career@r-agent.com', department: 'CA部' },
  { name: 'リクルートエージェント', email: 'support@r-agent.com', department: 'サポート部' },
  { name: 'リクルートエージェント', email: 'system@r-agent.com', department: 'システム部' },
] as const;

// 企業担当者パターン
const COMPANY_SENDERS = [
  { name: '株式会社テックイノベーション', email: 'hr@tech-innovation.co.jp', department: '人事部' },
  { name: '株式会社フューチャーシステムズ', email: 'recruit@future-sys.com', department: '採用担当' },
  { name: '株式会社デジタルソリューション', email: 'jobs@digital-sol.jp', department: '技術部' },
  { name: '株式会社クラウドテック', email: 'careers@cloudtech.co.jp', department: 'HR' },
  { name: '株式会社AIスタートアップ', email: 'hiring@ai-startup.com', department: '採用チーム' },
  { name: '株式会社エンタープライズ', email: 'recruitment@enterprise.co.jp', department: '人材開発部' },
] as const;

// 件名パターン（カテゴリ別）
const SUBJECT_PATTERNS = {
  interview: [
    '面談日時の件について',
    '面接スケジュールのご連絡',
    '一次面接の日程調整について',
    '最終面接のご案内',
    '技術面談の詳細について',
    'オンライン面談のご案内'
  ],
  result: [
    '選考結果のご連絡',
    '書類選考結果について',
    '一次面接結果のお知らせ',
    '最終選考結果について',
    '採用選考の件',
    '内定通知書について'
  ],
  job_intro: [
    '新着求人のご紹介 - エンジニア職',
    'あなたにマッチする求人情報',
    '優良企業の求人をご紹介',
    'フルスタックエンジニア募集のご案内',
    'リモートワーク可能求人のご紹介',
    '年収アップ可能案件のご案内'
  ],
  system: [
    'プロフィール更新のお願い',
    'システムメンテナンスのお知らせ',
    'パスワード変更のご案内',
    '重要なお知らせ - アカウント情報',
    'セキュリティ強化のお知らせ',
    '新機能リリースのご案内'
  ],
  follow_up: [
    'その後いかがでしょうか？',
    '転職活動の進捗確認',
    'キャリア相談の件',
    '今後の方向性について',
    '追加でご質問はございませんか',
    'サポート継続のご案内'
  ]
} as const;

// 個人名パターン
const PERSONAL_NAMES = [
  '田中 太郎', '佐藤 花子', '山田 次郎', '高橋 美咲', '渡辺 健一',
  '中村 優子', '小林 智也', '加藤 麻衣', '吉田 大輔', '山本 結衣',
  '鈴木 和也', '松本 紀子', '井上 雄大', '木村 恵美', '林 慎太郎'
] as const;

// メール本文テンプレート
const EMAIL_TEMPLATES = {
  interview: (recipientName: string, senderName: string, companyName?: string) => `
${recipientName}様

いつもお世話になっております。
${senderName}です。

${companyName ? `${companyName}の面談の件でご連絡いたします。` : '面談の件でご連絡いたします。'}

■面談詳細
日時：2024年${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}月${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}日（${['月', '火', '水', '木', '金', '土'][Math.floor(Math.random() * 6)]}）${String(Math.floor(Math.random() * 8) + 10).padStart(2, '0')}:00-${String(Math.floor(Math.random() * 8) + 11).padStart(2, '0')}:00
場所：${Math.random() > 0.5 ? 'オンライン（Teams/Zoom）' : '弊社会議室'}
${companyName ? `面談官：${companyName} ${['技術部長', '人事部長', 'CTO', 'マネージャー'][Math.floor(Math.random() * 4)]} ${PERSONAL_NAMES[Math.floor(Math.random() * PERSONAL_NAMES.length)]}様` : ''}

準備していただきたい資料：
・履歴書・職務経歴書
・ポートフォリオ
・質問事項（あれば）

何かご不明な点がございましたら、お気軽にご連絡ください。

よろしくお願いいたします。

${senderName}
`,
  
  result: (recipientName: string, senderName: string, isSuccess: boolean) => {
    if (isSuccess) {
      return `
${recipientName}様

この度は弊社の選考にご応募いただき、誠にありがとうございました。
${senderName}です。

先日実施いたしました面接の結果についてご連絡いたします。

慎重に検討させていただいた結果、ぜひ弊社でご活躍いただきたく、
次のステップにお進みいただきたいと思います。

今後の流れについて詳細をご説明させていただきたいため、
改めてお時間をいただければと思います。

引き続きよろしくお願いいたします。

${senderName}
`;
    } else {
      return `
${recipientName}様

この度は弊社の選考にご応募いただき、誠にありがとうございました。
${senderName}です。

先日実施いたしました面接の結果についてご連絡いたします。

慎重に検討させていただいた結果、誠に残念ながら今回は見送らせていただくこととなりました。

今回の結果となりました理由は以下の通りです：
・技術スキルは十分であるものの、今回の求める経験領域とのマッチング
・${['チーム開発経験', 'マネジメント経験', '特定技術の専門性', '業界経験'][Math.floor(Math.random() * 4)]}の部分で、より経験豊富な方を優先したこと

なお、今後別のポジションで適性が合致する可能性もございますので、
その際は改めてご連絡させていただく場合もございます。

末筆ながら、${recipientName}様の今後のご活躍をお祈り申し上げます。

${senderName}
`;
    }
  },
  
  job_intro: (recipientName: string, senderName: string) => `
${recipientName}様

リクルートエージェントです。
あなたのご希望に合致する新着求人をご紹介いたします。

■求人情報
企業名：${COMPANY_SENDERS[Math.floor(Math.random() * COMPANY_SENDERS.length)].name}
職種：${['フルスタックエンジニア', 'フロントエンドエンジニア', 'バックエンドエンジニア', 'DevOpsエンジニア', 'AIエンジニア'][Math.floor(Math.random() * 5)]}
年収：${Math.floor(Math.random() * 500) + 400}-${Math.floor(Math.random() * 300) + 700}万円
勤務地：${['東京都渋谷区', '東京都新宿区', '東京都港区', '大阪府大阪市', '愛知県名古屋市'][Math.floor(Math.random() * 5)]}（リモートワーク${Math.random() > 0.5 ? '可' : '応相談'}）

■業務内容
・Webアプリケーションの設計・開発
・${['React/Vue.js', 'Node.js/Express', 'Python/Django', 'Java/Spring', 'Go'][Math.floor(Math.random() * 5)]} を使用した開発
・${['AWS', 'GCP', 'Azure'][Math.floor(Math.random() * 3)]}を活用したインフラ構築・運用
・チーム開発におけるコードレビュー

■求めるスキル
・${['JavaScript/TypeScript', 'Python', 'Java', 'Go', 'PHP'][Math.floor(Math.random() * 5)]} 実務経験${Math.floor(Math.random() * 5) + 2}年以上
・${['React.js', 'Vue.js', 'Angular', 'Next.js'][Math.floor(Math.random() * 4)]} での開発経験
・Git を使用したチーム開発経験
・${['AWS', 'Docker', 'Kubernetes', 'CI/CD'][Math.floor(Math.random() * 4)]}の基本的な知識

■働き方
・フレックスタイム制
・リモートワーク${Math.random() > 0.3 ? '可' : '応相談'}（週${Math.floor(Math.random() * 3) + 1}日出社）
・副業${Math.random() > 0.5 ? 'OK' : '要相談'}

ご興味がございましたら、お気軽にご連絡ください。

${senderName}
`,

  system: (recipientName: string) => `
${recipientName}様

Web-CALIBシステムよりお知らせいたします。

${Math.random() > 0.5 ? 
`システムメンテナンスのお知らせ

下記の日程でシステムメンテナンスを実施いたします。
メンテナンス時間中はサービスをご利用いただけません。

■メンテナンス日時
2024年${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}月${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}日（${['日', '土'][Math.floor(Math.random() * 2)]}）
${String(Math.floor(Math.random() * 4) + 1).padStart(2, '0')}:00 ～ ${String(Math.floor(Math.random() * 4) + 5).padStart(2, '0')}:00（予定）

ご迷惑をおかけいたしますが、ご理解のほどよろしくお願いいたします。` :
`プロフィール情報の更新のお願い

より適切な求人をご紹介するため、プロフィール情報の更新をお願いいたします。

特に以下の項目について最新の情報に更新してください：
・現在のスキル・経験
・希望条件（年収・勤務地・働き方など）
・転職希望時期

更新は Web-CALIB システムにログイン後、「プロフィール編集」よりお手続きください。`}

Web-CALIB システム
`
} as const;

interface DemoMail {
  id: string;
  subject: string;
  href: string;
  sender: string;
  recipient: string;
  processDate: string;
  createDate: string;
  size: string;
  status: '未読' | '既読';
  from: string;
  to: string;
  date: string;
  body: string;
  attachments: Array<{name: string; size: string}>;
  category: keyof typeof SUBJECT_PATTERNS;
}

/**
 * デモメールデータを生成する
 * @param count 生成するメール数（デフォルト: 150）
 * @returns 生成されたデモメールデータ配列
 */
export function generateDemoMails(count: number = 150): DemoMail[] {
  const mails: DemoMail[] = [];
  const recipientName = '稲垣 雄也';
  const recipientEmail = 'yuya_inagaki+005@r.recruit.co.jp';
  
  // 過去1年分の日付範囲を設定
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  for (let i = 0; i < count; i++) {
    // カテゴリをランダム選択（重み付き）
    const categoryWeights = {
      job_intro: 0.35,    // 35% - 求人紹介
      interview: 0.25,    // 25% - 面談関連
      result: 0.15,       // 15% - 選考結果
      follow_up: 0.15,    // 15% - フォローアップ
      system: 0.10        // 10% - システム通知
    };
    
    const categories = Object.keys(categoryWeights) as (keyof typeof SUBJECT_PATTERNS)[];
    const weights = Object.values(categoryWeights);
    const rand = Math.random();
    let weightSum = 0;
    let selectedCategory: keyof typeof SUBJECT_PATTERNS = 'job_intro';
    
    for (let j = 0; j < categories.length; j++) {
      weightSum += weights[j];
      if (rand <= weightSum) {
        selectedCategory = categories[j];
        break;
      }
    }
    
    // 送信者を選択（カテゴリに基づく）
    let sender, senderEmail, senderName;
    if (selectedCategory === 'system' || selectedCategory === 'job_intro' || selectedCategory === 'follow_up') {
      const recruiter = RECRUITER_SENDERS[Math.floor(Math.random() * RECRUITER_SENDERS.length)];
      sender = `${recruiter.name} ${recruiter.department}`;
      senderEmail = recruiter.email;
      senderName = `${recruiter.name} ${recruiter.department} ${PERSONAL_NAMES[Math.floor(Math.random() * PERSONAL_NAMES.length)]}`;
    } else {
      // interview, result は企業担当者
      const company = COMPANY_SENDERS[Math.floor(Math.random() * COMPANY_SENDERS.length)];
      sender = `${company.name} ${company.department}`;
      senderEmail = company.email;
      senderName = `${company.name} ${company.department} ${PERSONAL_NAMES[Math.floor(Math.random() * PERSONAL_NAMES.length)]}`;
    }
    
    // 件名を選択
    const subjects = SUBJECT_PATTERNS[selectedCategory];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    
    // ランダムな日付を生成（時系列データ）
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const processDate = `${String(randomDate.getFullYear()).slice(-2)}/${String(randomDate.getMonth() + 1).padStart(2, '0')}/${String(randomDate.getDate()).padStart(2, '0')} ${String(randomDate.getHours()).padStart(2, '0')}:${String(randomDate.getMinutes()).padStart(2, '0')}`;
    
    // 作成日時（処理日時より少し前）
    const createTime = new Date(randomDate.getTime() - Math.random() * 300000); // 最大5分前
    const createDate = `${String(createTime.getFullYear()).slice(-2)}/${String(createTime.getMonth() + 1).padStart(2, '0')}/${String(createTime.getDate()).padStart(2, '0')} ${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}`;
    
    // メール本文を生成
    let body = '';
    switch (selectedCategory) {
      case 'interview':
        body = EMAIL_TEMPLATES.interview(recipientName, senderName, selectedCategory === 'interview' && Math.random() > 0.5 ? COMPANY_SENDERS[Math.floor(Math.random() * COMPANY_SENDERS.length)].name : undefined);
        break;
      case 'result':
        body = EMAIL_TEMPLATES.result(recipientName, senderName, Math.random() > 0.3); // 30%が合格
        break;
      case 'job_intro':
        body = EMAIL_TEMPLATES.job_intro(recipientName, senderName);
        break;
      case 'system':
        body = EMAIL_TEMPLATES.system(recipientName);
        break;
      case 'follow_up':
        body = `${recipientName}様\n\n${senderName}です。\n\nその後転職活動の調子はいかがでしょうか？\n\n何かご不明な点やご相談がございましたら、\nお気軽にお声がけください。\n\n引き続きサポートさせていただきます。\n\n${senderName}`;
        break;
    }
    
    // 添付ファイル（確率的に追加）
    const attachments: Array<{name: string; size: string}> = [];
    if (selectedCategory === 'job_intro' && Math.random() > 0.7) {
      attachments.push({
        name: `求人詳細資料_${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}.pdf`,
        size: `${Math.floor(Math.random() * 500) + 100}KB`
      });
    } else if (selectedCategory === 'result' && Math.random() > 0.8) {
      attachments.push({
        name: 'next_steps.pdf',
        size: `${Math.floor(Math.random() * 200) + 50}KB`
      });
    }
    
    const mailId = `DEMO${String(i + 1).padStart(3, '0')}`;
    
    mails.push({
      id: mailId,
      subject,
      href: `/webcalib/app/message_management33_view?messageId=${mailId}&messageNo=${String(i + 1).padStart(3, '0')}&jobseekerNo=J025870`,
      sender,
      recipient: recipientEmail,
      processDate,
      createDate,
      size: `${(Math.floor(body.length / 10) / 100).toFixed(1)}KB`,
      status: Math.random() > 0.6 ? '未読' : '既読', // 40%が未読
      from: `${senderName} <${senderEmail}>`,
      to: recipientEmail,
      date: processDate,
      body: body.trim(),
      attachments,
      category: selectedCategory
    });
  }
  
  // 日付順にソート（新しい順）
  mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return mails;
}

/**
 * 特定のメールIDのデモメール詳細を取得
 * @param mailId メールID
 * @param mails 全メールデータ
 * @returns メール詳細データまたはnull
 */
export function getDemoMailById(mailId: string, mails: DemoMail[]): DemoMail | null {
  return mails.find(mail => mail.id === mailId) || null;
}