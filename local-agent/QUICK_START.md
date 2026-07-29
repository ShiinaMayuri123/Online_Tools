# 现场连接助手

## 同事现场使用

1. 下载发布包并解压到一个文件夹。
2. 双击 `adb-agent.exe`。
3. 打开机器人现场运维平台网页。
4. 等待页面显示“代理服务已连接”。
5. 输入设备 IP，点击“建立连接”。

网页会自动发现助手，不需要输入 Token、端口或安装 Node.js。

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
