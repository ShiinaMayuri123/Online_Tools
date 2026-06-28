# ADB Local Agent - One-click Setup
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host ''
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host '    ADB Local Agent - Setup' -ForegroundColor Cyan
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

# Check Node.js
if (-not (Get-Command node -EA SilentlyContinue)) {
    Write-Host '  [ERROR] Node.js not found' -ForegroundColor Red
    Write-Host '  Please install from https://nodejs.org/' -ForegroundColor Yellow
    Start-Process 'https://nodejs.org/'
    return
}

Write-Host '  [1/3] Downloading...' -ForegroundColor Yellow
$zip = "$env:TEMP\adb-agent.zip"
$dest = "$env:USERPROFILE\Online_Tools-main\local-agent"

try {
    Invoke-WebRequest -Uri 'https://github.com/ShiinaMayuri123/Online_Tools/archive/refs/heads/main.zip' -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $env:USERPROFILE -Force
    Remove-Item $zip -Force
    Write-Host '  Done' -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Download failed: $_" -ForegroundColor Red
    return
}

Write-Host '  [2/3] Installing dependencies...' -ForegroundColor Yellow
Set-Location $dest
npm install --silent

# Create start.bat
$startContent = "@echo off`r`nchcp 65001 >nul`r`ncd /d `"%~dp0`"`r`nnode index.js`r`npause"
Set-Content -Path "$dest\start.bat" -Value $startContent -Encoding ASCII

Write-Host '  [3/3] Done!' -ForegroundColor Green
Write-Host ''
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host '    Next time: double-click start.bat' -ForegroundColor White
Write-Host "    Path: $dest\start.bat" -ForegroundColor Gray
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

# Start
node index.js
