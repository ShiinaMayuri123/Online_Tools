# ADB 本地代理 - 发布指南

## 📦 打包步骤

### 1. 安装依赖

```bash
cd local-agent
npm install
```

### 2. 打包 Windows 可执行文件

```bash
# 方式一：使用打包脚本
build.bat

# 方式二：手动打包
npm install -g pkg
npm run build
```

打包完成后，在 `dist` 目录找到 `adb-agent.exe`。

### 3. 上传到 GitHub Releases

1. 进入 GitHub 仓库页面
2. 点击 "Releases" → "Create a new release"
3. 填写 Tag version（如 `v1.0.0`）
4. 填写 Release title（如 `ADB Local Agent v1.0.0`）
5. 上传 `dist/adb-agent.exe` 文件
6. 填写 Release notes（见下方模板）
7. 点击 "Publish release"

## 📝 Release Notes 模板

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
- [使用文档](../local-agent/README.md)
- [ADB 下载](https://developer.android.com/studio/releases/platform-tools)
```

## 🔐 生成校验和

上传前生成 SHA256 校验和，供用户验证文件完整性：

```bash
# Windows PowerShell
Get-FileHash .\dist\adb-agent.exe -Algorithm SHA256

# 或使用 certutil
certutil -hashfile dist\adb-agent.exe SHA256
```

将校验和添加到 Release notes 中：

```
### 🔐 校验和
SHA256: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔄 更新前端下载链接

发布后，更新 `src/components/robot/LocalAgentGuide.jsx` 中的下载链接：

```javascript
<a
  href="https://github.com/ShiinaMayuri123/Online_Tools/releases/latest/download/adb-agent.exe"
  target="_blank"
  rel="noopener noreferrer"
  className="..."
>
  <Download size={16} />
  下载 adb-agent.exe
</a>
```

## 📊 版本历史

### v1.1.0 (2026-06-28)
- 新增一键扫描设备信息 API（`POST /adb/device-info/scan`），并发执行 15 条 ADB 命令
- 修复 Node.js v24 兼容性问题（`await import()` 改为静态导入）

### v1.0.0 (2026-06-24)
- 初始版本
- 基础 ADB 命令执行
- WebSocket 实时输出
- Token 鉴权
- 自动端口探测
