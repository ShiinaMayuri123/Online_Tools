@echo off
chcp 65001 >nul
echo.
echo  ========================================
echo    ADB 本地代理 - 一键安装
echo  ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [错误] 未找到 Node.js
    echo  请先安装: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)

echo  [1/3] 正在下载... (约1-2分钟，请耐心等待)
echo.

:: 下载并解压
powershell -ExecutionPolicy Bypass -Command "$p=$env:TEMP+'\adb.zip'; Write-Host '  下载中...' -ForegroundColor Gray; Invoke-WebRequest -Uri ('https://github.com/ShiinaMayuri123/Online_Tools/archive/refs/heads/main.zip') -OutFile $p; Write-Host '  解压中...' -ForegroundColor Gray; Expand-Archive -Path $p -DestinationPath $env:USERPROFILE -Force; Remove-Item $p; Write-Host '  完成' -ForegroundColor Green"

if not exist "%USERPROFILE%\Online_Tools-main\local-agent\index.js" (
    echo  [错误] 下载失败，请检查网络
    pause
    exit /b 1
)

echo  [2/3] 正在安装依赖...
cd /d "%USERPROFILE%\Online_Tools-main\local-agent"
call npm install --silent

if %errorlevel% neq 0 (
    echo  [错误] 依赖安装失败
    pause
    exit /b 1
)

:: 创建 start.bat
echo @echo off > start.bat
echo chcp 65001 ^>nul >> start.bat
echo cd /d "%%~dp0" >> start.bat
echo echo 启动 ADB 本地代理... >> start.bat
echo node index.js >> start.bat
echo pause >> start.bat

echo  [3/3] 安装完成！
echo.
echo  ========================================
echo    以后双击 start.bat 即可启动
echo    路径: %USERPROFILE%\Online_Tools-main\local-agent\start.bat
echo  ========================================
echo.
echo  正在启动...
echo.

node index.js
pause
