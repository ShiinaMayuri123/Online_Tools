# Antigravity 的在线工具箱

基于 **Vite + React + Tailwind CSS + Firebase** 构建的现代化工具集合网站。

## 功能概览

| 工具 | 说明 | 特点 |
|------|------|------|
| 长图拼接 | 多张截图拼接为一张长图 | 支持纵横拼接、画质调节、导出 JPEG/PNG/PDF |
| 安全密码生成器 | 本地离线生成高强度密码 | Web Crypto API 加密随机、强度检测 |
| 机器人测试记录管理 | 设备信息 + 测试记录管理 | Firebase 实时同步、跨设备共享 |
| 机器人现场运维平台 | 局域网内连接 Android 机器人并执行 ADB 调试 | 命令库、参数补全、终端确认、高风险命令提醒 |
| 进制转换 | 二/八/十/十六进制互转 | BigInt 大数支持 |
| IP 一致性查询 | 多源并发查询真实出口 IP | 10 源投票、代理检测、地理位置一致性 |
| NewAPI | API 管理平台 | 外链跳转 |

## 技术栈

- **前端**: React 19 + Vite 8 + Tailwind CSS 4
- **后端**: Firebase Authentication + Cloud Firestore
- **路由**: react-router-dom 7 (HashRouter，纯静态部署)
- **安全**: Web Crypto API、Firebase 安全规则、角色权限控制

## 项目亮点

### 1. 跨设备实时同步
基于 Firebase Firestore 的 `onSnapshot` 实时监听，任何设备上的数据变更都会即时同步到所有已登录设备。机器人测试记录工具的核心能力——多人协作、多设备同步。

### 2. 完整的认证与权限系统
- 邮箱密码登录 (Firebase Authentication)
- 角色权限控制：管理员 / 普通用户
- 路由守卫：未登录自动跳转登录页
- 管理后台：用户列表查看、角色切换

### 3. 安全的密码生成
- 使用 `crypto.getRandomValues()` 替代不安全的 `Math.random()`
- Fisher-Yates 洗牌算法替代有偏排序
- 所有计算在浏览器本地完成，密码不离开设备

### 4. 7 种颜色主题
Minimal、Ocean、Aurora、Neon、Sunset、Onyx、Crimson，通过 Context API 全局切换，所有颜色使用 Tailwind CSS 类名。

### 5. 响应式设计
所有页面适配手机、平板、桌面三种尺寸，使用 Tailwind 的 sm/lg 断点。

### 6. 现场 ADB 调试

ADB 调试助手位于 `#/adb`。网页不能直接调用用户电脑上的 `adb.exe`，现场使用时需要先在笔记本上启动轻量连接助手，再由网页通过本机回环地址调用 ADB。

- 连接助手自动检测本机 ADB，不需要用户配置 Node.js 或 PATH
- 网页自动发现连接助手，不需要手动输入 Token
- 电脑和机器人处于同一局域网后，可输入设备 IP 建立 TCP/IP 连接
- 命令卡片先填入终端，再由用户点击执行或按 Enter
- 高风险命令会进行额外确认

连接助手开发说明见 [`local-agent/README.md`](local-agent/README.md)，现场用户说明见 [`local-agent/QUICK_START.md`](local-agent/QUICK_START.md)。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打包
npm run build
```

### 启动本地连接助手（开发/测试）

```bash
npm run agent:install
npm run agent
```

Windows 发布包使用 `local-agent/build.bat` 生成。发布包中需要同时包含 `adb-agent.exe`、`adb.exe` 和 Platform Tools DLL；现场同事只需双击 `adb-agent.exe`，再打开网页即可。

## 部署配置

1. 在 [Firebase Console](https://console.firebase.google.com/) 创建项目
2. 启用 Authentication（邮箱/密码）和 Firestore
3. 复制 `.env.example` 为 `.env`，填入 Firebase 配置
4. 在 Firestore 的 `users` 集合中创建管理员文档
5. `npm run build` 打包后部署 `dist/` 目录

## 目录结构

```
src/
├── components/          # 公共 UI、网络工具和机器人运维组件
├── config/              # 主题、工具入口和 ADB 命令数据
├── contexts/            # 主题与 Firebase 认证全局状态
├── hooks/               # 剪贴板、IP 数据等复用 Hooks
├── pages/               # 各个工具页面
├── utils/               # 图片拼接等纯工具函数
├── App.jsx              # Hash 路由、认证路由守卫
└── main.jsx             # React 应用入口
local-agent/             # Windows 本地 ADB 连接助手
server/                  # 开发/辅助服务端接口
public/                  # 静态资源和下载页面
```

完整到每个源码文件的职责说明见 [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)。
