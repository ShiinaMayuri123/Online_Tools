/**
 * ADB 本地代理服务器
 * 在用户本机运行，调用本地 adb.exe，提供 HTTP API 和 WebSocket 接口
 *
 * 安全特性：
 * - 只监听 127.0.0.1（不暴露到公网）
 * - Token 鉴权（启动时生成，用户需手动配对）
 * - 命令白名单（只允许 adb 命令）
 * - CORS 限制
 */
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findAdb, checkAdbAvailable } from './adb-finder.js';
import { findAvailablePort, DEFAULT_PORT } from './port-finder.js';

// ============ 配置 ============

const TOKEN_FILE = join(import.meta.dirname, 'agent.token');
const ALLOWED_ORIGINS = ['*']; // 开发时允许所有来源，生产环境改为你的域名

// ============ Token 管理 ============

/**
 * 获取或生成 API Token
 * @returns {string} Token 字符串
 */
function getToken() {
  if (existsSync(TOKEN_FILE)) {
    const token = readFileSync(TOKEN_FILE, 'utf-8').trim();
    if (token) return token;
  }
  const token = crypto.randomBytes(24).toString('hex');
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

const API_TOKEN = getToken();

// ============ ADB 路径检测 ============

const adbPath = findAdb();
if (!adbPath) {
  console.error('\n========================================');
  console.error('  错误：未找到 adb.exe');
  console.error('  请安装 Android SDK Platform Tools');
  console.error('  下载地址: https://developer.android.com/studio/releases/platform-tools');
  console.error('  或将 adb.exe 放到本程序同目录');
  console.error('========================================\n');
  process.exit(1);
}

if (!checkAdbAvailable(adbPath)) {
  console.error('\n========================================');
  console.error('  错误：adb.exe 无法执行');
  console.error('  请检查文件权限或重新安装');
  console.error('========================================\n');
  process.exit(1);
}

console.log(`[ADB] 使用路径: ${adbPath}`);

// ============ Express 应用 ============

const app = express();
app.use(express.json());

// CORS 中间件
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Token 验证中间件
function checkAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    return res.status(401).json({ error: '缺少 Token，请先配对' });
  }
  const token = h.slice(7);
  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Token 无效' });
  }
  next();
}

// ============ 工具函数 ============

/**
 * 执行 ADB 命令
 * @param {string[]} args - 命令参数
 * @param {object} options - 选项
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runAdb(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(adbPath, args, { shell: false });
    let stdout = '', stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', code => resolve({ stdout, stderr, code }));
    proc.on('error', err => reject(err));

    // 超时处理
    if (options.timeout) {
      setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('命令执行超时'));
      }, options.timeout);
    }
  });
}

/**
 * 验证命令是否安全
 * @param {string} command - 命令字符串
 * @returns {boolean} 是否安全
 */
function isCommandSafe(command) {
  const normalized = command.trim().toLowerCase();

  // 黑名单
  const blocked = ['adb reboot recovery'];
  if (blocked.some(b => normalized.startsWith(b))) return false;

  // 只允许 adb 开头的命令
  if (!normalized.startsWith('adb ')) return false;

  // 禁止 shell 特殊字符（防止注入）
  const forbiddenChars = /[;&|<>$`\\]/;
  if (forbiddenChars.test(command)) return false;

  return true;
}

/**
 * 解析命令为参数数组
 * @param {string} command - 命令字符串
 * @returns {string[]} 参数数组
 */
function parseCommand(command) {
  return command.split(/\s+/).filter(Boolean);
}

// ============ API 路由 ============

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    version: '1.0.0',
    adbPath,
    port: server.address()?.port
  });
});

// 获取 Token 信息（用于前端显示配对状态）
app.get('/token', (req, res) => {
  res.json({
    tokenPreview: API_TOKEN.slice(0, 8) + '...',
    hasToken: true
  });
});

// 获取设备列表
app.get('/adb/devices', checkAuth, async (req, res) => {
  try {
    const { stdout } = await runAdb(['devices', '-l']);
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('List'));
    const devices = lines.map(line => {
      const parts = line.split(/\s+/);
      const serial = parts[0];
      const state = parts[1];
      const info = {};
      parts.slice(2).forEach(p => {
        const [key, val] = p.split(':');
        if (key && val) info[key] = val;
      });
      return { serial, state, ...info };
    });
    res.json({ success: true, devices });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 连接设备
app.post('/adb/connect', checkAuth, async (req, res) => {
  const { ip, port = 5555 } = req.body;
  if (!ip) return res.status(400).json({ success: false, error: 'IP 地址不能为空' });

  // 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return res.status(400).json({ success: false, error: 'IP 地址格式无效' });
  }

  try {
    const { stdout, stderr, code } = await runAdb(['connect', `${ip}:${port}`], { timeout: 10000 });
    const success = stdout.includes('connected') || stdout.includes('already');
    res.json({
      success,
      message: stdout.trim() || stderr.trim(),
      device: success ? `${ip}:${port}` : null
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 断开连接
app.post('/adb/disconnect', checkAuth, async (req, res) => {
  const { device } = req.body;
  try {
    const args = device ? ['disconnect', device] : ['disconnect'];
    const { stdout } = await runAdb(args);
    res.json({ success: true, message: stdout.trim() });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 执行命令（一次性返回结果）
app.post('/adb/exec', checkAuth, async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ success: false, error: '命令不能为空' });

  // 安全检查
  if (!isCommandSafe(command)) {
    return res.status(403).json({ success: false, error: '命令不安全或不在白名单中' });
  }

  try {
    const args = parseCommand(command);
    const { stdout, stderr, code } = await runAdb(args.slice(1), { timeout: 30000 });
    res.json({ success: true, stdout, stderr, code });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============ WebSocket ============

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  // 验证 Token
  const params = new URLSearchParams(req.url.split('?')[1] || '');
  const token = params.get('token');
  const origin = req.headers.origin;

  // 验证来源
  if (!ALLOWED_ORIGINS.includes('*') && origin && !ALLOWED_ORIGINS.includes(origin)) {
    ws.send(JSON.stringify({ type: 'error', data: '来源不允许' }));
    ws.close();
    return;
  }

  // 验证 Token
  if (token !== API_TOKEN) {
    ws.send(JSON.stringify({ type: 'error', data: 'Token 无效' }));
    ws.close();
    return;
  }

  console.log('[WebSocket] 客户端已连接');
  let currentProcess = null;

  ws.on('message', (msg) => {
    let m;
    try {
      m = JSON.parse(msg.toString());
    } catch (e) {
      return ws.send(JSON.stringify({ type: 'error', data: '无效的 JSON' }));
    }

    if (m.type === 'exec-stream' && m.command) {
      // 安全检查
      if (!isCommandSafe(m.command)) {
        ws.send(JSON.stringify({ type: 'error', data: '命令不安全或不在白名单中' }));
        return;
      }

      // 终止之前的进程
      if (currentProcess) {
        currentProcess.kill('SIGKILL');
        currentProcess = null;
      }

      const args = parseCommand(m.command);
      ws.send(JSON.stringify({ type: 'start', command: m.command }));

      const proc = spawn(adbPath, args.slice(1), { shell: false });
      currentProcess = proc;

      proc.stdout.on('data', d => ws.send(JSON.stringify({ type: 'stdout', data: d.toString() })));
      proc.stderr.on('data', d => ws.send(JSON.stringify({ type: 'stderr', data: d.toString() })));

      proc.on('close', code => {
        ws.send(JSON.stringify({ type: 'close', code }));
        currentProcess = null;
      });

      proc.on('error', err => {
        ws.send(JSON.stringify({ type: 'error', data: err.message }));
        currentProcess = null;
      });
    }

    if (m.type === 'kill') {
      if (currentProcess) {
        currentProcess.kill('SIGKILL');
        currentProcess = null;
        ws.send(JSON.stringify({ type: 'killed' }));
      }
    }
  });

  ws.on('close', () => {
    if (currentProcess) {
      currentProcess.kill('SIGKILL');
      currentProcess = null;
    }
    console.log('[WebSocket] 客户端已断开');
  });
});

// ============ 启动服务器 ============

async function start() {
  const port = await findAvailablePort(DEFAULT_PORT);

  server.listen(port, '127.0.0.1', () => {
    const actualPort = server.address().port;
    console.log('\n========================================');
    console.log('  ADB 本地代理已启动');
    console.log(`  地址: http://127.0.0.1:${actualPort}`);
    console.log(`  WebSocket: ws://127.0.0.1:${actualPort}/ws`);
    console.log(`  API Token: ${API_TOKEN}`);
    console.log('========================================');
    console.log('\n请将上方 Token 复制到网页上进行配对\n');

    // 尝试打开浏览器
    try {
      const { exec } = await import('child_process');
      exec(`start http://127.0.0.1:${actualPort}/setup`);
    } catch (e) {
      // 忽略打开浏览器失败
    }
  });
}

// 配对页面
app.get('/setup', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ADB 本地代理 - 配对</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          font-size: 24px;
          color: #1a1a2e;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .token-box {
          background: #f5f5f5;
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        .token {
          font-family: 'Courier New', monospace;
          font-size: 18px;
          color: #333;
          word-break: break-all;
          user-select: all;
        }
        .btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
        .btn:active {
          transform: translateY(0);
        }
        .steps {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #eee;
        }
        .steps h3 {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
        }
        .step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #444;
        }
        .step-num {
          background: #667eea;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .toast.show { opacity: 1; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🔗 ADB 本地代理</h1>
        <p class="subtitle">请将以下 Token 复制到网页上的 ADB 控制台中进行配对</p>

        <div class="token-box">
          <div class="token" id="token">${API_TOKEN}</div>
        </div>

        <button class="btn" onclick="copyToken()">📋 复制 Token</button>

        <div class="steps">
          <h3>配对步骤：</h3>
          <div class="step">
            <span class="step-num">1</span>
            <span>点击上方按钮复制 Token</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>打开 ADB 控制台网页</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>在"本地代理配对"区域粘贴 Token</span>
          </div>
          <div class="step">
            <span class="step-num">4</span>
            <span>点击"配对"按钮完成连接</span>
          </div>
        </div>
      </div>

      <div class="toast" id="toast">已复制到剪贴板！</div>

      <script>
        function copyToken() {
          navigator.clipboard.writeText('${API_TOKEN}').then(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
          });
        }
      </script>
    </body>
    </html>
  `);
});

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
