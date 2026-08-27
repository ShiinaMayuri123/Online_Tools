# 现场连接助手

## 同事现场使用

1. 下载并运行 `adb-agent-setup.exe`；它会同时安装助手和 ADB 运行文件。
2. 在网页点击“启动已安装助手”，或直接双击 `adb-agent.exe`。
3. 打开机器人现场运维平台网页，复制助手控制台显示的 Token 并完成配对。
4. 输入设备 IP，点击“建立连接”。

正式安装包不需要安装 Node.js 或配置 ADB PATH。Token 不会通过 HTTP 自动读取，必须由当前用户在网页中输入。

电脑和机器人必须在同一个局域网内。机器人需要先开启 ADB 无线调试；首次配置通常仍需要 USB 连接执行一次 `adb tcpip 5555`。

## 发布包内容

发布包应至少包含以下文件，并放在同一目录：

- `adb-agent.exe`
- `adb.exe`
- `AdbWinApi.dll`（如果 Platform Tools 提供）
- `AdbWinUsbApi.dll`（如果 Platform Tools 提供）

## 开发者打包

在 `local-agent` 目录执行 `build.bat`。脚本会从系统 PATH 找到官方 Platform Tools 的 `adb.exe`，复制到 `dist`，然后生成 Windows 可执行文件。

如果当前电脑没有 `adb.exe`，请先安装 Android SDK Platform Tools，再重新运行脚本。
