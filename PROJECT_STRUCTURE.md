# 项目结构与文件职责

本文档按照当前仓库实际文件说明每个主要文件的用途、所属模块和修改方向。依赖目录、构建产物、本地环境文件和运行时 Token 不纳入目录树，避免把不可提交内容误认为项目源码。

## 一、完整目录树

```text
online_toolbox_vite/
├── public/                         # 不经过 React 编译的静态文件，构建时复制到 dist/
│   ├── CNAME                       # GitHub Pages 自定义域名
│   ├── favicon.svg                 # 浏览器标签页图标
│   ├── icons.svg                   # 网站使用的 SVG 图标集合
│   ├── title.jpg                   # 首页或页面使用的图片资源
│   ├── download-agent.html         # 本地连接助手下载/使用说明页面
│   └── install-agent.bat           # Windows 辅助安装脚本
├── src/                            # React 前端源代码
│   ├── components/                 # 可复用 UI 和业务组件
│   │   ├── common/                 # 全站通用组件
│   │   ├── NetworkTools/           # IP 和网络环境检测组件
│   │   ├── robot/                  # 机器人记录、ADB 调试和现场运维组件
│   │   └── stitcher/               # 长图拼接专属组件
│   ├── config/                     # 静态配置、工具清单和 ADB 命令定义
│   ├── contexts/                   # React Context 全局状态
│   ├── hooks/                      # 自定义 React Hooks
│   ├── pages/                      # 路由页面组件
│   ├── utils/                      # 与 UI 无关的工具函数
│   ├── App.jsx                     # 应用根组件和路由配置
│   ├── firebase.js                 # Firebase Auth/Firestore 初始化
│   ├── index.css                   # 全局 CSS、Tailwind 和动画
│   └── main.jsx                    # React 挂载入口
├── local-agent/                    # 运行在现场 Windows 笔记本上的 ADB 助手
│   ├── index.js                    # HTTP API、WebSocket 和静态页面服务
│   ├── adb-finder.js               # 自动寻找 adb.exe
│   ├── port-finder.js              # 查找可用本机服务端口
│   ├── prepare-adb.mjs             # 打包前复制 adb.exe 和 Platform Tools DLL
│   ├── package.json                # 连接助手依赖和打包命令
│   ├── package-lock.json           # 连接助手依赖锁定版本
│   ├── build.bat                   # Windows 一键打包脚本
│   ├── start.bat                   # 未打包时使用 Node.js 启动助手
│   ├── setup.ps1                   # PowerShell 下载并安装开发版助手
│   ├── QUICK_START.md              # 现场同事使用说明
│   ├── README.md                   # 连接助手完整开发/API 说明
│   └── RELEASE.md                  # Windows 发布和上传 Release 说明
├── server/                         # 项目已有的开发/辅助服务端
│   └── index.js                    # 本地服务端入口及相关 API
├── docs/                           # 需求、布局、实现和发布过程记录
│   ├── adb-local-agent-guide.md    # ADB 本地助手使用指南
│   ├── adb-tool-layout-update.md   # ADB 页面布局更新记录
│   ├── adb-tool-layout-v2.md       # ADB 页面布局第二版方案
│   ├── adb-tool-layout-v3.md       # ADB 页面布局第三版方案
│   ├── adb-tool-separation.md      # 命令库、排障流程、设备资料分区方案
│   ├── download-link-fix.md        # 助手下载链接修复记录
│   ├── download-page-update.md     # 下载页面更新记录
│   ├── github-release-guide.md     # GitHub Release 发布指南
│   ├── local-agent-implementation-summary.md # 连接助手实现总结
│   └── quick-start-collapse.md     # 工作台面板展开/收起交互记录
├── .env.example                    # 环境变量模板
├── .gitignore                      # Git 忽略规则
├── CHANGELOG.md                    # 变更日志
├── CLAUDE.md                       # 项目开发指南
├── eslint.config.js                # ESLint 配置
├── firestore.rules                 # Firestore 数据安全规则
├── index.html                      # Vite HTML 入口
├── package.json                    # 项目描述、依赖和 npm 脚本
├── package-lock.json               # 前端依赖锁定版本
├── PROJECT_STRUCTURE.md            # 本文件，项目结构和文件职责说明
├── README.md                       # 项目介绍、运行、部署和快速开始
└── vite.config.js                  # Vite 构建配置
```

## 二、前端入口与全局基础

### `src/main.jsx`

React 应用启动入口。创建 React 根节点，加载全局样式，并渲染 `App.jsx`。

### `src/App.jsx`

应用根组件，负责注册 `ThemeProvider` 和 `AuthProvider`、创建 `HashRouter` 路由，以及登录路由守卫和管理员路由守卫。新增页面后，通常需要在此文件增加路由。

### `src/firebase.js`

读取环境变量并初始化 Firebase Authentication 和 Cloud Firestore。真实 Firebase 配置来自 `.env`，不要把密钥写入源码。

### `src/index.css`

全局 Tailwind CSS 入口、自定义动画、滚动条和基础页面样式。页面主题色以主题配置为主，避免单个页面硬编码另一套背景。

## 三、公共组件 `src/components/common/`

| 文件 | 职责 |
|---|---|
| `ContactModal.jsx` | “联系开发者”弹窗及联系方式展示。 |
| `FaultPieChart.jsx` | 机器人故障类型统计饼图。 |
| `LoadingSpinner.jsx` | 页面或组件加载时的通用加载指示器。 |
| `Modal.jsx` | 通用模态框，处理遮罩、关闭和内容容器。 |
| `ParticleBackground.jsx` | 首页 Canvas 粒子背景效果。 |
| `ThemeSwitcher.jsx` | 主题切换控件，调用全局主题 Context。 |
| `ToolCard.jsx` | 首页工具卡片，显示工具名称、图标和入口。 |
| `ToolLayout.jsx` | 工具页面统一外壳，包括导航、内容区域和页脚。 |

## 四、网络工具组件 `src/components/NetworkTools/`

| 文件 | 职责 |
|---|---|
| `IpOverview.jsx` | 汇总多个 IP 数据源，展示出口 IP、地区和网络信息。 |
| `LeakDetection.jsx` | 展示 IP 欺诈、代理和网络泄露风险检测结果。 |
| `SplitTunnelTest.jsx` | 并发访问多个站点，判断网络分流和连通性。 |

## 五、机器人与 ADB 组件 `src/components/robot/`

| 文件 | 职责 |
|---|---|
| `AdbWorkspace.jsx` | ADB 工作台主界面；布局连接区、实时终端和“命令库/排障流程/设备资料”横向面板。 |
| `AdbConsole.jsx` | ADB 工作台业务控制器；负责助手探测、自动配对、WebSocket、设备连接、设备刷新、命令执行和历史记录。 |
| `AdbCommandCard.jsx` | 命令库单张命令卡片；展示说明、风险级别、参数输入和填入终端操作。 |
| `AdbParameterForm.jsx` | 根据命令定义生成输入框、选择框和复选框，并实时构建完整命令。 |
| `AdbTerminal.jsx` | 旧版独立终端组件，负责终端输出、输入和执行历史展示。 |
| `DangerConfirmModal.jsx` | 高风险命令确认弹窗，防止误执行删除、重启、清理数据等命令。 |
| `ExecutionHistory.jsx` | 保存和展示本地命令执行记录、耗时、状态和输出摘要。 |
| `RobotHealthDiagnostic.jsx` | 机器人健康检查批量诊断，集中执行设备、系统、电池、网络和日志检查。 |
| `LocalAgentGuide.jsx` | ADB 本地助手的网页内安装和使用引导。 |
| `AdbReferencePanel.jsx` | ADB 命令参考面板，保留兼容旧页面或参考数据的展示能力。 |

ADB 当前工作流是：命令卡片点击后只把命令填入终端；用户点击执行或按 Enter 后才发起请求；高风险命令再经过确认弹窗。浏览器通过本机连接助手调用 `adb.exe`，网页本身不会直接启动系统进程。

## 六、配置文件 `src/config/`

| 文件 | 职责 |
|---|---|
| `theme.jsx` | 定义全局主题色、主题背景、首页工具列表和工具元数据。 |
| `adbCommands.js` | 定义可交互 ADB 命令，包括 ID、名称、分类、风险级别、参数和命令构建函数。 |
| `adbData.js` | 定义静态 ADB 参考资料、排障流程、设备资料、日志关键词和测试汇总数据。 |

`adbCommands.js` 适合放可被卡片参数化的命令；`adbData.js` 适合放参考内容和流程步骤。两者在 `AdbConsole.jsx` 中合并为命令库，并去除重复命令。

## 七、全局状态与 Hooks

### `src/contexts/`

| 文件 | 职责 |
|---|---|
| `ThemeContext.jsx` | 提供当前主题、主题切换方法和主题持久化。 |
| `AuthContext.jsx` | 监听 Firebase 登录状态，提供用户、角色、登录、退出和加载状态。 |

### `src/hooks/`

| 文件 | 职责 |
|---|---|
| `useClipboard.js` | 统一处理复制到剪贴板和复制成功状态。 |
| `useIpData.js` | 获取并整理 IP 查询相关的异步数据。 |

## 八、页面 `src/pages/`

| 文件 | 路由/职责 |
|---|---|
| `Home.jsx` | `/` 首页，展示工具入口和主题化首页布局。 |
| `Login.jsx` | `/login` 登录页，使用 Firebase 邮箱密码认证。 |
| `Admin.jsx` | `/admin` 管理后台，查看用户并管理角色。 |
| `AdbTool.jsx` | `/adb` 机器人现场运维平台入口，挂载 ADB 工作台。 |
| `RobotRecord.jsx` | 机器人设备记录列表，使用 Firestore 实时同步。 |
| `RobotDeviceDetail.jsx` | 单台机器人详情、设备字段和测试记录管理。 |
| `Stitcher.jsx` | 长图拼接页面，支持图片排列、预览和导出。 |
| `PasswordGen.jsx` | 本地密码生成页面，使用 Web Crypto API 生成随机密码。 |
| `BaseConverter.jsx` | 二进制、八进制、十进制和十六进制互转。 |
| `IpLookup.jsx` | IP 洞察、风险评估、分流测试和 WebRTC 泄露检测页面。 |

## 九、工具函数与长图组件

### `src/utils/imageUtils.js`

提供图片文件读取、尺寸计算、Canvas 拼接和文件大小格式化等纯函数，供长图拼接页面使用。

### `src/components/stitcher/ExportModal.jsx`

长图导出设置弹窗，负责 JPEG、PNG、PDF 格式、质量和导出参数选择。

## 十、本地连接助手 `local-agent/`

连接助手运行在现场 Windows 笔记本上，监听 `127.0.0.1`，由网页自动发现。它负责调用本机 `adb.exe`，网页只负责发起受控请求和展示结果。

| 文件 | 职责 |
|---|---|
| `index.js` | Express HTTP API、WebSocket 实时输出、Token 校验、ADB 命令执行和静态前端服务。 |
| `adb-finder.js` | 优先寻找助手目录中的 `adb.exe`，再检查 PATH、Android SDK 和常见安装路径。 |
| `port-finder.js` | 从首选端口和备用端口中寻找可用监听端口。 |
| `prepare-adb.mjs` | 从系统 PATH 或当前目录准备 `adb.exe`，并复制 Windows ADB DLL 到 `dist`。 |
| `package.json` | 定义助手依赖、启动脚本和 `pkg` Windows 打包脚本。 |
| `package-lock.json` | 锁定助手依赖版本，保证构建结果可复现。 |
| `build.bat` | Windows 开发者打包入口，生成 `dist/adb-agent.exe`。 |
| `start.bat` | 已安装 Node.js 时直接启动 `index.js`。 |
| `setup.ps1` | 从 GitHub 下载源码、安装依赖并启动开发版助手。 |
| `QUICK_START.md` | 面向现场同事的最短使用流程。 |
| `README.md` | 助手 API、运行方式、安全限制和开发说明。 |
| `RELEASE.md` | 打包、上传 GitHub Release 和发布检查清单。 |

### 连接助手 API

| API | 作用 |
|---|---|
| `GET /health` | 网页探测助手是否运行。 |
| `GET /token` | 网页自动获取本次助手运行的配对信息。 |
| `GET /adb/devices` | 获取当前 ADB 设备列表。 |
| `POST /adb/connect` | 使用 IP 和端口连接局域网设备。 |
| `POST /adb/disconnect` | 断开指定设备或无线连接。 |
| `POST /adb/exec` | 执行受控的 ADB 命令。 |
| `POST /adb/exec-safe` | 执行带命令安全校验的 ADB 命令。 |
| `WS /ws` | 流式传输命令输出和终端状态。 |

## 十一、服务端与静态资源

### `server/index.js`

项目原有的本地开发/辅助服务端入口。它与 `local-agent/index.js` 的职责不同：`server` 服务项目自身的辅助接口，`local-agent` 专门负责现场笔记本上的 ADB 调用。

### `public/`

文件不会经过 React 组件渲染。`CNAME` 用于 GitHub Pages 域名绑定；下载页面和安装脚本用于连接助手分发；图标和图片用于网站静态展示。

## 十二、根目录配置文件

| 文件 | 职责 |
|---|---|
| `package.json` | 前端依赖和 `dev/build/preview/agent` 等 npm 脚本。 |
| `package-lock.json` | 前端依赖锁定版本。 |
| `vite.config.js` | React、Tailwind 插件、基础路径和开发代理配置。 |
| `index.html` | Vite 页面入口和 `#root` 容器。 |
| `eslint.config.js` | ESLint 规则和代码检查范围。 |
| `firestore.rules` | Firestore 认证、用户和设备数据访问规则。 |
| `.env.example` | Firebase 配置变量模板；真实 `.env` 不应提交。 |
| `.gitignore` | 忽略依赖、构建产物、日志、Token、环境文件和本地打包文件。 |
| `README.md` | 面向使用者和贡献者的项目总览。 |
| `PROJECT_STRUCTURE.md` | 本文件，面向开发者的逐文件架构说明。 |
| `CHANGELOG.md` | 版本变更和功能演进记录。 |
| `CLAUDE.md` | 项目开发约定和自动化协作说明。 |

## 十三、常用命令

```bash
# 安装前端依赖
npm install

# 启动 Vite 开发服务器
npm run dev

# 检查生产构建
npm run build

# 预览 dist 构建结果
npm run preview

# 安装并启动本地 ADB 助手（开发模式）
npm run agent:install
npm run agent
```

Windows 发布助手时，在 `local-agent` 目录运行 `build.bat`。发布给现场同事的压缩包应包含 `adb-agent.exe`、`adb.exe` 和 Platform Tools DLL；现场用户只需要双击 `adb-agent.exe`，不需要理解 Node.js、Token 或端口配置。
