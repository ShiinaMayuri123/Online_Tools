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
echo [2/4] 安装打包工具...
call npm install -g pkg
if %errorlevel% neq 0 (
    echo [警告] 全局安装 pkg 失败，尝试本地安装...
    call npm install pkg --save-dev
)

echo.
echo [3/4] 打包 Windows 可执行文件...
if not exist dist mkdir dist
call npx pkg . --targets node18-win-x64 --output dist/adb-agent.exe
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
echo ========================================
echo.
echo 使用方法:
echo   1. 双击运行 adb-agent.exe
echo   2. 复制显示的 Token
echo   3. 在网页上粘贴 Token 进行配对
echo.

:: 打开输出目录
explorer dist

pause
