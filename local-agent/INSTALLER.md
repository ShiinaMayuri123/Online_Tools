# 现场连接助手安装与启动

## 首次使用

1. 在网页连接助手卡片点击“下载并安装助手”。
2. 运行 `adb-agent-setup.exe`，安装器会保存到当前用户的 `%LocalAppData%\Pudu\AdbAgent`，不需要管理员权限。
3. 返回网页，点击“启动已安装助手”。网页会通过 `pudu-agent://start` 请求启动代理，并自动等待连接。

安装完成后不需要保留安装器或便携 ZIP。以后只需要在网页点击“启动已安装助手”。

## 备用方式

`adb-agent-portable.zip` 仅用于自定义协议无法注册、安装器被 SmartScreen 拦截或现场排障。解压后将 `adb-agent.exe` 与 ADB 文件放在同一目录，再手动运行 exe。

代理只监听 `127.0.0.1`。未签名安装器可能触发 Windows SmartScreen，需要选择“更多信息”后继续运行。
