# CLAUDE.md - 项目开发指南

## 项目概述
Antigravity 的在线工具箱 — 基于 Vite + React + Tailwind CSS 构建的现代化工具集合网站。
采用单页应用 (SPA) 架构，使用 HashRouter 实现纯静态离线部署。

## 技术栈
- **构建工具**: Vite 8.x
- **前端框架**: React 19.x (JSX, Hooks)
- **样式方案**: Tailwind CSS 4.x (通过 @tailwindcss/vite 插件集成)
- **路由**: react-router-dom 7.x (HashRouter)
- **后端服务**: Firebase (Authentication + Firestore)
- **图标**: lucide-react
- **PDF导出**: jspdf (仅长图拼接工具使用)
- **代码检查**: ESLint 9.x

## 项目结构
```
src/
├── components/
│   ├── common/          # 公共组件
│   │   ├── ToolLayout.jsx        # 所有工具页面的公共布局（导航栏+内容区+页脚）
│   │   ├── ToolCard.jsx          # 首页工具卡片（新标签页打开）
│   │   ├── ThemeSwitcher.jsx     # 主题切换下拉菜单
│   │   ├── ParticleBackground.jsx # Canvas 粒子动画背景
│   │   └── ContactModal.jsx      # 联系开发者弹窗
│   └── stitcher/        # 长图拼接专属组件
│       └── ExportModal.jsx       # 导出设置弹窗
├── config/
│   └── theme.jsx        # THEMES 主题配置 + TOOLS 工具列表数据
├── contexts/
│   ├── ThemeContext.jsx  # 全局主题状态 (Context API)
│   └── AuthContext.jsx   # 全局认证状态 (Firebase Auth)
├── pages/               # 页面组件（每个工具一个文件）
│   ├── Home.jsx                  # 首页
│   ├── Login.jsx                 # 登录页
│   ├── Admin.jsx                 # 管理后台
│   ├── Stitcher.jsx              # 长图拼接
│   ├── PasswordGen.jsx           # 密码生成器
│   ├── RobotRecord.jsx           # 机器人设备列表（Firestore）
│   ├── RobotDeviceDetail.jsx     # 设备详情 + 测试记录（Firestore）
│   ├── BaseConverter.jsx         # 进制转换
│   └── IpLookup.jsx              # 查看当前 IP
├── utils/
│   └── imageUtils.js    # 图片拼接核心算法
├── firebase.js          # Firebase 初始化（Auth + Firestore）
├── App.jsx              # 根组件 + 路由配置 + 路由保护
├── main.jsx             # 入口文件
└── index.css            # 全局样式 + Tailwind 引入 + 自定义动画
```

## 开发命令
```bash
npm run dev      # 启动开发服务器（带热更新）
npm run build    # 打包到 dist/ 目录
npm run lint     # ESLint 代码检查
npm run preview  # 预览打包结果
```

## 架构要点

### 路由
- 使用 HashRouter（`#/path`），无需服务器配置，双击 index.html 即可运行
- 路由定义在 `src/App.jsx` 的 `<Routes>` 中

### 主题系统
- 7 种颜色主题，定义在 `src/config/theme.jsx` 的 `THEMES` 对象中
- 通过 `ThemeContext` + `useTheme()` Hook 在任意组件中获取/切换主题
- 所有颜色使用 Tailwind CSS 类名，切换主题时自动生效

### 新增工具的步骤
1. 在 `src/pages/` 创建新页面组件，使用 `<ToolLayout>` 包裹
2. 在 `src/config/theme.jsx` 的 `TOOLS` 数组中添加工具信息
3. 在 `src/App.jsx` 添加 `<Route>` 路由映射
4. 首页会自动从 `TOOLS` 数组渲染对应的工具卡片

### 代码风格
- JSX 文件，不使用 TypeScript
- 中文注释，详细说明每个组件和函数的作用
- 使用 Tailwind CSS 类名，不写自定义 CSS（除非必要）
- 组件内使用 `useState`/`useEffect` 管理状态
- 工具页面统一使用 `ToolLayout` 组件提供一致的导航栏和布局

### 注意事项
- 文件使用 CRLF 换行符 (Windows)
- Firebase 配置通过 `.env` 环境变量注入，不提交到 Git
- `.env.example` 为环境变量模板，部署时复制为 `.env` 填入真实值
- Firestore 安全规则需设置为仅允许已认证用户读写
- ToolCard 中所有工具在新标签页打开（内部工具用 Hash 路径）