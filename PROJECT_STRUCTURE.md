# 项目架构说明 (Project Structure)

为了解决原生单文件 HTML 在现代前端开发中的跨域、性能（JSX 实时编译）和代码臃肿问题，我们使用 **Vite + React + Tailwind CSS** 对在线工具箱进行了现代化重构。

以下是重构后的项目目录结构及详细说明，带你了解每一个文件的具体作用。

---

## 📂 目录结构总览

```text
online_toolbox_vite/
├── node_modules/             # 第三方依赖库存放目录 (npm install 自动生成)
├── public/                   # 纯静态资源目录，打包时会被原样复制到根目录
├── src/                      # 💡 核心源代码目录 (我们工作的主要阵地)
│   ├── components/           # UI 组件目录
│   │   ├── common/           # 多页面复用的公共组件
│   │   │   ├── ContactModal.jsx     # "联系开发者" 弹窗
│   │   │   ├── ParticleBackground.jsx # 首页的动态粒子特效背景
│   │   │   ├── ThemeSwitcher.jsx    # 主题切换下拉菜单
│   │   │   └── ToolCard.jsx         # 首页展示的单个工具卡片
│   │   └── stitcher/         # 长图拼接工具专属组件
│   │       └── ExportModal.jsx      # 长图导出的参数设置弹窗
│   ├── config/               # 配置信息目录
│   │   └── theme.jsx         # 定义了所有颜色主题 (THEMES) 和工具列表 (TOOLS)
│   ├── contexts/             # React 全局状态上下文目录
│   │   └── ThemeContext.jsx  # 管理全局主题状态 (当前选中的是什么主题)
│   ├── pages/                # 独立页面目录 (路由的顶级组件)
│   │   ├── Home.jsx          # 首页 (应用入口页)
│   │   ├── PasswordGen.jsx   # 密码生成器页面
│   │   ├── RobotRecord.jsx   # 机器人测试记录页面
│   │   └── Stitcher.jsx      # 长图拼接页面
│   ├── utils/                # 纯逻辑工具函数目录
│   │   └── imageUtils.js     # 负责图片尺寸计算和绘制合并的核心函数
│   ├── App.jsx               # 应用根路由配置 (负责分配网址对应的页面)
│   ├── index.css             # 全局样式文件 (包含 Tailwind 引入及自定义动画)
│   └── main.jsx              # React 项目的执行入口点 (将 App 挂载到 HTML 上)
├── .gitignore                # 指定 Git 版本控制应忽略的文件
├── eslint.config.js          # 代码语法检查规则配置
├── index.html                # Vite 项目的入口 HTML 模板
├── package.json              # 项目的描述文件 (包含各种库的版本和运行脚本)
├── package-lock.json         # 锁定具体依赖版本的清单
└── vite.config.js            # Vite 构建工具的配置文件
```

---

## 🛠️ 核心文件模块化解析

### 1. `src/main.jsx` 与 `index.html`
这两个文件是一切的起点。当你在浏览器打开应用时：
1. `index.html` 会加载 `src/main.jsx` 这个脚本。
2. `main.jsx` 使用 `ReactDOM.createRoot` 找到 `id="root"` 的 `div` 元素。
3. 它将我们的 `App.jsx` 组件注入（渲染）到这个 `div` 中，页面就显示出来了。

### 2. `src/App.jsx`
这是**大管家**。它使用了两层包裹：
* `<ThemeProvider>`：这是我们自定义的状态管理器，确保里面所有的页面都能知道当前正在使用什么颜色主题。
* `<HashRouter>` 与 `<Routes>`：这是 **React Router** 的路由系统。它像一个交通警察，比如当网址结尾是 `#/password` 时，它就会负责把 `<PasswordGenTool />` 这个组件显示在屏幕上。

### 3. `src/contexts/ThemeContext.jsx`
利用了 React 的 Context API。
* **作用**：让任何深层次的组件都可以直接拿到或修改当前的主题颜色，而不用一层一层地通过属性 (props) 传进去。
* **对于小白的理解**：就像是一个全局的广播站，`ThemeSwitcher` 点击切换主题后，广播站发出通知，全网所有页面收到通知后立刻换上新颜色的衣服。

### 4. `src/config/theme.jsx`
这是一个纯数据文件。将数据与 UI 逻辑分离是模块化的关键。
* 里面定义了 `THEMES` (所有主题的颜色配置) 和 `TOOLS` (首页上那三个卡片的图文信息)。
* 这样做的好处是，如果以后你要新增一个工具，只需要在 `TOOLS` 数组里加一段字，首页就会自动多出一个漂亮的卡片，而不需要去修改首页的排版代码。

### 5. `src/components/common/` 目录
专门存放被**多个地方同时使用**的 UI 积木。
* **`ThemeSwitcher.jsx`**：右上角的主题下拉框，在首页、密码生成器等每个页面都需要用到，所以提取成公共组件。
* **`ParticleBackground.jsx`**：首页那绚丽的粒子连线动画。使用 Canvas 绘制。把它单独抽离出来，能防止复杂的动画代码污染首页的布局代码。

### 6. `src/pages/` 目录
包含用户肉眼能看到的每一个“完整页面”。
所有的页面代码中，我都添加了**非常详细的中文注释**。
* **比如 `PasswordGen.jsx`**：你会在里面看到如何使用 `useState` 保存密码长度，如何用 `useEffect` 在拖动滑块时自动生成密码，以及洗牌算法是如何工作的。

### 7. `src/utils/imageUtils.js`
纯逻辑文件，不包含任何 UI 标签（没有 `<div>`）。
* **`stitchImages`**：长图拼接的灵魂函数。这里面写满了数学计算和 HTML5 Canvas 的底层绘图逻辑。
* 将这种几百行的复杂计算从 `Stitcher.jsx` 中剥离出来，这就是真正的“业务逻辑与视图分离”原则，让原本庞大的代码变得清晰易读。

---

## 🚀 如何运行本项目？

项目已经迁移为 Node.js 工程。你需要在本地拥有 Node.js 环境（如果你没有，请先下载安装）。
然后在项目的根目录（`online_toolbox_vite`）打开终端，运行：

```bash
# 启动本地开发服务器 (带有热更新，修改代码后保存会立刻在网页生效)
npm run dev
```

当你要将此项目变为真正的“离线 HTML 资源”发布时，运行：
```bash
# 打包编译成纯静态文件
npm run build
```
执行完毕后，项目会生成一个 `dist` 文件夹，里面包含了极致压缩的原生 JS、CSS 和 HTML，没有任何跨域问题，双击 `index.html` 或者丢到服务器上即可使用！
