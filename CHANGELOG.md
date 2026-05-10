# 变更日志 (CHANGELOG)

## [2026-05-11] 网络诊断仪表盘深度优化

### 功能升级
- **`IpRiskDetector.jsx`**：引入双源并发查询（ip-api.com + ipwho.is），交叉验证 7 个信号（TOR/VPN/代理/数据中心/匿名/时区错位/移动网络）
  - UI 重构为 IPQS 风格三列网格，含 IP 头部横排（国家/城市/省份/VPN/TOR/代理徽章）
  - 新增渐变评分条（绿→黄→红），评分因子明细徽章块
  - 新增免责说明与四个权威商业平台跳转（Scamalytics / AbuseIPDB / IPQualityScore / VirusTotal）
- **`IpInfoCard.jsx`**：新增"多源 IP 一致性校验"横幅（ipify / ip-api / ipwho.is / Cloudflare trace 四源并发），不一致时高亮预警
- **`SplitTunnelTest.jsx`**：
  - 站点从 12 扩充至 **20 个**（6 国内 + 14 国际，含 Cloudflare/AWS 原生接口）
  - 新增 A/B 精度标识体系：🎯 原生（直达公司基础设施）/ 📊 参考（第三方代测）
  - 延迟颜色从 3 级升级为 **4 级**（< 100ms 绿 / 100-300ms 黄 / 300-600ms 橙 / > 600ms 红）
  - 新增国内/国际分组行、精度说明卡片、分流小知识扩展
- **`WebRtcDetector.jsx`**：
  - STUN 服务器从 8 扩充至 **20 个**（6 国内 + 14 国际）
  - 新增 **HTTP vs WebRTC IP 对比卡片**：并行查询 HTTP 出口 IP，与 WebRTC srflx IP 逐一比对
  - 泄露确认逻辑：两者 IP 不同时显示 🚨 确认泄露，对应行标注"泄露"红色徽章
  - 国内/国际分组、WebRTC 防护教程双栏布局

---

## [2026-05-10] 网络诊断工具 Tab 二级导航重构 + 数据扩充

### 架构重构
- **`IpLookup.jsx`**: 从四模块堆叠式单页改为 **顶部 Tab 二级导航**，每个功能独占一屏
  - Tab 状态使用 `useState` 管理，切换时保留已加载数据（不重新请求）
  - Tab 条使用主题色高亮当前标签
- **`IpRiskDetector.jsx`**: API 从 `ipwho.is`（CORS 不支持）改为 `ip-api.com`（浏览器友好）
- **`IpInfoCard.jsx`**: 补充数据源从 `ipwho.is` 改为 `ip-api.com`（`lang=zh-CN` 中文地理信息）
- **`WebRtcDetector.jsx`**: 修复 ICE candidate IP 提取正则（`[a-f0-9:]+` 改为严格 IPv4 + 完整 IPv6 匹配）

### 数据扩充
- **IP 洞察**: 新增邮编、国旗 Emoji、国家代码、坐标卡片、浏览器/OS/设备客户端信息（6 项 → 12 项）
- **风险评估**: 新增评分细则表（4 个因子 + 权重）、时区一致性检查、安全建议区域
- **分流测试**: 站点从 8 个扩充至 12 个（+Netflix、Amazon、Discord、X/Twitter、Steam），新增分流结论摘要卡片（自动判定分流是否生效）
- **WebRTC**: 新增 host candidate 本地 IP 捕获、泄露风险总结卡片、WebRTC 原理知识区（含浏览器防护教程）

### 新增
- 所有四个模块底部均添加 **数据来源标注**（API 名称 + 链接）和 **权威验证网站跳转**（ipinfo.io、scamalytics.com、abuseipdb.com、browserleaks.com、ipleak.net 等）
- 分流小知识区域扩展为 4 条 FAQ

### 代码清理
- 删除 `WebRtcDetector.jsx` 中未使用的 `ipFound` 变量
- 删除 `WebRtcDetector.jsx` 中已废弃的 `extractIPv4` 函数
- 更新 `PROJECT_STRUCTURE.md` 中 IpLookup 的描述

---


## [2026-05-07] IP 一致性查询工具升级 + 布局优化 + Bug 修复

### 新增
- **IP 一致性查询工具** (`pages/IpLookup.jsx`): 从单一 IP 查询升级为多源并发一致性查询
  - 10 个 CORS 友好的 IPv4 API 并发查询（ipify、ip-api.com、httpbin、BigDataCloud、ip.sb、ifconfig.me、jsonip.com、ipwho.is、seeip.org、WTF Is My IP）
  - 多数投票算法确定真实出口 IP
  - 渐进式加载：每个 API 返回立即显示，进度条实时更新
  - 地理位置一致性判断：IPv4/IPv6 指向同一位置时显示蓝色"位置一致"而非琥珀色"差异"
  - 代理/VPN 泄漏检测：少数派 IP 用琥珀色警告
  - WebRTC 本地 IP 检测
  - 一键复制全部查询结果
  - 外部深入检测工具链接（BrowserScan、BrowserLeaks、IP2Location）

### 变更
- `ToolLayout.jsx`: 内容区最大宽度从 `xl:max-w-[85%]` 改为 `xl:max-w-7xl` (1280px)，防止超宽屏内容过宽
- `Admin.jsx`: 同步布局上限改为 `xl:max-w-7xl`
- `RobotRecord.jsx`: 同步布局上限改为 `xl:max-w-7xl`
- `RobotDeviceDetail.jsx`: 同步布局上限改为 `xl:max-w-7xl`（2 处）

### Bug 修复
- `IpLookup.jsx`: 修复 `normalizeIp` 函数中端口剥离正则 `:\d+$` 会错误截断 IPv6 地址的问题（如 `2001:db8::1` 的末尾段被当作端口删除）

---

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
