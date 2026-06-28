# ADB 本地代理

在用户本机运行的轻量级代理程序，调用本地 `adb.exe`，提供 HTTP API 和 WebSocket 接口，让网页能够执行 ADB 命令。

## 📋 前置要求

在使用本地代理之前，需要安装 ADB 工具：

1. 访问 [Android SDK Platform Tools 官方下载页面](https://developer.android.com/studio/releases/platform-tools)
2. 下载 Windows 版本的 Platform Tools
3. 解压到任意目录（如 `C:\platform-tools`）
4. 将目录添加到系统 PATH 环境变量，或将 `adb.exe` 复制到本程序同目录

## 📥 获取方式

### 方式一：从源码构建（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/ShiinaMayuri123/Online_Tools.git
cd Online_Tools/local-agent

# 2. 安装依赖
npm install

# 3. 打包
build.bat
# 或手动打包: npm run build

# 4. 输出文件在 dist/adb-agent.exe
```

### 方式二：直接运行（需要 Node.js）

```bash
# 1. 克隆仓库
git clone https://github.com/ShiinaMayuri123/Online_Tools.git
cd Online_Tools/local-agent

# 2. 安装依赖
npm install

# 3. 启动
npm start
# 或运行 start.bat
```

## ✨ 特性

- 🔒 **安全**：只监听 `127.0.0.1`，不暴露到公网
- 🔑 **Token 鉴权**：启动时生成随机 Token，防止未授权访问
- 🛡️ **命令白名单**：只允许执行 ADB 命令，禁止危险操作
- 📍 **自动检测**：自动查找用户电脑上的 `adb.exe`
- 🌐 **跨平台**：支持 Windows、macOS、Linux
- 📊 **一键扫描**：支持批量执行 15 条 ADB 命令，一次性获取设备全部信息

## 📋 前置要求

1. **Node.js 18+**（开发环境）或下载打包后的 exe（无需安装）
2. **ADB 工具**：确保 `adb.exe` 在 PATH 中，或放在程序同目录

### 安装 ADB

1. 下载 [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
2. 解压到任意目录
3. 将目录添加到系统 PATH，或直接将 `adb.exe` 复制到本程序目录

## 🚀 快速开始

### 方式一：直接运行（开发模式）

```bash
# 进入目录
cd local-agent

# 安装依赖
npm install

# 启动
npm start
```

### 方式二：打包成 exe（推荐）

```bash
# Windows
build.bat

# 或手动打包
npm install
npm install -g pkg
npm run build
```

打包完成后，在 `dist` 目录找到 `adb-agent.exe`，双击即可运行。

## 📖 使用方法

1. **启动代理**
   - 双击运行 `adb-agent.exe`（或 `npm start`）
   - 控制台会显示 API Token

2. **配对**
   - 程序会自动打开配对页面
   - 复制 Token
   - 在 ADB 控制台网页上粘贴 Token 并点击"配对"

3. **连接设备**
   - 确保手机和电脑在同一局域网
   - 手机开启 USB 调试
   - 首次需要通过 USB 执行 `adb tcpip 5555`
   - 在网页上输入手机 IP 地址，点击"连接"

4. **执行命令**
   - 使用预设的命令按钮
   - 或输入自定义 ADB 命令
   - 或使用"一键扫描"批量获取设备信息

## 📡 API 接口

### 一键扫描设备信息

批量执行 15 条 ADB 命令，一次性获取设备全部基本信息。

```
POST /adb/device-info/scan
Authorization: Bearer <token>
```

返回字段：
| 字段 | 说明 | ADB 命令 |
|------|------|----------|
| `devices_l` | 连接设备列表 | `adb devices -l` |
| `android_version` | Android 版本 | `adb shell getprop ro.build.version.release` |
| `device_model` | 设备型号 | `adb shell getprop ro.product.model` |
| `device_name` | 设备品牌 | `adb shell getprop ro.product.brand` |
| `serial_number` | 序列号 | `adb shell getprop ro.serialno` |
| `screen_resolution` | 屏幕分辨率 | `adb shell wm size` |
| `screen_density` | 屏幕密度 | `adb shell wm density` |
| `battery_status` | 电池状态 | `adb shell dumpsys battery` |
| `device_time` | 设备时间 | `adb shell date` |
| `uptime` | 运行时长 | `adb shell uptime` |
| `cpu_info` | CPU 信息 | `adb shell cat /proc/cpuinfo` |
| `memory_info` | 内存信息 | `adb shell cat /proc/meminfo` |
| `disk_usage` | 磁盘使用 | `adb shell df -h` |
| `ip_address` | IP 地址 | `adb shell ip addr` |

返回示例：
```json
{
  "success": true,
  "data": {
    "android_version": { "value": "8.1.0", "error": null },
    "device_model": { "value": "NanoPC-T4", "error": null },
    "battery_status": { "value": { "level": 85, "status": "Charging", "temperature": 26.0, "health": "Good" }, "error": null }
  }
}
```

### 其他接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查（无需认证） |
| `GET` | `/adb/devices` | 获取设备列表 |
| `POST` | `/adb/connect` | 连接设备 |
| `POST` | `/adb/disconnect` | 断开连接 |
| `POST` | `/adb/exec` | 执行单条 ADB 命令 |
| `WS` | `/ws?token=xxx` | WebSocket 实时输出 |

## 🔧 配置

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `AGENT_PORT` | `5038` | 监听端口（自动探测备用端口） |

### 修改允许的来源

编辑 `index.js` 中的 `ALLOWED_ORIGINS`：

```javascript
const ALLOWED_ORIGINS = [
  'https://your-domain.com',  // 你的网站域名
  'http://localhost:5173'      // 本地开发
];
```

## 🏗️ 项目结构

```
local-agent/
├── index.js          # 主入口（HTTP + WebSocket 服务器）
├── adb-finder.js     # ADB 路径检测
├── port-finder.js    # 端口探测
├── package.json      # 依赖配置
├── build.bat         # Windows 打包脚本
└── README.md         # 说明文档
```

## 🔒 安全说明

1. **本地监听**：只监听 `127.0.0.1`，外部无法访问
2. **Token 鉴权**：每次请求需要携带有效 Token
3. **命令白名单**：只允许执行 `adb` 开头的命令
4. **禁止注入**：检测并拒绝包含特殊字符的命令
5. **黑名单**：禁止高风险命令（如 `adb reboot recovery`）

## ❓ 常见问题

### Q: 提示"未找到 adb.exe"怎么办？

A: 确保以下任一条件满足：
- `adb.exe` 在系统 PATH 中
- 将 `adb.exe` 复制到程序同目录
- 安装 Android SDK Platform Tools

### Q: 端口被占用怎么办？

A: 程序会自动尝试备用端口（5039, 5040, 12553 等）。也可以手动指定：
```bash
set AGENT_PORT=8080
npm start
```

### Q: Windows 防火墙弹窗怎么办？

A: 点击"允许访问"，选择"专用网络"。程序只监听本地，不会有安全风险。

### Q: 如何连接 WiFi 调试的设备？

A: 
1. 先用 USB 连接手机
2. 执行 `adb tcpip 5555`
3. 拔掉 USB
4. 在网页上输入手机的局域网 IP 地址

### Q: Node.js v24 报错 `SyntaxError: Unexpected reserved word` 怎么办？

A: 这是 Node.js v24 对 `await import()` 的兼容性问题。已修复：将 `child_process` 改为文件顶部静态导入。请确保使用最新版本代码。

A: 
1. 先用 USB 连接手机
2. 执行 `adb tcpip 5555`
3. 拔掉 USB
4. 在网页上输入手机的局域网 IP 地址

## 📄 许可证

MIT License
