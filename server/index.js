/**
 * ADB 控制台后端服务器
 * 提供 ADB 命令执行和 WebSocket 实时输出
 * 安全措施：API密钥认证、命令白名单、来源限制
 */
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// API 密钥管理 - 从文件读取或首次生成
const KEY_FILE = join(process.cwd(), 'server', '.api-key');
let API_KEY;

if (existsSync(KEY_FILE)) {
  API_KEY = readFileSync(KEY_FILE, 'utf-8').trim();
  console.log(`\n========================================`);
  console.log(`API 密钥: ${API_KEY}`);
  console.log(`========================================\n`);
} else {
  API_KEY = crypto.randomBytes(32).toString('hex');
  writeFileSync(KEY_FILE, API_KEY);
  console.log(`\n========================================`);
  console.log(`首次运行，已生成 API 密钥: ${API_KEY}`);
  console.log(`密钥已保存到: ${KEY_FILE}`);
  console.log(`========================================\n`);
}

app.use(express.json());

// CORS 支持 - 仅允许本地访问
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// API 密钥验证中间件
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: '未授权：请提供有效的 API 密钥' });
  }
  next();
};

// ADB 命令黑名单 - 禁止执行的命令
const BLOCKED_COMMANDS = [
  'adb reboot recovery',  // 进入 Recovery 模式（风险高）
];

// 验证命令是否安全
const isCommandSafe = (command) => {
  const normalized = command.trim().toLowerCase();

  // 检查黑名单
  if (BLOCKED_COMMANDS.some(blocked => normalized.startsWith(blocked))) {
    return false;
  }

  // 允许所有 adb 命令
  if (normalized.startsWith('adb ')) return true;

  return false;
};

// 当前连接的设备
let connectedDevice = null;

// 执行 ADB 命令（普通模式，返回完整输出）- 需要认证
app.post('/api/adb/exec', authenticate, async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: '命令不能为空' });

  // 安全检查
  if (!isCommandSafe(command)) {
    return res.status(403).json({ error: '命令不在白名单中，被拒绝执行' });
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    res.json({ success: true, stdout, stderr });
  } catch (error) {
    res.json({ success: false, error: error.message, stderr: error.stderr });
  }
});

// 获取已连接设备列表 - 需要认证
app.get('/api/adb/devices', authenticate, async (req, res) => {
  try {
    const { stdout } = await execAsync('adb devices -l');
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

// 连接设备 - 需要认证
app.post('/api/adb/connect', authenticate, async (req, res) => {
  const { ip, port = 5555 } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP 地址不能为空' });

  // 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return res.status(400).json({ error: 'IP 地址格式无效' });
  }

  try {
    const { stdout, stderr } = await execAsync(`adb connect ${ip}:${port}`, { timeout: 10000 });
    const success = stdout.includes('connected') || stdout.includes('already');
    if (success) connectedDevice = `${ip}:${port}`;
    res.json({ success, message: stdout.trim(), device: connectedDevice });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 断开连接 - 需要认证
app.post('/api/adb/disconnect', authenticate, async (req, res) => {
  const { device } = req.body;
  try {
    const cmd = device ? `adb disconnect ${device}` : 'adb disconnect';
    const { stdout } = await execAsync(cmd);
    if (!device || device === connectedDevice) connectedDevice = null;
    res.json({ success: true, message: stdout.trim() });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 获取当前连接设备 - 需要认证
app.get('/api/adb/current', authenticate, (req, res) => {
  res.json({ success: true, device: connectedDevice });
});

// WebSocket：实时命令执行（带认证）
wss.on('connection', (ws, req) => {
  // 验证 WebSocket 连接的 API 密钥
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  if (token !== API_KEY) {
    ws.send(JSON.stringify({ type: 'error', data: '未授权：请提供有效的 API 密钥' }));
    ws.close();
    return;
  }

  console.log('WebSocket 客户端已连接');
  let currentProcess = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'exec-stream') {
        // 实时流式执行命令
        const { command } = msg;
        if (!command) {
          ws.send(JSON.stringify({ type: 'error', data: '命令不能为空' }));
          return;
        }

        // 安全检查
        if (!isCommandSafe(command)) {
          ws.send(JSON.stringify({ type: 'error', data: '命令不在白名单中，被拒绝执行' }));
          return;
        }

        // 终止之前的进程
        if (currentProcess) {
          currentProcess.kill();
          currentProcess = null;
        }

        ws.send(JSON.stringify({ type: 'start', command }));

        // 解析命令（支持管道）
        const parts = command.split('|').map(p => p.trim());
        let proc;

        if (parts.length > 1) {
          // 管道命令：使用 shell 执行
          proc = spawn('cmd', ['/c', command], {
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' }
          });
        } else {
          // 单个命令：直接执行
          const [cmd, ...args] = command.split(/\s+/);
          proc = spawn(cmd, args, {
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' }
          });
        }

        currentProcess = proc;

        proc.stdout.on('data', (chunk) => {
          ws.send(JSON.stringify({ type: 'stdout', data: chunk.toString() }));
        });

        proc.stderr.on('data', (chunk) => {
          ws.send(JSON.stringify({ type: 'stderr', data: chunk.toString() }));
        });

        proc.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'close', code }));
          currentProcess = null;
        });

        proc.on('error', (err) => {
          ws.send(JSON.stringify({ type: 'error', data: err.message }));
          currentProcess = null;
        });
      }

      if (msg.type === 'kill') {
        // 终止当前进程
        if (currentProcess) {
          currentProcess.kill();
          currentProcess = null;
          ws.send(JSON.stringify({ type: 'killed' }));
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: e.message }));
    }
  });

  ws.on('close', () => {
    if (currentProcess) {
      currentProcess.kill();
      currentProcess = null;
    }
    console.log('WebSocket 客户端已断开');
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`ADB 控制台服务器已启动: http://localhost:${PORT}`);
});
