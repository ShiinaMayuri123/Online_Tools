# ADB 本地代理实现总结

## 📦 新增文件

### 1. `local-agent/` 目录

本地代理程序，用于在用户本机运行，调用本地 `adb.exe`。

| 文件 | 说明 |
|------|------|
| `index.js` | 主入口，HTTP + WebSocket 服务器 |
| `adb-finder.js` | ADB 路径检测模块 |
| `port-finder.js` | 端口探测模块 |
| `package.json` | 依赖配置 |
| `build.bat` | Windows 打包脚本 |
| `.gitignore` | Git 忽略配置 |
| `README.md` | 使用说明 |
| `RELEASE.md` | 发布指南 |

### 2. `src/components/robot/` 目录

| 文件 | 说明 |
|------|------|
| `LocalAgentGuide.jsx` | 本地代理引导组件 |

### 3. `docs/` 目录

| 文件 | 说明 |
|------|------|
| `adb-local-agent-guide.md` | 用户使用指南 |
| `local-agent-implementation-summary.md` | 本文档 |

## ✏️ 修改文件

### 1. `src/components/robot/AdbConsole.jsx`

**主要改动**：

1. **本地代理检测**
   - 新增 `detectLocalAgent()` 函数，自动检测本地代理是否运行
   - 尝试端口：5038, 5039, 5040, 12553, 12554
   - 超时时间：1 秒

2. **Token 配对机制**
   - 移除旧的 API 密钥输入
   - 新增 Token 配对界面
   - Token 持久化保存到 `localStorage`

3. **动态 API 地址**
   - 所有 HTTP 请求使用检测到的代理地址
   - WebSocket 连接使用代理地址 + Token

4. **UI 改进**
   - 标题栏显示本地代理状态
   - 未连接代理时禁用命令区域
   - 新增"流式执行"按钮（用于 logcat 等实时输出）

**关键代码改动**：

```javascript
// 新增状态
const [agentBaseUrl, setAgentBaseUrl] = useState(null);
const [agentDetecting, setAgentDetecting] = useState(true);
const [agentToken, setAgentToken] = useState(getApiKey());

// 新增函数
const detectLocalAgent = async () => { ... };
const connectWebSocket = (baseUrl, token) => { ... };
const handleTokenSubmit = (token) => { ... };
const refreshAgentDetection = async () => { ... };

// 修改的函数
const executeHttp = async (command) => { ... };  // 使用 agentBaseUrl
const handleConnect = async () => { ... };        // 使用 agentBaseUrl
const handleDisconnect = async (device) => { ... }; // 使用 agentBaseUrl
const refreshDevices = async () => { ... };       // 使用 agentBaseUrl
```

## 🏗️ 架构设计

### 之前（服务器模式）

```
浏览器 → 你的服务器 (localhost:3001) → 服务器的 adb
```

**问题**：
- 需要服务器运行 adb
- 需要配置 CORS、API 密钥
- 无法访问用户本地设备

### 现在（本地代理模式）

```
浏览器 → 用户本地代理 (localhost:5038) → 用户本地的 adb
```

**优势**：
- 无需服务器运行 adb
- 用户设备在同一局域网，延迟最低
- 安全性更高（只监听 localhost）
- 用户体验更好（下载 exe，双击运行）

## 🔐 安全机制

1. **本地监听**：只监听 `127.0.0.1`，不暴露到公网
2. **Token 鉴权**：启动时生成随机 Token，用户需手动配对
3. **命令白名单**：只允许执行 `adb` 开头的命令
4. **禁止注入**：检测并拒绝包含特殊字符的命令
5. **黑名单**：禁止高风险命令（如 `adb reboot recovery`）
6. **超时控制**：HTTP 请求 30 秒超时，可手动终止

## 📊 数据流

### 1. 启动流程

```
用户双击 adb-agent.exe
  ↓
启动 HTTP + WebSocket 服务器
  ↓
生成/读取 Token
  ↓
打开浏览器配对页面
  ↓
显示 Token 给用户
```

### 2. 配对流程

```
用户在网页上粘贴 Token
  ↓
点击"配对"按钮
  ↓
Token 保存到 localStorage
  ↓
建立 WebSocket 连接
  ↓
显示"代理已连接"
```

### 3. 命令执行流程

```
用户点击命令按钮
  ↓
前端发送 HTTP POST /adb/exec
  ↓
后端验证 Token
  ↓
后端执行 adb 命令
  ↓
返回 stdout/stderr
  ↓
前端显示结果
```

### 4. 实时输出流程

```
用户点击"流式执行"按钮
  ↓
前端发送 WebSocket 消息
  ↓
后端启动子进程
  ↓
实时推送 stdout/stderr
  ↓
前端实时显示
```

## 🧪 测试清单

- [ ] 本地代理正常启动
- [ ] 配对页面自动打开
- [ ] Token 复制功能正常
- [ ] 前端检测到本地代理
- [ ] Token 配对成功
- [ ] WebSocket 连接成功
- [ ] 设备列表刷新正常
- [ ] WiFi 连接设备成功
- [ ] USB 连接设备成功
- [ ] 命令执行正常
- [ ] 实时输出正常
- [ ] 命令终止正常
- [ ] 错误处理正常

## 🚀 部署步骤

### 1. 打包本地代理

```bash
cd local-agent
npm install
build.bat
```

### 2. 上传到 GitHub Releases

1. 进入 GitHub 仓库页面
2. 点击 "Releases" → "Create a new release"
3. 填写 Tag version（如 `v1.0.0`）
4. 上传 `dist/adb-agent.exe` 文件
5. 填写 Release notes
6. 点击 "Publish release"

### 3. 更新前端下载链接

编辑 `src/components/robot/LocalAgentGuide.jsx`：

```javascript
<a
  href="https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest/download/adb-agent.exe"
  ...
>
  下载 adb-agent.exe
</a>
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: 实现 ADB 本地代理方案"
git push origin main
```

## 📈 后续优化

1. **自动更新**：检查 GitHub Releases 获取新版本
2. **数字签名**：避免 Windows SmartScreen 警告
3. **多设备管理**：支持同时连接多个设备
4. **命令历史**：保存用户执行过的命令
5. **设备信息**：显示更详细的设备信息
6. **日志导出**：支持导出 logcat 日志

## 📚 相关文档

- [用户使用指南](./adb-local-agent-guide.md)
- [本地代理 README](../local-agent/README.md)
- [发布指南](../local-agent/RELEASE.md)
