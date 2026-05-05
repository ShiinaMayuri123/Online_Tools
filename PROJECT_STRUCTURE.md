# 项目架构说明 (Project Structure)

使用 **Vite + React + Tailwind CSS + Firebase** 构建的现代化在线工具箱。

---

## 目录结构总览

```text
online_toolbox_vite/
├── public/                   # 纯静态资源目录，打包时原样复制
│   ├── favicon.svg           # 网站图标
│   └── icons.svg             # 图标合集
├── src/                      # 核心源代码目录
│   ├── components/           # UI 组件目录
│   │   ├── common/           # 公共组件
│   │   │   ├── ContactModal.jsx      # "联系开发者" 弹窗
│   │   │   ├── ParticleBackground.jsx # 首页粒子特效背景 (Canvas)
│   │   │   ├── ThemeSwitcher.jsx     # 主题切换下拉菜单
│   │   │   ├── ToolCard.jsx          # 首页工具卡片（新标签页打开）
│   │   │   └── ToolLayout.jsx        # 工具页面公共布局 (导航+内容+页脚)
│   │   └── stitcher/         # 长图拼接专属组件
│   │       └── ExportModal.jsx       # 导出参数设置弹窗
│   ├── config/               # 配置目录
│   │   └── theme.jsx         # THEMES 主题配置 + TOOLS 工具列表
│   ├── contexts/             # React 全局状态
│   │   ├── ThemeContext.jsx   # 全局主题状态管理 (Context API)
│   │   └── AuthContext.jsx    # 全局认证状态管理 (Firebase Auth)
│   ├── pages/                # 页面组件
│   │   ├── Home.jsx           # 首页
│   │   ├── Login.jsx          # 登录页（邮箱密码）
│   │   ├── Admin.jsx          # 管理后台（用户列表 + 角色管理）
│   │   ├── Stitcher.jsx       # 长图拼接工具
│   │   ├── PasswordGen.jsx    # 安全密码生成器
│   │   ├── RobotRecord.jsx    # 机器人设备列表（Firestore 实时同步）
│   │   ├── RobotDeviceDetail.jsx # 设备详情 + 测试记录（Firestore 实时同步）
│   │   ├── BaseConverter.jsx  # 进制转换工具
│   │   └── IpLookup.jsx       # 查看当前 IP
│   ├── utils/                # 工具函数
│   │   └── imageUtils.js      # 图片拼接核心算法
│   ├── firebase.js            # Firebase 初始化（Auth + Firestore）
│   ├── App.jsx               # 根组件 + 路由配置 + 路由保护
│   ├── index.css             # 全局样式 (Tailwind + 自定义动画)
│   └── main.jsx              # 入口文件
├── .env.example              # 环境变量模板（Firebase 配置）
├── CLAUDE.md                 # 项目开发指南
├── CHANGELOG.md              # 变更日志
├── .gitignore                # Git 忽略规则
├── eslint.config.js          # ESLint 配置
├── index.html                # Vite 入口 HTML
├── package.json              # 项目描述与依赖
└── vite.config.js            # Vite 构建配置
```

---

## 核心模块解析

### 1. 入口文件 (`main.jsx` + `index.html`)
- `index.html` 加载 `main.jsx`
- `main.jsx` 使用 `ReactDOM.createRoot` 将 `App` 挂载到 `#root`

### 2. 根组件 (`App.jsx`)
- `<ThemeProvider>` 包裹全局主题状态
- `<AuthProvider>` 包裹全局认证状态
- `<HashRouter>` + `<Routes>` 配置路由，使用 `#/path` 格式
- `ProtectedRoute`: 需登录才能访问的路由守卫
- `AdminRoute`: 需管理员权限才能访问的路由守卫

### 3. 主题系统 (`ThemeContext.jsx` + `theme.jsx`)
- 7 种颜色主题 (Minimal, Ocean, Aurora, Neon, Sunset, Onyx, Crimson)
- 通过 `useTheme()` Hook 在任意组件获取/切换主题
- `theme.jsx` 中的 `TOOLS` 数组定义首页工具卡片，新增工具只需添加一项

### 4. 认证系统 (`AuthContext.jsx` + `firebase.js` + `Login.jsx`)
- Firebase Authentication 邮箱密码登录
- `AuthContext` 提供 `useAuth()` Hook：`{ user, role, loading, login, logout }`
- 用户角色存储在 Firestore `users/{uid}` 文档中
- 管理员角色 (`admin`) 可访问管理后台

### 5. 数据存储 (Firestore)
- `devices/{mac}`: 设备数据（MAC 地址、型号、版本、自定义字段、测试记录）
- `users/{uid}`: 用户数据（邮箱、角色）
- 使用 `onSnapshot` 实时监听，多设备自动同步
- Firestore 安全规则：仅允许已认证用户读写

### 6. 公共组件 (`components/common/`)
- **ToolLayout**: 所有工具页面的统一布局（导航栏 + 内容区 + 页脚）
- **ToolCard**: 首页展示的工具卡片，所有工具在新标签页打开
- **ThemeSwitcher**: 主题切换下拉菜单
- **ParticleBackground**: Canvas 粒子动画背景

### 7. 工具页面 (`pages/`)
- **Stitcher**: 长图拼接，支持纵向/横向，可导出 JPEG/PNG/PDF
- **PasswordGen**: 本地离线密码生成，使用 Web Crypto API 保证安全
- **RobotRecord**: 机器人设备列表，以 MAC 地址为唯一标识
- **RobotDeviceDetail**: 设备信息管理 + 测试记录管理，实时同步
- **BaseConverter**: 二进制/八进制/十进制/十六进制互相转换，支持大数
- **IpLookup**: 通过公共 API 查询公网 IP 及地理位置

### 8. 工具函数 (`utils/imageUtils.js`)
- `stitchImages`: 核心图片拼接算法，使用 Canvas 绘制
- `formatFileSize`: 字节数格式化

---

## 如何运行

```bash
# 安装依赖
npm install

# 启动开发服务器 (带热更新)
npm run dev

# 打包编译为静态文件
npm run build

# 预览打包结果
npm run preview
```

## 部署前配置

1. 复制 `.env.example` 为 `.env`
2. 在 [Firebase Console](https://console.firebase.google.com/) 创建项目
3. 启用 Authentication（邮箱/密码）和 Firestore
4. 将 Firebase 配置填入 `.env`
5. 在 Firestore 中创建 `users` 集合，添加管理员文档
