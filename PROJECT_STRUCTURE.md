# 项目架构说明 (Project Structure)

使用 **Vite + React + Tailwind CSS** 构建的现代化在线工具箱。

---

## 📂 目录结构总览

```text
online_toolbox_vite/
├── node_modules/             # 第三方依赖库 (npm install 自动生成)
├── public/                   # 纯静态资源目录，打包时原样复制
│   ├── favicon.svg           # 网站图标
│   └── icons.svg             # 图标合集
├── src/                      # 💡 核心源代码目录
│   ├── components/           # UI 组件目录
│   │   ├── common/           # 公共组件
│   │   │   ├── ContactModal.jsx      # "联系开发者" 弹窗
│   │   │   ├── ParticleBackground.jsx # 首页粒子特效背景 (Canvas)
│   │   │   ├── ThemeSwitcher.jsx     # 主题切换下拉菜单
│   │   │   ├── ToolCard.jsx          # 首页工具卡片
│   │   │   └── ToolLayout.jsx        # 工具页面公共布局 (导航+内容+页脚)
│   │   └── stitcher/         # 长图拼接专属组件
│   │       └── ExportModal.jsx       # 导出参数设置弹窗
│   ├── config/               # 配置目录
│   │   └── theme.jsx         # THEMES 主题配置 + TOOLS 工具列表
│   ├── contexts/             # React 全局状态
│   │   └── ThemeContext.jsx   # 全局主题状态管理 (Context API)
│   ├── pages/                # 页面组件
│   │   ├── Home.jsx           # 首页
│   │   ├── Stitcher.jsx       # 长图拼接工具
│   │   ├── PasswordGen.jsx    # 安全密码生成器
│   │   ├── RobotRecord.jsx    # 机器人测试记录管理
│   │   ├── BaseConverter.jsx  # 进制转换工具
│   │   └── IpLookup.jsx       # 查看当前 IP
│   ├── utils/                # 工具函数
│   │   └── imageUtils.js      # 图片拼接核心算法
│   ├── App.jsx               # 根组件 + 路由配置
│   ├── index.css             # 全局样式 (Tailwind + 自定义动画)
│   └── main.jsx              # 入口文件
├── CLAUDE.md                 # 项目开发指南
├── CHANGELOG.md              # 变更日志
├── .gitignore                # Git 忽略规则
├── eslint.config.js          # ESLint 配置
├── index.html                # Vite 入口 HTML
├── package.json              # 项目描述与依赖
├── package-lock.json         # 依赖版本锁
└── vite.config.js            # Vite 构建配置
```

---

## 🛠️ 核心模块解析

### 1. 入口文件 (`main.jsx` + `index.html`)
- `index.html` 加载 `main.jsx`
- `main.jsx` 使用 `ReactDOM.createRoot` 将 `App` 挂载到 `#root`

### 2. 根组件 (`App.jsx`)
- `<ThemeProvider>` 包裹全局主题状态
- `<HashRouter>` + `<Routes>` 配置路由，使用 `#/path` 格式

### 3. 主题系统 (`ThemeContext.jsx` + `theme.jsx`)
- 7 种颜色主题 (Minimal, Ocean, Aurora, Neon, Sunset, Onyx, Crimson)
- 通过 `useTheme()` Hook 在任意组件获取/切换主题
- `theme.jsx` 中的 `TOOLS` 数组定义首页工具卡片，新增工具只需添加一项

### 4. 公共组件 (`components/common/`)
- **ToolLayout**: 所有工具页面的统一布局（导航栏 + 内容区 + 页脚）
- **ToolCard**: 首页展示的工具卡片，支持内部路由和外部链接
- **ThemeSwitcher**: 主题切换下拉菜单
- **ParticleBackground**: Canvas 粒子动画背景

### 5. 工具页面 (`pages/`)
- **Stitcher**: 长图拼接，支持纵向/横向，可导出 JPEG/PNG/PDF
- **PasswordGen**: 本地离线密码生成，支持字符集自定义
- **RobotRecord**: 机器人测试记录管理，支持 MAC 分组、导入导出
- **BaseConverter**: 二进制/八进制/十进制/十六进制互相转换
- **IpLookup**: 通过公共 API 查询公网 IP 及地理位置

### 6. 工具函数 (`utils/imageUtils.js`)
- `stitchImages`: 核心图片拼接算法，使用 Canvas 绘制
- `formatFileSize`: 字节数格式化

---

## 🚀 如何运行

```bash
# 启动开发服务器 (带热更新)
npm run dev

# 打包编译为静态文件
npm run build

# 预览打包结果
npm run preview
```

打包后生成 `dist/` 文件夹，双击 `index.html` 即可离线使用。