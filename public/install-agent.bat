@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo  ========================================
echo    ADB 本地代理 - 一键安装
echo  ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [错误] 未找到 Node.js
    echo.
    echo  请先安装 Node.js: https://nodejs.org/
    echo  安装后重新运行此脚本
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

echo  [1/3] 正在下载...
powershell -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/ShiinaMayuri123/Online_Tools/archive/refs/heads/main.zip' -OutFile '%TEMP%\adb-agent.zip'; Expand-Archive -Path '%TEMP%\adb-agent.zip' -DestinationPath '%USERPROFILE%' -Force; Remove-Item '%TEMP%\adb-agent.zip' -Force"
if %errorlevel% neq 0 (
    echo  [错误] 下载失败，请检查网络连接
    pause
    exit /b 1
)

echo  [2/3] 正在安装依赖...
cd /d "%USERPROFILE%\Online_Tools-main\local-agent"
call npm install --silent
if %errorlevel% neq 0 (
    echo  [错误] 安装依赖失败
    pause
    exit /b 1
)

:: 创建快捷启动脚本
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cd /d "%%~dp0"
    echo echo 启动 ADB 本地代理...
    echo node index.js
    echo pause
) > start.bat

echo  [3/3] 安装完成！
echo.
echo  ========================================
echo    启动方式：双击 start.bat
echo    路径：%%USERPROFILE%%\Online_Tools-main\local-agent\start.bat
echo  ========================================
echo.
echo  正在启动...
echo.

node index.js
pause
