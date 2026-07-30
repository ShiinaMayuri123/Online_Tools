@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   ADB 本地代理 - 打包脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 npm
    pause
    exit /b 1
)

echo [1/4] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 安装依赖失败
    pause
    exit /b 1
)

echo.
echo [2/4] 准备随程序分发的 ADB...
call npm run prepare:adb
if %errorlevel% neq 0 (
    echo [错误] 未找到 adb.exe。请安装 Android Platform Tools 后重试。
    pause
    exit /b 1
)

echo.
echo [3/4] 打包 Windows 可执行文件...
if not exist dist mkdir dist
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 打包失败
    pause
    exit /b 1
)

echo.
echo [4/4] 打包完成!
echo.
echo ========================================
echo   输出文件: dist\adb-agent.exe
echo   使用方法: 将 adb-agent.exe 与 adb.exe 放在同一目录后双击运行
echo ========================================
echo.
echo 使用方法:
echo   1. 双击运行 adb-agent.exe
echo   2. 打开现场运维网页
echo   3. 等待网页显示“连接助手已连接”
echo.

:: 打开输出目录
explorer dist

pause
