@echo off
chcp 65001 >nul
echo.
echo  ========================================
echo    ADB Local Agent - Installer
echo  ========================================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found
    echo  Please install: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)
echo  [1/3] Downloading...
powershell -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; $z=$env:TEMP+'\adb.zip'; Invoke-WebRequest -Uri 'https://github.com/ShiinaMayuri123/Online_Tools/archive/refs/heads/main.zip' -OutFile $z; Expand-Archive -Path $z -DestinationPath $env:USERPROFILE -Force; Remove-Item $z"
if not exist "%USERPROFILE%\Online_Tools-main\local-agent\index.js" (
    echo  [ERROR] Download failed
    pause
    exit /b 1
)
echo  [2/3] Installing dependencies...
cd /d "%USERPROFILE%\Online_Tools-main\local-agent"
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed
    pause
    exit /b 1
)
echo @echo off> start.bat
echo chcp 65001 ^>nul>> start.bat
echo cd /d "%%~dp0">> start.bat
echo node index.js>> start.bat
echo pause>> start.bat
echo  [3/3] Done!
echo.
echo  Starting ADB agent...
echo.
node index.js
pause
