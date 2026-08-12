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
import { spawn, exec } from 'child_process';
import crypto from 'crypto';
import multer from 'multer';
import { ZipArchive } from 'archiver';
import { createReadStream, createWriteStream, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, join, posix, relative, resolve } from 'path';
import { findAdb, checkAdbAvailable } from './adb-finder.js';
import { findAvailablePort, DEFAULT_PORT } from './port-finder.js';

// ============ 配置 ============

const __dirname = process.pkg ? dirname(process.execPath) : process.cwd();
const runtimeDir = process.pkg ? dirname(process.execPath) : __dirname;
const DIST_DIR = process.pkg ? join(runtimeDir, 'frontend-dist') : join(__dirname, '..', 'dist');
const TOKEN_FILE = join(runtimeDir, 'agent.token');
const ALLOWED_ORIGINS = ['*']; // 开发时允许所有来源，生产环境改为你的域名
const FILE_ROOT = '/sdcard';
const MUTATION_ROOTS = ['/sdcard/pudu', '/sdcard/PuduRobotMap', '/sdcard/PuduRobotLog', '/sdcard/pdconfig'];
const TRANSFER_ROOT = join(runtimeDir, 'adb-transfers');
const TRANSFER_TTL_MS = 30 * 60 * 1000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const AGENT_VERSION = '1.1.0';
const AGENT_PROTOCOL_VERSION = 1;
const PROTOCOL_START = process.argv.includes('--protocol-start');
const NO_BROWSER = process.argv.includes('--no-browser');
const transferTasks = new Map();
const transferFiles = new Map();

mkdirSync(TRANSFER_ROOT, { recursive: true });

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
let wss = null;
app.use(express.json());

// CORS 中间件
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Length');
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
    let settled = false;
    let timeoutId;

    options.onProcess?.(proc);

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => {
      const text = d.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    proc.on('close', code => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ stdout, stderr, code });
    });
    proc.on('error', err => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });

    // 超时处理
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
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

function safeRemove(target) {
  try {
    rmSync(target, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[ADB] 清理临时文件失败: ${error.message}`);
  }
}

function normalizeRemotePath(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || value.includes('\\')) {
    throw new Error('路径格式无效');
  }
  const input = value.trim();
  if (!input.startsWith('/') || input.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('路径格式无效');
  }
  const normalized = posix.normalize(input);
  if (normalized !== FILE_ROOT && !normalized.startsWith(`${FILE_ROOT}/`)) {
    throw new Error('路径不在 /sdcard 范围内');
  }
  return normalized;
}

function isWithinRoot(target, root) {
  return target === root || target.startsWith(`${root}/`);
}

function assertMutationPath(value, allowRoot = false) {
  const target = normalizeRemotePath(value);
  const allowed = MUTATION_ROOTS.some(root => isWithinRoot(target, root));
  if (!allowed || (!allowRoot && MUTATION_ROOTS.includes(target))) {
    throw new Error('路径不在允许修改的范围内');
  }
  return target;
}

function validateDevice(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error('设备序列号格式无效');
  }
  return value;
}

async function resolveDevice(value) {
  const requested = validateDevice(value);
  if (requested) return requested;
  const { stdout } = await runAdb(['devices']);
  const devices = stdout
    .split(/\r?\n/)
    .map(line => line.trim().split(/\s+/))
    .filter(parts => parts.length >= 2 && parts[1] === 'device')
    .map(parts => parts[0]);
  if (devices.length !== 1) {
    throw new Error(devices.length === 0 ? '没有可用的 ADB 设备' : '检测到多台设备，请先选择目标设备');
  }
  return devices[0];
}

function adbArgs(device, args) {
  return ['-s', device, ...args];
}

async function assertNoSymlinkAncestors(target, device) {
  const segments = target.split('/').filter(Boolean);
  let current = '';
  for (const segment of segments) {
    current += `/${segment}`;
    const result = await runAdb(adbArgs(device, ['shell', 'ls', '-ld', current]), { timeout: 10000 });
    if (result.code !== 0) throw new Error(result.stderr.trim() || `无法访问 ${current}`);
    const line = result.stdout.trim().split(/\r?\n/).find(Boolean) || '';
    if (line.startsWith('l') && current !== FILE_ROOT) throw new Error('路径包含符号链接，已拒绝操作');
  }
}

function parseLsLine(line) {
  const normalized = line.trim();
  if (!normalized || normalized.startsWith('total ')) return null;
  const match = normalized.match(/^([bcdlps-][rwx-]{9})\s+\S+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s+(.+)$/);
  if (!match) return null;
  const [, perm, size, date, time, rawName] = match;
  const name = rawName.split(' -> ')[0];
  if (name === '.' || name === '..') return null;
  return {
    name,
    type: perm[0] === 'd' ? 'dir' : perm[0] === 'l' ? 'link' : 'file',
    size: Number(size),
    mtime: `${date} ${time}`,
    perm,
  };
}

async function listRemoteDirectory(path, device) {
  await assertNoSymlinkAncestors(path, device);
  const listPath = path === FILE_ROOT ? `${path}/` : path;
  const result = await runAdb(adbArgs(device, ['shell', 'ls', '-lan', listPath]), { timeout: 30000 });
  if (result.code !== 0) throw new Error(result.stderr.trim() || '读取目录失败');
  return result.stdout.split(/\r?\n/).map(parseLsLine).filter(Boolean);
}

async function getRemoteType(path, device) {
  if (path === FILE_ROOT) return 'dir';
  const result = await runAdb(adbArgs(device, ['shell', 'ls', '-ld', path]), { timeout: 10000 });
  if (result.code !== 0) throw new Error(result.stderr.trim() || '目标不存在');
  const line = result.stdout.trim().split(/\r?\n/).find(Boolean) || '';
  if (line.startsWith('d')) return 'dir';
  if (line.startsWith('l')) return 'link';
  return 'file';
}

function createTransfer(type, device, label) {
  const task = {
    id: crypto.randomUUID(),
    type,
    device,
    label,
    status: 'queued',
    progress: null,
    phase: '等待执行',
    message: '',
    fileId: null,
    fileName: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    proc: null,
    cleanupPaths: [],
  };
  transferTasks.set(task.id, task);
  broadcastTransfer(task);
  return task;
}

function updateTransfer(task, patch) {
  Object.assign(task, patch, { updatedAt: Date.now() });
  broadcastTransfer(task);
}

function publicTransfer(task) {
  return {
    taskId: task.id,
    type: task.type,
    label: task.label,
    status: task.status,
    progress: task.progress,
    phase: task.phase,
    message: task.message,
    fileId: task.fileId,
    fileName: task.fileName,
    error: task.error,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function broadcastTransfer(task) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'transfer', data: publicTransfer(task) });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

function registerTransferFile(task, filePath, fileName) {
  const fileId = crypto.randomUUID();
  transferFiles.set(fileId, { fileId, filePath, fileName, taskId: task.id, expiresAt: Date.now() + TRANSFER_TTL_MS });
  task.fileId = fileId;
  task.fileName = fileName;
}

function zipDirectory(sourcePath, destinationPath) {
  return new Promise((resolveZip, rejectZip) => {
    const output = createWriteStream(destinationPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on('close', resolveZip);
    archive.on('error', rejectZip);
    archive.pipe(output);
    archive.directory(sourcePath, false);
    archive.finalize();
  });
}

function cleanExpiredTransfers() {
  const now = Date.now();
  transferFiles.forEach((file, fileId) => {
    if (file.expiresAt <= now) {
      safeRemove(file.filePath);
      transferFiles.delete(fileId);
    }
  });
  transferTasks.forEach((task, taskId) => {
    if (task.status !== 'running' && now - task.updatedAt > TRANSFER_TTL_MS) {
      task.cleanupPaths.forEach(safeRemove);
      transferTasks.delete(taskId);
    }
  });
}

setInterval(cleanExpiredTransfers, 5 * 60 * 1000).unref();

function sanitizeFilename(value) {
  const name = String(value || '').replace(/^.*[\\/]/, '').replace(/[\0\r\n]/g, '').trim();
  if (!name || name === '.' || name === '..' || name.length > 180) {
    throw new Error('文件名无效');
  }
  return name;
}

function createTransferDirectory(task) {
  const taskDir = join(TRANSFER_ROOT, task.id);
  mkdirSync(taskDir, { recursive: true });
  task.cleanupPaths.push(taskDir);
  return taskDir;
}

function updateProgressFromOutput(task, text) {
  const match = text.match(/(\d{1,3})%/);
  if (match) updateTransfer(task, { progress: Math.min(100, Number(match[1])), message: text.trim() });
}

async function runTransferAdb(task, args, phase) {
  updateTransfer(task, { status: 'running', phase, progress: 0, error: null });
  const result = await runAdb(args, {
    timeout: 30 * 60 * 1000,
    onProcess: proc => { task.proc = proc; },
    onStderr: text => updateProgressFromOutput(task, text),
  });
  task.proc = null;
  if (task.status === 'cancelled') throw new Error('传输已取消');
  if (result.code !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || 'ADB 传输失败');
  return result;
}

function sendRouteError(res, error, fallbackStatus = 400) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.includes('不在允许') || message.includes('符号链接') ? 403 : fallbackStatus;
  res.status(status).json({ success: false, error: message });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const uploadDir = join(TRANSFER_ROOT, `upload-${crypto.randomUUID()}`);
      mkdirSync(uploadDir, { recursive: true });
      req.uploadDir = uploadDir;
      callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
      try {
        callback(null, `${crypto.randomUUID()}-${sanitizeFilename(file.originalname)}`);
      } catch (error) {
        callback(error);
      }
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

// ============ API 路由 ============

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    version: AGENT_VERSION,
    protocolVersion: AGENT_PROTOCOL_VERSION,
    adbPath,
    port: server.address()?.port
  });
});

// 获取 Token 信息（用于前端显示配对状态）
app.get('/token', (req, res) => {
  res.json({
    token: API_TOKEN,
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

// 文件管理器：读取实时目录
app.post('/adb/ls', checkAuth, async (req, res) => {
  try {
    const path = normalizeRemotePath(req.body?.path);
    const device = await resolveDevice(req.body?.device);
    if (await getRemoteType(path, device) !== 'dir') {
      return res.status(400).json({ success: false, error: '目标不是目录' });
    }
    const entries = await listRemoteDirectory(path, device);
    res.json({ success: true, path, entries, device });
  } catch (error) {
    sendRouteError(res, error);
  }
});

// 文件管理器：删除文件或目录
app.post('/adb/rm', checkAuth, async (req, res) => {
  try {
    const path = assertMutationPath(req.body?.path);
    if (req.body?.confirmTarget !== path) {
      return res.status(409).json({ success: false, requiresConfirmation: true, target: path, error: '请确认完整目标路径' });
    }
    const device = await resolveDevice(req.body?.device);
    await assertNoSymlinkAncestors(path, device);
    const type = await getRemoteType(path, device);
    const command = type === 'dir' ? ['shell', 'rm', '-rf', path] : ['shell', 'rm', '-f', path];
    const result = await runAdb(adbArgs(device, command), { timeout: 60 * 1000 });
    const success = result.code === 0;
    res.status(success ? 200 : 502).json({ success, ...result, error: success ? undefined : result.stderr.trim() || '删除失败' });
  } catch (error) {
    sendRouteError(res, error);
  }
});

// 文件管理器：创建拉取任务，目录会自动打包为 ZIP
app.post('/adb/pull', checkAuth, async (req, res) => {
  try {
    const remotePath = normalizeRemotePath(req.body?.remotePath || req.body?.path);
    const device = await resolveDevice(req.body?.device);
    await assertNoSymlinkAncestors(remotePath, device);
    const type = await getRemoteType(remotePath, device);
    if (type === 'link') throw new Error('暂不支持拉取符号链接');

    const task = createTransfer('pull', device, remotePath);
    const taskDir = createTransferDirectory(task);
    void (async () => {
      try {
        await runTransferAdb(task, adbArgs(device, ['pull', remotePath, taskDir]), '从设备拉取');
        const itemName = sanitizeFilename(basename(remotePath));
        const pulledPath = join(taskDir, itemName);
        if (!existsSync(pulledPath)) throw new Error('ADB 拉取完成，但未找到本地文件');
        let artifactPath = pulledPath;
        let artifactName = itemName;
        if (type === 'dir') {
          updateTransfer(task, { phase: '打包目录', progress: null });
          artifactName = `${itemName}.zip`;
          artifactPath = join(taskDir, artifactName);
          await zipDirectory(pulledPath, artifactPath);
        }
        registerTransferFile(task, artifactPath, artifactName);
        updateTransfer(task, { status: 'completed', phase: '已完成', progress: 100, message: '文件已准备下载' });
      } catch (error) {
        if (task.status !== 'cancelled') updateTransfer(task, { status: 'failed', phase: '失败', error: error.message });
      } finally {
        task.proc = null;
        if (task.status === 'failed' || task.status === 'cancelled') task.cleanupPaths.forEach(safeRemove);
      }
    })();
    res.status(202).json({ success: true, taskId: task.id, device });
  } catch (error) {
    sendRouteError(res, error);
  }
});

// 文件管理器：查询传输任务
app.get('/adb/transfer/:taskId', checkAuth, (req, res) => {
  const task = transferTasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: '传输任务不存在或已过期' });
  res.json({ success: true, data: publicTransfer(task) });
});

// 文件管理器：取消传输任务
app.delete('/adb/transfer/:taskId', checkAuth, (req, res) => {
  const task = transferTasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: '传输任务不存在或已过期' });
  if (task.status === 'running' && task.proc) task.proc.kill('SIGKILL');
  if (task.status === 'queued' || task.status === 'running') {
    updateTransfer(task, { status: 'cancelled', phase: '已取消', message: '用户取消了传输' });
    task.cleanupPaths.forEach(safeRemove);
  }
  res.json({ success: true, data: publicTransfer(task) });
});

// 文件管理器：下载已完成的临时文件
app.get('/adb/file', checkAuth, (req, res) => {
  const artifact = transferFiles.get(req.query.fileId);
  if (!artifact || artifact.expiresAt <= Date.now()) {
    return res.status(404).json({ success: false, error: '文件不存在或已过期' });
  }
  const root = resolve(TRANSFER_ROOT);
  const target = resolve(artifact.filePath);
  const relativeTarget = relative(root, target);
  if (relativeTarget.startsWith('..') || relativeTarget.includes(':')) {
    return res.status(403).json({ success: false, error: '文件路径无效' });
  }
  try {
    const size = statSync(target).size;
    const asciiName = artifact.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const encodedName = encodeURIComponent(artifact.fileName);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    const stream = createReadStream(target);
    stream.on('error', error => {
      if (!res.headersSent) res.status(500).json({ success: false, error: error.message });
    });
    stream.on('close', () => {
      safeRemove(target);
      transferFiles.delete(artifact.fileId);
    });
    stream.pipe(res);
  } catch (error) {
    transferFiles.delete(artifact.fileId);
    sendRouteError(res, error, 404);
  }
});

const uploadSingle = (req, res, next) => upload.single('file')(req, res, error => {
  if (error) return sendRouteError(res, error, error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  next();
});

// 文件管理器：上传文件并创建推送任务
app.post('/adb/push', checkAuth, uploadSingle, async (req, res) => {
  try {
    const remoteDir = assertMutationPath(req.body?.remoteDir, true);
    if (!req.file) return res.status(400).json({ success: false, error: '请选择要推送的文件' });
    const device = await resolveDevice(req.body?.device);
    await assertNoSymlinkAncestors(remoteDir, device);
    if (await getRemoteType(remoteDir, device) !== 'dir') throw new Error('推送目标不是目录');

    const fileName = sanitizeFilename(req.file.originalname);
    const remotePath = `${remoteDir}/${fileName}`;
    let exists = false;
    try {
      await getRemoteType(remotePath, device);
      exists = true;
    } catch {
      exists = false;
    }
    if (exists && req.body?.confirmTarget !== remotePath) {
      safeRemove(req.uploadDir);
      return res.status(409).json({ success: false, requiresConfirmation: true, target: remotePath, error: '目标文件已存在，请确认覆盖' });
    }

    const task = createTransfer('push', device, remotePath);
    task.cleanupPaths.push(req.uploadDir);
    void (async () => {
      try {
        await runTransferAdb(task, adbArgs(device, ['push', req.file.path, remoteDir]), '推送到设备');
        updateTransfer(task, { status: 'completed', phase: '已完成', progress: 100, message: exists ? '已覆盖原文件' : '文件已推送' });
      } catch (error) {
        if (task.status !== 'cancelled') updateTransfer(task, { status: 'failed', phase: '失败', error: error.message });
      } finally {
        task.proc = null;
        task.cleanupPaths.forEach(safeRemove);
      }
    })();
    res.status(202).json({ success: true, taskId: task.id, target: remotePath, device });
  } catch (error) {
    if (req.uploadDir) safeRemove(req.uploadDir);
    sendRouteError(res, error);
  }
});

function validatePackageName(value) {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(value)) {
    throw new Error('包名格式无效');
  }
  return value;
}

async function executeStructuredAdb(deviceValue, args) {
  const device = await resolveDevice(deviceValue);
  const result = await runAdb(adbArgs(device, args), { timeout: 60 * 1000 });
  return { device, ...result, success: result.code === 0 };
}

// 文件管理器：读取已安装应用
app.post('/adb/packages', checkAuth, async (req, res) => {
  try {
    const result = await executeStructuredAdb(req.body?.device, ['shell', 'pm', 'list', 'packages']);
    const packages = result.stdout.split(/\r?\n/).map(line => line.replace(/^package:/, '').trim()).filter(Boolean);
    res.status(result.success ? 200 : 502).json({ success: result.success, packages, device: result.device, error: result.success ? undefined : result.stderr.trim() });
  } catch (error) {
    sendRouteError(res, error);
  }
});

// 文件管理器：应用卸载、清除数据、强制停止
app.post('/adb/uninstall', checkAuth, async (req, res) => {
  try {
    const packageName = validatePackageName(req.body?.package);
    if (req.body?.confirmTarget !== packageName) return res.status(409).json({ success: false, requiresConfirmation: true, target: packageName, error: '请确认完整包名' });
    const result = await executeStructuredAdb(req.body?.device, ['shell', 'pm', 'uninstall', ...(req.body?.keepData ? ['-k'] : []), packageName]);
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post('/adb/app-clear', checkAuth, async (req, res) => {
  try {
    const packageName = validatePackageName(req.body?.package);
    if (req.body?.confirmTarget !== packageName) return res.status(409).json({ success: false, requiresConfirmation: true, target: packageName, error: '请确认完整包名' });
    const result = await executeStructuredAdb(req.body?.device, ['shell', 'pm', 'clear', packageName]);
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

app.post('/adb/app-force-stop', checkAuth, async (req, res) => {
  try {
    const packageName = validatePackageName(req.body?.package);
    const result = await executeStructuredAdb(req.body?.device, ['shell', 'am', 'force-stop', packageName]);
    res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    sendRouteError(res, error);
  }
});

/**
 * 解析 adb devices -l 输出为设备对象数组
 * @param {string} stdout - 原始输出
 * @returns {Array<{serial: string, state: string, details: object}>}
 */
function parseDevices(stdout) {
  const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('List'));
  return lines.map(line => {
    const parts = line.split(/\s+/);
    const serial = parts[0];
    const state = parts[1];
    const details = {};
    parts.slice(2).forEach(p => {
      const [key, val] = p.split(':');
      if (key && val) details[key] = val;
    });
    return { serial, state, details };
  });
}

/**
 * 解析 dumpsys battery 输出为结构化对象
 * @param {string} stdout - 原始输出
 * @returns {{level: number|null, status: string|null, temperature: number|null, health: string|null}}
 */
function parseBattery(stdout) {
  const getVal = (key) => {
    const match = stdout.match(new RegExp(key + ':\\s*(.+)'));
    return match ? match[1].trim() : null;
  };
  const level = getVal('level');
  const temperature = getVal('temperature');
  return {
    level: level ? parseInt(level, 10) : null,
    status: getVal('status'),
    temperature: temperature ? parseInt(temperature, 10) / 10 : null,
    health: getVal('health'),
  };
}

/**
 * 解析 df -h 输出为磁盘使用数组
 * Android 的 df -h 输出格式可能与标准 Linux 不同，需要兼容处理
 * @param {string} stdout - 原始输出
 * @returns {Array<{filesystem: string, total: string, used: string, available: string, usage: string}>}
 */
function parseDiskUsage(stdout) {
  const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Filesystem'));
  return lines
    .map(line => {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 5) {
        return {
          filesystem: parts[0],
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usage: parts[4],
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * 解析 /proc/cpuinfo 为摘要信息
 * @param {string} stdout - 原始输出
 * @returns {string}
 */
function parseCpuInfo(stdout) {
  const blocks = stdout.split('\n\n').filter(b => b.trim());
  const cores = blocks.length;
  const first = blocks[0] || '';
  const get = (key) => {
    const m = first.match(new RegExp(key + '\\s*:\\s*(.+)'));
    return m ? m[1].trim() : '';
  };
  return [
    `${cores} 核心`,
    `架构: ${get('CPU architecture') || get('model name') || '未知'}`,
    `型号: ${get('CPU part') || get('model name') || '未知'}`,
    `主频: ${get('BogoMIPS') || get('cpu MHz') || '?'} BogoMIPS`,
    `特性: ${get('Features') || '无'}`,
  ].join('\n');
}

/**
 * 解析 /proc/meminfo 为摘要信息
 * @param {string} stdout - 原始输出
 * @returns {string}
 */
function parseMemInfo(stdout) {
  const get = (key) => {
    const m = stdout.match(new RegExp(key + ':\\s+(\\d+)'));
    return m ? parseInt(m[1], 10) : 0;
  };
  const fmt = (kb) => {
    if (kb >= 1048576) return `${(kb / 1048576).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(0)} MB`;
    return `${kb} kB`;
  };
  const total = get('MemTotal');
  const free = get('MemFree');
  const available = get('MemAvailable');
  const cached = get('Cached');
  return [
    `总计: ${fmt(total)}`,
    `可用: ${fmt(available || free)}`,
    `空闲: ${fmt(free)}`,
    `缓存: ${fmt(cached)}`,
  ].join('\n');
}

// 扫描设备完整信息（并发执行 15 条 ADB 命令）
app.post('/adb/device-info/scan', checkAuth, async (req, res) => {
  // 定义 15 条 ADB 命令
  const commands = [
    { key: 'devices_l', args: ['devices', '-l'] },
    { key: 'android_version', args: ['shell', 'getprop', 'ro.build.version.release'] },
    { key: 'device_model', args: ['shell', 'getprop', 'ro.product.model'] },
    { key: 'device_name', args: ['shell', 'getprop', 'ro.product.brand'] },
    { key: 'serial_number', args: ['shell', 'getprop', 'ro.serialno'] },
    { key: 'screen_resolution', args: ['shell', 'wm', 'size'] },
    { key: 'screen_density', args: ['shell', 'wm', 'density'] },
    { key: 'battery_status', args: ['shell', 'dumpsys', 'battery'] },
    { key: 'device_time', args: ['shell', 'date'] },
    { key: 'uptime', args: ['shell', 'uptime'] },
    { key: 'cpu_info', args: ['shell', 'cat', '/proc/cpuinfo'] },
    { key: 'memory_info', args: ['shell', 'cat', '/proc/meminfo'] },
    { key: 'disk_usage', args: ['shell', 'df', '-h'] },
    { key: 'ip_address', args: ['shell', 'ip', 'addr'] },
    { key: 'getprop', args: ['shell', 'getprop'] },
  ];

  // 并发执行所有命令，单条失败不影响其他
  const results = await Promise.allSettled(
    commands.map(cmd => runAdb(cmd.args, { timeout: 10000 }))
  );

  // 组装返回数据
  const data = {};
  commands.forEach((cmd, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value.code === 0) {
      const stdout = result.value.stdout.trim();
      // 特殊字段解析
      if (cmd.key === 'devices_l') {
        data[cmd.key] = { value: parseDevices(result.value.stdout), error: null };
      } else if (cmd.key === 'battery_status') {
        data[cmd.key] = { value: parseBattery(stdout), error: null };
      } else if (cmd.key === 'disk_usage') {
        data[cmd.key] = { value: parseDiskUsage(stdout), error: null };
      } else if (cmd.key === 'cpu_info') {
        data[cmd.key] = { value: parseCpuInfo(stdout), error: null };
      } else if (cmd.key === 'memory_info') {
        data[cmd.key] = { value: parseMemInfo(stdout), error: null };
      } else if (cmd.key === 'screen_resolution') {
        // "Physical size: 1024x600" → "1024x600"
        const match = stdout.match(/(\d+x\d+)/);
        data[cmd.key] = { value: match ? match[1] : stdout, error: null };
      } else if (cmd.key === 'screen_density') {
        // "Physical density: 160" → "160dpi"
        const match = stdout.match(/(\d+)/);
        data[cmd.key] = { value: match ? `${match[1]}dpi` : stdout, error: null };
      } else if (cmd.key === 'device_time') {
        // "Fri Jan 18 17:05:19 CST 2013" → "2013-01-18 17:05:19"
        try {
          const d = new Date(stdout);
          if (!isNaN(d.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            data[cmd.key] = { value: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, error: null };
          } else {
            data[cmd.key] = { value: stdout, error: null };
          }
        } catch {
          data[cmd.key] = { value: stdout, error: null };
        }
      } else if (cmd.key === 'uptime') {
        // "17:05:19 up 15 min, 0 users, load average: 4.22, 4.56, 3.21" → "15 分钟"
        const match = stdout.match(/up\s+(.+?),\s+\d+\s+user/);
        if (match) {
          let up = match[1].trim();
          // 翻译常见英文
          up = up.replace(/(\d+)\s+min/, '$1 分钟');
          up = up.replace(/(\d+)\s+hours?/, '$1 小时');
          up = up.replace(/(\d+)\s+days?/, '$1 天');
          data[cmd.key] = { value: up, error: null };
        } else {
          data[cmd.key] = { value: stdout, error: null };
        }
      } else if (cmd.key === 'ip_address') {
        // 从 ip addr 中提取所有非 lo 接口的 IP 地址
        const ips = [];
        let currentIface = '';
        for (const line of stdout.split('\n')) {
          const ifaceMatch = line.match(/^\d+:\s+(\S+?):/);
          if (ifaceMatch) currentIface = ifaceMatch[1];
          const inetMatch = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
          if (inetMatch && currentIface !== 'lo') {
            ips.push(`${currentIface}: ${inetMatch[1]}`);
          }
        }
        data[cmd.key] = { value: ips.length > 0 ? ips.join('\n') : stdout, error: null };
      } else {
        data[cmd.key] = { value: stdout, error: null };
      }
    } else {
      const errMsg = result.status === 'rejected'
        ? result.reason?.message || '命令执行失败'
        : result.value.stderr?.trim() || `退出码: ${result.value.code}`;
      data[cmd.key] = { value: null, error: errMsg };
    }
  });

  res.json({ success: true, data });
});

// ============ WebSocket ============

const server = createServer(app);
wss = new WebSocketServer({ server, path: '/ws' });

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

// ============ 静态文件服务（前端页面） ============

// 如果 dist 目录存在，托管前端页面
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback：非 API 路由都返回 index.html
  app.use((req, res) => {
    if (req.path.startsWith('/adb/') || req.path.startsWith('/health') || req.path.startsWith('/token') || req.path.startsWith('/ws')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
  console.log(`[前端] 已加载: ${DIST_DIR}`);
} else {
  console.log('[前端] 未找到 dist 目录，仅提供 API 服务');
}

// ============ 启动服务器 ============

async function start() {
  const port = await findAvailablePort(DEFAULT_PORT);

  server.listen(port, '127.0.0.1', () => {
    const actualPort = server.address().port;
    const hasFrontend = existsSync(DIST_DIR);
    console.log('\n========================================');
    console.log('  ADB 本地代理已启动');
    console.log(`  地址: http://127.0.0.1:${actualPort}`);
    if (hasFrontend) {
      console.log(`  前端: http://127.0.0.1:${actualPort}/`);
    }
    console.log(`  WebSocket: ws://127.0.0.1:${actualPort}/ws`);
    console.log(`  API Token: ${API_TOKEN}`);
    console.log('========================================');
    if (!PROTOCOL_START && !NO_BROWSER) {
      try {
        const url = hasFrontend
          ? `http://127.0.0.1:${actualPort}/`
          : `http://127.0.0.1:${actualPort}/setup`;
        exec(`start ${url}`);
      } catch (e) {
        // 忽略打开浏览器失败
      }
    }
    console.log('\n请将上方 Token 复制到网页上进行配对\n');

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
