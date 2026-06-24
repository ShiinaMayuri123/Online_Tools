@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   ADB 本地代理 - 启动脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    echo 或使用打包好的 adb-agent.exe
    pause
    exit /b 1
)

:: 检查依赖
if not exist node_modules (
    echo [1/2] 安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 安装依赖失败
        pause
        exit /b 1
    )
)

echo [2/2] 启动本地代理...
echo.
node index.js

pause
