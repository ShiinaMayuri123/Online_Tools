# 变更日志 (CHANGELOG)

## [2026-05-06] 代码质量优化 + UI 增强

### 新增
- **useClipboard Hook** (`hooks/useClipboard.js`): 统一管理剪贴板复制逻辑和状态
- **Modal 公共组件** (`components/common/Modal.jsx`): 统一模态框结构（遮罩层+入场动画）
- **LoadingSpinner 公共组件** (`components/common/LoadingSpinner.jsx`): 统一加载指示器

### 变更
- `RobotRecord.jsx`: ADB 命令区域从 8 个重复代码块重构为数据驱动渲染（减少约 150 行）
- `RobotRecord.jsx`: 引入 `useClipboard`、`Modal`、`LoadingSpinner` 替换重复代码
- `RobotDeviceDetail.jsx`: 引入公共组件，添加页面入场动画和测试记录交错动画
- `PasswordGen.jsx`: 引入 `useClipboard` 替换手动复制逻辑
- `BaseConverter.jsx`: 引入 `useClipboard`，增强 UI（毛玻璃、入场动画、悬浮效果）
- `IpLookup.jsx`: 全面 UI 增强（入场动画、毛玻璃结果区、每行图标+复制按钮、空状态）
- `Login.jsx`: 添加交错入场动画、输入框图标、按钮按压反馈、错误动画
- `Admin.jsx`: 添加交错入场动画、info banner 色条、用户卡片悬浮效果、角色切换确认
- `App.jsx`: 引入 `LoadingSpinner` 替换手动加载指示器
- `ContactModal.jsx`、`ExportModal.jsx`: 引入 `Modal` 组件替换手动弹窗结构
- `ThemeContext.jsx`: 移除冗余的 `export` 关键字

### 清理
- 删除空目录 `src/assets/`

## [2026-05-06]

### 新增
- **Firebase 集成**: 接入 Firebase Authentication + Firestore，实现跨设备数据同步
- **登录页面** (`pages/Login.jsx`): 邮箱密码登录，带错误提示和主题适配
- **管理后台** (`pages/Admin.jsx`): 管理员查看用户列表、修改用户角色
- **认证上下文** (`contexts/AuthContext.jsx`): 全局认证状态管理，监听登录状态和用户角色
- **Firebase 初始化** (`firebase.js`): 从环境变量读取配置，初始化 Auth 和 Firestore
- **设备详情页** (`pages/RobotDeviceDetail.jsx`): 设备信息管理 + 测试记录管理，支持实时同步
- **路由保护**: `ProtectedRoute`（需登录）和 `AdminRoute`（需管理员权限）组件
- **环境变量模板** (`.env.example`): Firebase 配置说明

### 变更
- `RobotRecord.jsx`: 从 localStorage 迁移到 Firestore，使用 `onSnapshot` 实时监听
- `RobotDeviceDetail.jsx`: 从 localStorage 迁移到 Firestore，设备信息和测试记录实时同步
- `ToolLayout.jsx`: 新增 `navActions` 和 `contentClassName` 属性，导航栏显示用户信息、管理后台入口和退出按钮
- `App.jsx`: 新增登录、设备列表、设备详情、管理后台路由，包裹 `AuthProvider`
- `ToolCard.jsx`: 所有工具改为新标签页打开
- `PasswordGen.jsx`: 使用 `crypto.getRandomValues()` 替代 `Math.random()`，Fisher-Yates 替代有偏排序
- `BaseConverter.jsx`: 使用 `BigInt` 支持大数转换
- `index.css`: 新增 Tailwind safelist 防止动态类名被清除
- `.gitignore`: 新增 `.env` 相关规则

### 安全修复
- 密码生成器使用 Web Crypto API (`crypto.getRandomValues`) 替代不安全的 `Math.random()`
- 密码洗牌算法使用 Fisher-Yates 替代有偏的 `sort(() => Math.random())`
- Firebase 配置通过环境变量注入，不提交到 Git
- Firestore 安全规则建议：仅允许已认证用户读写

### 移除
- `functions/` 目录（Cloud Functions，因需要 Blaze 付费计划已移除）
- `JsonFormatter.jsx`（未使用的页面）
- `App.css`、`assets/hero.png`、`assets/react.svg`、`assets/vite.svg`（模板残留文件）

---

## [2026-05-05]

### 新增
- **CLAUDE.md**: 项目开发指南，包含技术栈、架构要点、开发命令等
- **ToolLayout 公共组件** (`components/common/ToolLayout.jsx`): 工具页面统一布局
- **进制转换工具** (`pages/BaseConverter.jsx`): 二进制/八进制/十进制/十六进制互相转换
- **查看当前 IP 工具** (`pages/IpLookup.jsx`): 查询公网 IP 及地理位置信息
- **NewAPI 外链工具**: 跳转至 NewAPI 管理平台 (https://www.xiaoping888.cc.cd/)

### 变更
- `index.html`: 页面标题改为 "Antigravity 的在线工具箱"，语言设为 zh-CN
- `App.jsx`: 新增 BaseConverter 和 IpLookup 路由
- `config/theme.jsx`: TOOLS 数组新增进制转换和查看 IP 两项
- `Home.jsx`: 导航栏标题改为 "Antigravity 的在线工具箱"
- `PROJECT_STRUCTURE.md`: 同步更新目录结构和模块说明

### 文档
- 创建 `CHANGELOG.md` 变更日志
- 更新 `PROJECT_STRUCTURE.md` 项目架构说明
