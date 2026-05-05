const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'src', 'data', 'mockData.js');

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
        
        // 1. Write to file
        const content = `export const mockData = ${data};`;
        fs.writeFileSync(DATA_FILE, content);
        
        // 2. Git commit and push (if in a git repo)
        try {
          execSync('git add src/data/mockData.js');
          execSync('git commit -m "Update personnel data via local proxy"');
          execSync('git push origin main');
          console.log('Successfully saved and pushed to GitHub');
        } catch (gitError) {
          console.error('Git operation failed, but file was saved locally:', gitError.message);
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
