const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'src', 'data', 'mockData.js');
const PHOTO_FILE = path.join(__dirname, 'public', 'photoData.json');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { data } = JSON.parse(body);
        const parsed = JSON.parse(data);

        // --- 写真データを分離 ---
        const photoMap = {};
        const membersWithoutPhotos = (parsed.members || []).map(m => {
          const memberCopy = { ...m };
          // base64写真データがあれば、photoDataに移動
          if (m.photo && m.photo.startsWith('data:')) {
            photoMap[m.id] = m.photo;
            memberCopy.photo = `__photo__${m.id}`; // プレースホルダーに置き換え
          }
          return memberCopy;
        });

        // 既存のphotoDataを読み込んでマージ（既存写真を消さない）
        let existingPhotos = {};
        try {
          if (fs.existsSync(PHOTO_FILE)) {
            existingPhotos = JSON.parse(fs.readFileSync(PHOTO_FILE, 'utf8'));
          }
        } catch (e) {}
        const mergedPhotos = { ...existingPhotos, ...photoMap };

        // 1. photoData.json に写真データを保存
        fs.writeFileSync(PHOTO_FILE, JSON.stringify(mergedPhotos));
        console.log(`Saved ${Object.keys(mergedPhotos).length} photos to photoData.json`);

        // 2. mockData.js にはテキストデータのみ保存（写真URL or プレースホルダー）
        const dataForMockData = { units: parsed.units, members: membersWithoutPhotos };
        const content = `export const mockData = ${JSON.stringify(dataForMockData, null, 2)};`;
        fs.writeFileSync(DATA_FILE, content);

        // 3. Git commit and push
        try {
          execSync('git add src/data/mockData.js public/photoData.json');
          execSync('git commit -m "Update personnel data and photos via local proxy"');
          execSync('git push origin main');
          console.log('Successfully saved and pushed to GitHub');
        } catch (gitError) {
          console.error('Git operation failed, but files were saved locally:', gitError.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (error) {
        console.error('Save error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/inquiry') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const inquiryData = JSON.parse(body);
        const logFile = path.join(__dirname, 'inquiries.json');
        
        let logs = [];
        if (fs.existsSync(logFile)) {
          logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
        
        logs.push({
          timestamp: new Date().toISOString(),
          ...inquiryData
        });
        
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        
        // 問い合わせをGitにも残す
        try {
          execSync('git add inquiries.json');
          execSync('git commit -m "New inquiry received"');
          execSync('git push origin main');
        } catch (gitError) {
          console.error('Git push failed for inquiry:', gitError.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (error) {
        console.error('Inquiry error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/inquiries') {
    const logFile = path.join(__dirname, 'inquiries.json');
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8');
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(logs);
    } else {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(JSON.stringify([]));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Sync server running at http://localhost:${PORT}`);
});
