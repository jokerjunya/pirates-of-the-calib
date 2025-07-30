/**
 * 更新されたExcelファイル「やり取りのデモ(更新).xlsx」を読み込んで分析
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function readUpdatedExcelDemo() {
  const excelFilePath = '/Users/01062544/Downloads/やり取りのデモ(更新).xlsx';
  
  console.log('📊 更新されたExcelファイルを読み込み中...');
  console.log(`ファイルパス: ${excelFilePath}`);
  
  try {
    // Excelファイルを読み込み
    const workbook = XLSX.readFile(excelFilePath);
    
    console.log('📋 ワークシート一覧:');
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    // 最初のシートを取得
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    console.log(`\n📄 メインシート「${firstSheetName}」を分析中...`);
    
    // JSONに変換
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📏 データ行数: ${jsonData.length}`);
    
    // ヘッダー行を表示
    if (jsonData.length > 0) {
      console.log('\n📝 ヘッダー行:');
      jsonData[0].forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });
    }
    
    // データ行を分析
    const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell != null && cell !== ''));
    console.log(`📊 有効データ行数: ${dataRows.length}`);
    
    // 各行のデータを詳細分析
    console.log('\n📋 メールデータ詳細:');
    const emailData = [];
    
    dataRows.forEach((row, index) => {
      console.log(`\n--- メール ${index + 1} ---`);
      
      const mailInfo = {
        step: index + 1,
        flow: row[0] || '',
        subject: row[1] || '',
        content: row[2] || '',
        rawData: row
      };
      
      console.log(`フロー: ${mailInfo.flow}`);
      console.log(`件名: ${mailInfo.subject}`);
      console.log(`内容長: ${mailInfo.content.length}文字`);
      console.log(`内容プレビュー: ${mailInfo.content.substring(0, 100)}...`);
      
      emailData.push(mailInfo);
    });
    
    // 分析結果をJSONファイルに保存
    const analysisResult = {
      fileName: 'やり取りのデモ(更新).xlsx',
      sheetName: firstSheetName,
      headers: jsonData[0],
      totalRows: jsonData.length,
      dataRows: dataRows.length,
      emails: emailData,
      timestamp: new Date().toISOString()
    };
    
    const outputPath = path.join(process.cwd(), 'data/excel-analysis-updated.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf-8');
    
    console.log(`\n✅ 分析完了！結果を保存しました: ${outputPath}`);
    console.log('\n📊 サマリー:');
    console.log(`  • ファイル名: ${analysisResult.fileName}`);
    console.log(`  • シート名: ${analysisResult.sheetName}`);
    console.log(`  • メール件数: ${analysisResult.dataRows}`);
    console.log(`  • データ構造: ${analysisResult.headers.join(' | ')}`);
    
    return analysisResult;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ ファイルが見つかりません: ${excelFilePath}`);
      console.error('ファイルパスを確認してください。');
    } else {
      console.error('❌ ファイル読み込みエラー:', error.message);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  try {
    readUpdatedExcelDemo();
    console.log('\n🎉 Excelファイル分析が完了しました！');
  } catch (error) {
    console.error('\n💥 処理中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

module.exports = { readUpdatedExcelDemo }; 