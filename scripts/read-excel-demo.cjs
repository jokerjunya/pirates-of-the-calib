const XLSX = require('xlsx');
const path = require('path');

/**
 * Excelファイルからメールデータを読み込んで分析
 */
function readExcelDemo() {
  const excelFilePath = '/Users/01062544/Downloads/やり取りのデモ.xlsx';
  
  try {
    console.log('📊 Excelファイルを読み込み中...');
    console.log(`ファイルパス: ${excelFilePath}`);
    
    // Excelファイルを読み込み
    const workbook = XLSX.readFile(excelFilePath);
    console.log(`✅ Excelファイル読み込み完了`);
    
    // シート一覧を表示
    console.log('\n📋 シート一覧:');
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`  ${index + 1}. ${sheetName}`);
    });
    
    // 各シートの内容を確認
    workbook.SheetNames.forEach((sheetName) => {
      console.log(`\n🔍 シート "${sheetName}" の内容:`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        console.log('  (空のシート)');
        return;
      }
      
      // ヘッダー行（最初の行）を表示
      console.log('  📝 ヘッダー:', jsonData[0]);
      console.log(`  📊 データ行数: ${jsonData.length - 1}`);
      
      // 最初の3行のデータサンプルを表示
      console.log('  📄 データサンプル（最初の3行）:');
      for (let i = 1; i <= Math.min(4, jsonData.length - 1); i++) {
        if (jsonData[i]) {
          console.log(`    行${i}:`, jsonData[i]);
        }
      }
      
      // 企業名の分析（送信者から企業を抽出）
      const companies = new Set();
      const senders = new Set();
      
      jsonData.slice(1).forEach(row => {
        // 送信者列を探す（一般的な列名）
        const senderIndex = jsonData[0].findIndex(header => 
          header && (
            header.includes('送信者') || 
            header.includes('From') || 
            header.includes('差出人') ||
            header.includes('送り主')
          )
        );
        
        if (senderIndex !== -1 && row[senderIndex]) {
          const sender = String(row[senderIndex]);
          senders.add(sender);
          
          // 企業名を推定（@マークより前の部分やメール形式から）
          if (sender.includes('@')) {
            const domain = sender.split('@')[1];
            if (domain && !domain.includes('r-agent.com') && !domain.includes('recruit')) {
              companies.add(domain);
            }
          }
          
          // 株式会社や企業名らしいパターンを抽出
          const companyMatch = sender.match(/(株式会社[^<>\s]+|[^<>@\s]+株式会社)/);
          if (companyMatch) {
            companies.add(companyMatch[1]);
          }
        }
      });
      
      console.log(`  🏢 検出された企業数: ${companies.size}`);
      if (companies.size > 0) {
        console.log('  🏢 企業一覧:');
        [...companies].slice(0, 5).forEach(company => {
          console.log(`    - ${company}`);
        });
        if (companies.size > 5) {
          console.log(`    ... 他${companies.size - 5}社`);
        }
      }
      
      console.log(`  👤 送信者パターン数: ${senders.size}`);
      if (senders.size > 0) {
        console.log('  👤 送信者サンプル:');
        [...senders].slice(0, 3).forEach(sender => {
          console.log(`    - ${sender}`);
        });
      }
    });
    
    // 分析結果をJSONファイルとして出力
    const analysisResult = {
      fileName: path.basename(excelFilePath),
      sheets: workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) return { name: sheetName, isEmpty: true };
        
        // 企業分析
        const companies = new Set();
        const senders = new Set();
        const subjects = new Set();
        
        jsonData.slice(1).forEach(row => {
          // 送信者分析
          const senderIndex = jsonData[0].findIndex(header => 
            header && (
              header.includes('送信者') || 
              header.includes('From') || 
              header.includes('差出人')
            )
          );
          
          if (senderIndex !== -1 && row[senderIndex]) {
            const sender = String(row[senderIndex]);
            senders.add(sender);
            
            // 企業抽出
            const companyMatch = sender.match(/(株式会社[^<>\s]+|[^<>@\s]+株式会社)/);
            if (companyMatch) {
              companies.add(companyMatch[1]);
            }
          }
          
          // 件名分析
          const subjectIndex = jsonData[0].findIndex(header => 
            header && (
              header.includes('件名') || 
              header.includes('Subject') || 
              header.includes('タイトル')
            )
          );
          
          if (subjectIndex !== -1 && row[subjectIndex]) {
            subjects.add(String(row[subjectIndex]));
          }
        });
        
        return {
          name: sheetName,
          headers: jsonData[0],
          rowCount: jsonData.length - 1,
          companies: [...companies],
          senders: [...senders],
          subjects: [...subjects].slice(0, 10), // 最初の10件
          sampleData: jsonData.slice(1, 4) // 最初の3行
        };
      })
    };
    
    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../data/excel-analysis.json');
    require('fs').writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf-8');
    console.log(`\n💾 分析結果を保存しました: ${outputPath}`);
    
    return analysisResult;
    
  } catch (error) {
    console.error('❌ Excelファイル読み込みエラー:', error.message);
    return null;
  }
}

// 実行
if (require.main === module) {
  readExcelDemo();
}

module.exports = { readExcelDemo };