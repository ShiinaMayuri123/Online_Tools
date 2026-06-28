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

# Step 1: Download
Write-Host '  [1/4] Downloading...' -ForegroundColor Yellow
$zip = "$env:TEMP\adb-agent.zip"
$root = "$env:USERPROFILE\Online_Tools-main"
$dest = "$root\local-agent"

try {
    Invoke-WebRequest -Uri 'https://github.com/ShiinaMayuri123/Online_Tools/archive/refs/heads/main.zip' -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $env:USERPROFILE -Force
    Remove-Item $zip -Force
    Write-Host '  Done' -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Download failed: $_" -ForegroundColor Red
    return
}

# Step 2: Build frontend
Write-Host '  [2/4] Building frontend...' -ForegroundColor Yellow
Set-Location $root
npm install --silent
npm run build --silent

# Step 3: Install agent dependencies
Write-Host '  [3/4] Installing agent dependencies...' -ForegroundColor Yellow
Set-Location $dest
npm install --silent

# Step 4: Create start.bat
$startContent = "@echo off`r`nchcp 65001 >nul`r`ncd /d `"%~dp0`"`r`nnode index.js`r`npause"
Set-Content -Path "$dest\start.bat" -Value $startContent -Encoding ASCII

Write-Host '  [4/4] Done!' -ForegroundColor Green
Write-Host ''
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host '    Browser will open automatically.' -ForegroundColor White
Write-Host '    Next time: double-click start.bat' -ForegroundColor White
Write-Host "    Path: $dest\start.bat" -ForegroundColor Gray
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

# Start
node index.js
