import ExcelJS from 'exceljs';

async function updateExcel() {
  const filePath = 'C:\\Antigravity\\⑤2026春季コンヘ゜景品.xlsx';
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet('26春');
    
    // 正規化関数: スペースの除去、全角から半角への変換など
    const normalize = (str) => {
      if (typeof str !== 'string') return '';
      return str.replace(/[\s　]/g, '') // すべてのスペースを除去
                .replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60)) // カタカナをひらがなに（必要なら）
                .toLowerCase();
    };

    // 1. 左側の表から景品情報を収集
    const prizeMap = new Map();

    for (let r = 5; r <= 100; r++) {
      const row = worksheet.getRow(r);
      
      const processEntry = (name, qty, unit) => {
        if (name && typeof name === 'string') {
          const normName = normalize(name);
          const current = prizeMap.get(normName) || { qty: 0, unit: unit, originalName: name };
          const numericQty = typeof qty === 'number' ? qty : (qty && typeof qty === 'object' && qty.result ? qty.result : 0);
          current.qty += numericQty;
          if (unit) current.unit = unit;
          prizeMap.set(normName, current);
        }
      };

      processEntry(row.getCell(4).value, row.getCell(5).value, row.getCell(6).value);  // 表1 (D, E, F)
      processEntry(row.getCell(10).value, row.getCell(11).value, row.getCell(12).value); // 表2 (J, K, L)
    }

    // 2. N列の品名に基づいてO列とP列を更新
    for (let r = 5; r <= 100; r++) {
      const row = worksheet.getRow(r);
      const targetName = row.getCell(14).value; // N
      
      if (targetName && typeof targetName === 'string') {
        const normTarget = normalize(targetName);
        const info = prizeMap.get(normTarget);
        
        // 特殊ケースのハンドリング (例: "サントリー生" が "サントリー生ビール" にマッチするように)
        let finalInfo = info;
        if (!finalInfo) {
          for (const [key, val] of prizeMap.entries()) {
            if (key.includes(normTarget) || normTarget.includes(key)) {
              finalInfo = val;
              break;
            }
          }
        }

        if (finalInfo) {
          row.getCell(15).value = finalInfo.qty;  // O
          row.getCell(16).value = finalInfo.unit; // P
          console.log(`Updated Row ${r}: "${targetName}" matched with "${finalInfo.originalName}" -> ${finalInfo.qty} ${finalInfo.unit}`);
        } else {
          console.log(`Prize not found for Row ${r}: "${targetName}"`);
        }
      }
    }

    await workbook.xlsx.writeFile(filePath);
    console.log('Successfully updated the Excel file.');
  } catch (error) {
    console.error('Error updating excel file:', error);
  }
}

updateExcel();
