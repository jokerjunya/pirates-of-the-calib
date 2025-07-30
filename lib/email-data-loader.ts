/**
 * メールデータローダー
 * JSONファイルからフロンテック社完全転職プロセスデータを読み込み、時系列順に並べる
 */

import fs from 'fs';
import path from 'path';

interface EmailData {
  step: number;
  flow: string;
  subject: string;
  content: string;
  urgency: 'high' | 'normal' | 'low';
  attachments: Array<{name: string; size: string}>;
  timeOffsetMinutes: number;
}

interface ParticipantInfo {
  name: string;
  email: string;
  role: string;
}

interface CompanyInfo {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  status: string;
}

interface EmailDataFile {
  companyInfo: CompanyInfo;
  participants: Record<string, ParticipantInfo>;
  emails: EmailData[];
}

interface ProcessedMail {
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
  category: 'application_process' | 'interview_process' | 'question_answer' | 'intention_survey' | 'result_notification' | 'system_notification';
  step: number;
  flow: string;
  urgency: 'high' | 'normal' | 'low';
  companyName: string;
}

/**
 * メールデータファイルを読み込む
 */
function loadEmailDataFile(): EmailDataFile {
  const dataFilePath = path.join(process.cwd(), 'data/a-company-emails.json');
  
  try {
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(fileContent) as EmailDataFile;
  } catch (error) {
    console.error('❌ メールデータファイルの読み込みに失敗:', error);
    throw new Error(`Failed to load email data file: ${dataFilePath}`);
  }
}

/**
 * カテゴリを決定する（38件対応版）
 */
function determineCategory(subject: string, step: number, flow: string): ProcessedMail['category'] {
  // システム自動通知
  if (flow === 'SYSTEM→SYSTEM') {
    return 'system_notification';
  }
  
  // 内定関連
  if (subject.includes('内定') || step >= 37) {
    return 'result_notification';
  }
  
  // 意向調査関連
  if (subject.includes('意向') || subject.includes('ご意向') || (step >= 31 && step <= 36)) {
    return 'intention_survey';
  }
  
  // 面接関連
  if (subject.includes('面接') || subject.includes('日程') || (step >= 10 && step <= 17) || (step >= 29 && step <= 30)) {
    return 'interview_process';
  }
  
  // 質問・回答関連
  if (subject.includes('質問') || subject.includes('Re:') || subject.includes('返信') || (step >= 18 && step <= 28)) {
    return 'question_answer';
  }
  
  // 応募プロセス関連（初期段階）
  if (step <= 9) {
    return 'application_process';
  }
  
  // デフォルト
  return 'question_answer';
}

/**
 * フロー表示名を取得
 */
function getFlowDisplayName(flow: string): string {
  const flowMapping = {
    'CA→CS': 'キャリアアドバイザー → 求職者',
    'CS→CA': '求職者 → キャリアアドバイザー',
    'RA→CA': 'リクルートエージェント → キャリアアドバイザー',
    'CA→RA': 'キャリアアドバイザー → リクルートエージェント',
    'SYSTEM→SYSTEM': 'システム内部通知'
  };
  
  return flowMapping[flow] || flow;
}

/**
 * フロンテック社完全転職プロセスのメールデータを生成（時系列順）
 * @param companyId 企業ID（デフォルト: chain_001）
 * @returns 処理されたメールデータ配列（時系列順：古い順）
 */
export function loadCompanyEmails(companyId: string = 'chain_001'): ProcessedMail[] {
  const emailDataFile = loadEmailDataFile();
  
  if (emailDataFile.companyInfo.id !== companyId) {
    throw new Error(`Company ID ${companyId} not found in data file`);
  }

  const mails: ProcessedMail[] = [];
  const baseDate = new Date(emailDataFile.companyInfo.startDate);

  emailDataFile.emails.forEach((emailData, index) => {
    // メール送信日時を計算（timeOffsetMinutesを使用）
    const mailDate = new Date(baseDate);
    mailDate.setMinutes(mailDate.getMinutes() + emailData.timeOffsetMinutes);

    // システム通知の場合の特別処理
    let fromParticipant, toParticipant;
    if (emailData.flow === 'SYSTEM→SYSTEM') {
      fromParticipant = toParticipant = emailDataFile.participants['SYSTEM'];
    } else {
      // 通常のフロー処理
      const [fromRole, toRole] = emailData.flow.split('→') as [string, string];
      fromParticipant = emailDataFile.participants[fromRole];
      toParticipant = emailDataFile.participants[toRole];
    }

    if (!fromParticipant || !toParticipant) {
      console.warn(`⚠️ 参加者が見つかりません: ${emailData.flow}`);
      return;
    }

    // カテゴリを決定
    const category = determineCategory(emailData.subject, emailData.step, emailData.flow);

    // 作成日時（送信日時より少し前）
    const createTime = new Date(mailDate.getTime() - Math.random() * 300000);
    
    const mailId = `FRTC${String(emailData.step).padStart(3, '0')}`;
    
    // ステータス決定（緊急メールは未読、システム通知は既読が多い）
    let status: '未読' | '既読';
    if (emailData.urgency === 'high') {
      status = '未読';
    } else if (emailData.flow === 'SYSTEM→SYSTEM') {
      status = Math.random() > 0.3 ? '既読' : '未読';
    } else {
      status = Math.random() > 0.6 ? '未読' : '既読';
    }
    
    mails.push({
      id: mailId,
      subject: emailData.subject,
      href: `/app/message_management33_view?messageId=${mailId}&messageNo=${String(emailData.step).padStart(3, '0')}&jobseekerNo=J025870`,
      sender: fromParticipant.name,
      recipient: emailData.flow === 'SYSTEM→SYSTEM' ? 'システム' : toParticipant.email,
      processDate: `${String(mailDate.getFullYear()).slice(-2)}/${String(mailDate.getMonth() + 1).padStart(2, '0')}/${String(mailDate.getDate()).padStart(2, '0')} ${String(mailDate.getHours()).padStart(2, '0')}:${String(mailDate.getMinutes()).padStart(2, '0')}`,
      createDate: `${String(createTime.getFullYear()).slice(-2)}/${String(createTime.getMonth() + 1).padStart(2, '0')}/${String(createTime.getDate()).padStart(2, '0')} ${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}`,
      size: `${(Math.floor(emailData.content.length / 10) / 100).toFixed(1)}KB`,
      status: status,
      from: `${fromParticipant.name} <${fromParticipant.email}>`,
      to: emailData.flow === 'SYSTEM→SYSTEM' ? 'system@r-agent.com' : toParticipant.email,
      date: `${String(mailDate.getFullYear()).slice(-2)}/${String(mailDate.getMonth() + 1).padStart(2, '0')}/${String(mailDate.getDate()).padStart(2, '0')} ${String(mailDate.getHours()).padStart(2, '0')}:${String(mailDate.getMinutes()).padStart(2, '0')}`,
      body: emailData.content.trim(),
      attachments: emailData.attachments,
      category,
      step: emailData.step,
      flow: emailData.flow,
      urgency: emailData.urgency,
      companyName: emailDataFile.companyInfo.companyName
    });
  });

  // 🔧 修正: 時系列順（昇順）にソート - 古いメールから新しいメールの順
  mails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log(`✨ ${mails.length}件のフロンテック社完全転職プロセスメール（時系列順）を読み込みました`);
  console.log(`📅 期間: ${mails[0]?.date} ～ ${mails[mails.length - 1]?.date}（古い順）`);

  return mails;
}

/**
 * 特定のメールIDの詳細を取得
 * @param mailId メールID  
 * @param mails 全メールデータ（省略時は自動読み込み）
 * @returns メール詳細データまたはnull
 */
export function getEmailById(mailId: string, mails?: ProcessedMail[]): ProcessedMail | null {
  if (!mails) {
    mails = loadCompanyEmails();
  }
  return mails.find(mail => mail.id === mailId) || null;
}

/**
 * 企業情報を取得
 * @returns 企業情報
 */
export function getCompanyInfo(): CompanyInfo {
  const emailDataFile = loadEmailDataFile();
  return emailDataFile.companyInfo;
}

/**
 * 利用可能な企業チェーン一覧を取得
 * @returns 企業チェーン情報
 */
export function getAvailableCompanyChains() {
  const emailDataFile = loadEmailDataFile();
  const mailCount = emailDataFile.emails.length;
  
  return [{
    id: emailDataFile.companyInfo.id,
    companyName: emailDataFile.companyInfo.companyName,
    position: emailDataFile.companyInfo.position,
    status: emailDataFile.companyInfo.status,
    mailCount: mailCount
  }];
}

/**
 * フロー統計を取得
 * @returns フロー別メール数統計
 */
export function getFlowStatistics(): Record<string, number> {
  const mails = loadCompanyEmails();
  return mails.reduce((stats, mail) => {
    const displayName = getFlowDisplayName(mail.flow);
    stats[displayName] = (stats[displayName] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);
} 