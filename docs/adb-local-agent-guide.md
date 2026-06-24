# ADB 本地代理使用指南

## 📋 概述

本项目采用**本地代理方案**实现 ADB 局域网调试，让用户在自己电脑上运行轻量级代理程序，通过浏览器控制 Android 设备。

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│  用户电脑                                                        │
│  ┌─────────────────┐      localhost:5038      ┌─────────────────┐│
│  │   浏览器         │  ◄──────────────────►  │  本地代理 (exe)  ││
│  │   你的网站       │                         │  调用 adb.exe   ││
│  └─────────────────┘                         └─────────────────┘│
│                                                           │     │
│                                                           ▼     │
│                                                   ┌─────────────┐│
│                                                   │  Android 设备││
│                                                   │  (USB/WiFi) ││
│                                                   └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 第一步：下载本地代理

1. 访问 [GitHub Releases](https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest)
2. 下载 `adb-agent.exe`
3. 保存到任意目录（建议不要放在系统盘）

### 第二步：运行本地代理

1. 双击运行 `adb-agent.exe`
2. 程序会自动打开配对页面
3. 复制显示的 Token

**注意**：
- 首次运行可能被 Windows Defender 拦截，点击"更多信息" → "仍要运行"
- 防火墙弹窗请选择"允许访问"（专用网络）

### 第三步：配对 Token

1. 打开 ADB 控制台网页
2. 在"本地代理"区域找到"Token 配对"
3. 粘贴刚才复制的 Token
4. 点击"配对"按钮

### 第四步：连接设备

1. 确保手机和电脑在同一局域网
2. 手机开启 USB 调试（设置 → 开发者选项 → USB 调试）
3. 首次需要用 USB 线连接电脑，执行以下命令：
   ```bash
   adb tcpip 5555
   ```
4. 拔掉 USB 线
5. 在网页上输入手机的 IP 地址
6. 点击"连接"

## 📱 如何查看手机 IP

### 方法一：设置查看
- 设置 → 关于手机 → 状态 → IP 地址
- 或设置 → WLAN → 点击已连接的网络

### 方法二：ADB 命令查看
```bash
adb shell ip addr show wlan0
```

## 🛠️ 常见问题

### Q1: 提示"未找到 adb.exe"怎么办？

**解决方案**：
1. 下载 [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
2. 解压到任意目录
3. 将目录添加到系统 PATH，或直接将 `adb.exe` 复制到 `adb-agent.exe` 同目录

### Q2: 端口被占用怎么办？

程序会自动尝试备用端口（5039, 5040, 12553 等）。如果所有端口都被占用：
1. 关闭占用端口的程序
2. 或手动指定端口：
   ```bash
   set AGENT_PORT=8080
   adb-agent.exe
   ```

### Q3: Windows 防火墙弹窗怎么办？

点击"允许访问"，选择"专用网络"。程序只监听 `127.0.0.1`，不会有安全风险。

### Q4: 连接设备失败怎么办？

**检查清单**：
- [ ] 手机和电脑在同一局域网
- [ ] 手机已开启 USB 调试
- [ ] 首次已通过 USB 执行 `adb tcpip 5555`
- [ ] 手机 IP 地址输入正确
- [ ] 手机未锁屏（部分手机需要）

### Q5: 如何使用 USB 连接？

1. 用 USB 线连接手机和电脑
2. 手机上点击"允许 USB 调试"
3. 在网页上点击"刷新设备列表"
4. 应该能看到 USB 连接的设备

## 🔧 高级配置

### 修改监听端口

```bash
# Windows
set AGENT_PORT=8080
adb-agent.exe

# 或创建启动脚本 start.bat
@echo off
set AGENT_PORT=8080
adb-agent.exe
```

### 修改允许的来源

编辑 `local-agent/index.js` 中的 `ALLOWED_ORIGINS`：

```javascript
const ALLOWED_ORIGINS = [
  'https://your-domain.com',  // 你的网站域名
  'http://localhost:5173'      // 本地开发
];
```

然后重新打包：
```bash
cd local-agent
npm run build
```

## 🏗️ 从源码构建

如果你想自己编译本地代理：

### 1. 安装依赖

```bash
cd local-agent
npm install
```

### 2. 打包

```bash
# Windows
build.bat

# 或手动打包
npm install -g pkg
npm run build
```

### 3. 输出

打包完成后，在 `dist` 目录找到 `adb-agent.exe`。

## 🔒 安全说明

1. **本地监听**：只监听 `127.0.0.1`，外部无法访问
2. **Token 鉴权**：每次请求需要携带有效 Token
3. **命令白名单**：只允许执行 `adb` 开头的命令
4. **禁止注入**：检测并拒绝包含特殊字符的命令
5. **黑名单**：禁止高风险命令（如 `adb reboot recovery`）

## 📊 技术细节

### 本地代理功能

- **HTTP API**：
  - `GET /health` - 健康检查
  - `GET /adb/devices` - 获取设备列表
  - `POST /adb/connect` - 连接设备
  - `POST /adb/disconnect` - 断开连接
  - `POST /adb/exec` - 执行命令

- **WebSocket**：
  - `/ws` - 实时流式输出（如 logcat）

### 自动检测

前端会自动检测本地代理是否运行：
- 尝试端口：5038, 5039, 5040, 12553, 12554
- 超时时间：1 秒
- 检测间隔：组件挂载时检测一次

## 📚 相关文档

- [ADB 命令参考](./adb-commands.md)
- [故障排查指南](./troubleshooting.md)
- [本地代理开发文档](../local-agent/README.md)

## 💡 提示

- 程序启动后会自动打开配对页面
- Token 持久化保存在 `agent.token` 文件中
- 如果 Token 丢失，删除 `agent.token` 文件会重新生成
- 支持同时连接多个设备（通过 IP 地址切换）
