# 下载链接修复说明

## 🐛 问题描述

用户点击"下载 adb-agent.exe"按钮时，会跳转到：
```
https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest/download/adb-agent.exe
```

这是一个无效的链接，因为：
1. GitHub Releases 中没有上传 `adb-agent.exe` 文件
2. 链接格式假设存在该文件，但实际上不存在

## ✅ 解决方案

### 方案一：创建下载说明页面（已实现）

创建了一个本地下载说明页面 `public/download-agent.html`，当用户点击下载按钮时，会跳转到这个页面，显示两种获取方式：

1. **从 GitHub Releases 下载**（如果已发布）
2. **自行打包**（从源码构建）

**优点**：
- 不依赖 GitHub Releases 是否存在
- 提供多种获取方式
- 用户体验友好

**实现**：
- 创建 `public/download-agent.html` 页面
- 修改 `LocalAgentGuide.jsx` 中的下载链接为 `/download-agent.html`

### 方案二：实际上传 exe 到 GitHub Releases

如果需要直接下载 exe 文件，需要：

1. 打包 exe 文件：
   ```bash
   cd local-agent
   npm install
   build.bat
   ```

2. 上传到 GitHub Releases：
   - 进入 GitHub 仓库页面
   - 点击 "Releases" → "Create a new release"
   - 填写版本号和说明
   - 上传 `dist/adb-agent.exe` 文件
   - 点击 "Publish release"

3. 更新下载链接：
   ```javascript
   // src/components/robot/LocalAgentGuide.jsx
   <a href="https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest/download/adb-agent.exe">
     下载 adb-agent.exe
   </a>
   ```

## 📁 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `public/download-agent.html` | 新增：下载说明页面 |
| `src/components/robot/LocalAgentGuide.jsx` | 修改：下载链接指向本地页面 |
| `docs/github-release-guide.md` | 新增：GitHub Release 发布指南 |
| `docs/download-link-fix.md` | 新增：本文档 |

## 🎯 下载页面功能

`download-agent.html` 页面提供：

1. **方式一：从 GitHub 下载**
   - 链接到 GitHub Releases 页面
   - 说明下载步骤

2. **方式二：自行打包**
   - 详细的打包步骤
   - 链接到 README 文档

3. **注意事项**
   - Windows Defender 提示
   - 防火墙设置
   - ADB 工具要求

4. **导航链接**
   - 返回首页
   - 前往 ADB 调试助手

## 🔧 技术实现

### LocalAgentGuide.jsx 修改

```javascript
// 之前（无效链接）
<a href="https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest/download/adb-agent.exe">

// 现在（本地说明页面）
<a href="/download-agent.html">
```

### download-agent.html 特点

- 响应式设计，适配移动端
- 渐变背景，视觉效果好
- 清晰的步骤说明
- 按钮样式与项目一致
- 注意事项醒目提示

## 🚀 使用方法

### 用户流程

1. 用户点击"下载 adb-agent.exe"按钮
2. 跳转到下载说明页面
3. 选择下载方式：
   - 点击"前往 GitHub Releases"（如果已发布）
   - 或查看"自行打包"说明
4. 按照说明获取 exe 文件
5. 运行 exe 文件
6. 返回 ADB 调试助手页面进行配对

### 开发者流程

如果需要发布 Release：

1. 打包 exe 文件
2. 上传到 GitHub Releases
3. 用户就可以从 Releases 页面直接下载

## 📊 对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 本地说明页面 | 不依赖 Release，始终可用 | 用户需要多一步操作 |
| 直接下载链接 | 用户体验最好 | 需要先上传 exe 到 Release |

## 🎯 建议

1. **短期**：使用本地说明页面（当前方案）
   - 不需要立即上传 exe
   - 用户可以自行打包

2. **长期**：上传 exe 到 GitHub Releases
   - 打包好 exe 文件
   - 创建 Release 并上传
   - 更新下载链接为直接下载

## 📚 相关文档

- [GitHub Release 发布指南](./github-release-guide.md)
- [本地代理 README](../local-agent/README.md)
- [ADB 本地代理使用指南](./adb-local-agent-guide.md)

## ❓ 常见问题

### Q: 为什么下载按钮不直接下载 exe？

A: 因为 exe 文件还没有上传到 GitHub Releases。我们提供了两种替代方案：
1. 从 GitHub Releases 下载（如果已发布）
2. 自行从源码打包

### Q: 如何让下载按钮直接下载 exe？

A: 需要：
1. 打包 exe 文件
2. 上传到 GitHub Releases
3. 更新下载链接

### Q: 下载页面打不开怎么办？

A: 确保：
1. 前端开发服务器正在运行
2. 访问地址正确：`http://localhost:5173/download-agent.html`
3. 文件存在于 `public` 目录
