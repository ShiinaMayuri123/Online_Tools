# Antigravity 的在线工具箱

基于 **Vite + React + Tailwind CSS + Firebase** 构建的现代化工具集合网站。

## 功能概览

| 工具 | 说明 | 特点 |
|------|------|------|
| 长图拼接 | 多张截图拼接为一张长图 | 支持纵横拼接、画质调节、导出 JPEG/PNG/PDF |
| 安全密码生成器 | 本地离线生成高强度密码 | Web Crypto API 加密随机、强度检测 |
| 机器人测试记录管理 | 设备信息 + 测试记录管理 | Firebase 实时同步、跨设备共享 |
| 进制转换 | 二/八/十/十六进制互转 | BigInt 大数支持 |
| 查看当前 IP | 查询公网 IP 及地理位置 | 一键查询 |
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

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打包
npm run build
```

## 部署配置

1. 在 [Firebase Console](https://console.firebase.google.com/) 创建项目
2. 启用 Authentication（邮箱/密码）和 Firestore
3. 复制 `.env.example` 为 `.env`，填入 Firebase 配置
4. 在 Firestore 的 `users` 集合中创建管理员文档
5. `npm run build` 打包后部署 `dist/` 目录

## 目录结构

```
src/
├── components/common/   # 公共组件 (ToolLayout, ToolCard, ThemeSwitcher...)
├── contexts/            # 全局状态 (ThemeContext, AuthContext)
├── pages/               # 页面组件 (Home, Login, Admin, Stitcher...)
├── config/theme.jsx     # 主题配置 + 工具列表
├── firebase.js          # Firebase 初始化
├── App.jsx              # 路由 + 路由守卫
└── main.jsx             # 入口
```
