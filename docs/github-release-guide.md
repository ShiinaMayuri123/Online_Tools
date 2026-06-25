# GitHub Release 发布指南

## 📋 概述

本文档说明如何将打包好的 `adb-agent.exe` 上传到 GitHub Releases，供用户下载。

## 🚀 发布步骤

### 1. 打包 exe 文件

```bash
# 进入 local-agent 目录
cd local-agent

# 安装依赖
npm install

# 打包
build.bat
# 或手动打包: npm run build

# 输出文件在 dist/adb-agent.exe
```

### 2. 创建 GitHub Release

1. 进入 GitHub 仓库页面：
   ```
   https://github.com/ShiinaMayuri123/online_toolbox_vite
   ```

2. 点击右侧的 **"Releases"** 链接

3. 点击 **"Create a new release"** 按钮

4. 填写 Release 信息：

   **Tag version**: `v1.0.0`
   （或使用语义化版本号，如 `v1.0.0`、`v1.1.0` 等）

   **Release title**: `ADB Local Agent v1.0.0`

   **Release description**:
   ```markdown
   ## ADB Local Agent v1.0.0

   ### ✨ 功能特性
   - 在用户本机运行，调用本地 adb.exe
   - 支持 HTTP API 和 WebSocket 实时输出
   - Token 鉴权，安全可靠
   - 自动检测 adb 路径
   - 自动探测可用端口

   ### 📥 下载
   - `adb-agent.exe` - Windows 可执行文件

   ### 🚀 快速开始
   1. 下载并运行 `adb-agent.exe`
   2. 程序会自动打开配对页面
   3. 复制 Token
   4. 在 ADB 控制台网页上粘贴 Token 并点击"配对"

   ### 📋 系统要求
   - Windows 10/11 (64-bit)
   - ADB 工具（需自行安装并添加到 PATH）

   ### ⚠️ 注意事项
   - 首次运行可能被 Windows Defender 拦截，点击"更多信息" → "仍要运行"
   - 防火墙弹窗请选择"允许访问"
   - 程序只监听 127.0.0.1，不会有安全风险

   ### 🔗 相关链接
   - [使用文档](../docs/adb-local-agent-guide.md)
   - [ADB 下载](https://developer.android.com/studio/releases/platform-tools)
   ```

5. **上传文件**：
   - 将 `dist/adb-agent.exe` 拖拽到 "Attach binaries" 区域
   - 或点击 "choose your files" 选择文件

6. 点击 **"Publish release"** 按钮

### 3. 验证发布

1. 发布后，访问 Releases 页面：
   ```
   https://github.com/ShiinaMayuri123/online_toolbox_vite/releases
   ```

2. 确认：
   - Release 显示正确
   - exe 文件已上传
   - 下载链接可用

3. 测试下载链接：
   ```
   https://github.com/ShiinaMayuri123/online_toolbox_vite/releases/latest/download/adb-agent.exe
   ```

## 🔐 生成校验和（可选）

为了确保文件完整性，可以生成 SHA256 校验和：

### Windows PowerShell

```powershell
Get-FileHash .\dist\adb-agent.exe -Algorithm SHA256
```

### 或使用 certutil

```cmd
certutil -hashfile dist\adb-agent.exe SHA256
```

将校验和添加到 Release notes 中：

```markdown
### 🔐 校验和
SHA256: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📝 版本管理

### 语义化版本号

使用语义化版本号（Semantic Versioning）：

- **主版本号 (Major)**：不兼容的 API 修改
- **次版本号 (Minor)**：向下兼容的功能性新增
- **修订号 (Patch)**：向下兼容的问题修正

示例：
- `v1.0.0` - 初始版本
- `v1.0.1` - 修复 bug
- `v1.1.0` - 新增功能
- `v2.0.0` - 重大更新，可能不兼容旧版本

### 更新 Release

如果需要更新 Release：

1. 进入 Release 页面
2. 点击 "Edit" 按钮
3. 修改 Release notes 或上传新文件
4. 点击 "Update release"

## 🔄 自动化发布（可选）

如果需要自动化发布流程，可以使用 GitHub Actions：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd local-agent
          npm install
      
      - name: Build
        run: |
          cd local-agent
          npm run build
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: local-agent/dist/adb-agent.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📚 相关文档

- [本地代理 README](../local-agent/README.md)
- [用户使用指南](../docs/adb-local-agent-guide.md)
- [打包脚本](../local-agent/build.bat)

## ❓ 常见问题

### Q: exe 文件太大怎么办？

A: 正常情况下，打包后的 exe 文件约 50-100MB。如果需要减小体积：
- 使用 UPX 压缩（可能被杀毒软件误报）
- 考虑使用 Go 重写（更小体积）

### Q: 用户下载后被杀毒软件拦截怎么办？

A: 这是因为 exe 文件没有数字签名。解决方案：
- 购买代码签名证书
- 在 Release notes 中说明情况
- 引导用户添加白名单

### Q: 如何删除旧的 Release？

A: 进入 Release 页面，点击要删除的 Release，然后点击 "Delete" 按钮。
