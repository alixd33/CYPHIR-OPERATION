import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const SRC_DIR = path.join(__dirname, 'src');
const PID_FILE = path.join(__dirname, '.cipher-server.pid');
const URL_FILE = path.join(__dirname, '.cipher-server.url');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const args = process.argv.slice(2);
let requestedPort = Number(process.env.PORT || 4173);
const autoPort = args.includes('--auto-port');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    requestedPort = Number(args[i + 1]);
  }
}

function resolveStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  if (cleanPath === '/' || cleanPath === '/index.html') {
    return path.join(PUBLIC_DIR, 'index.html');
  }
  if (cleanPath.startsWith('/src/')) {
    const candidate = path.normalize(path.join(__dirname, cleanPath));
    if (candidate.startsWith(SRC_DIR)) return candidate;
  }
  const candidate = path.normalize(path.join(PUBLIC_DIR, cleanPath));
  if (candidate.startsWith(PUBLIC_DIR)) return candidate;
  return null;
}

function createAppServer() {
  return http.createServer((req, res) => {
    const urlPath = req.url || '/';
    if (urlPath === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', app: 'OPERATION: CIPHER', version: '2.0.0' }));
      return;
    }

    const filePath = resolveStaticPath(urlPath);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function tryListen(port, attemptsLeft) {
  const server = createAppServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (autoPort && attemptsLeft > 0) {
        console.warn(`[CIPHER] Port ${port} is occupied. Trying port ${port + 1}...`);
        tryListen(port + 1, attemptsLeft - 1);
      } else {
        console.error(
          `[ERROR] Port ${port} is already in use!\n` +
            `[خطا] پورت ${port} هم‌اکنون توسط برنامه دیگری اشغال شده است.\n` +
            `لطفاً برنامه قبلی را ببندید یا سرور را با پورت دیگری اجرا کنید: node server.mjs --port ${port + 1}`
        );
        process.exit(1);
      }
    } else {
      console.error('[ERROR] Server failed to start:', err);
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
    fs.writeFileSync(URL_FILE, url, 'utf8');
    console.log(`OPERATION: CIPHER v2.0 local server running at ${url}`);
    console.log(`PID: ${process.pid}`);
  });

  const cleanup = () => {
    try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
    try { if (fs.existsSync(URL_FILE)) fs.unlinkSync(URL_FILE); } catch {}
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

tryListen(requestedPort, 10);
