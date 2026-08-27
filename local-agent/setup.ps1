# ADB Local Agent - versioned installer bootstrapper
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AgentVersion = '1.1.3'
$ReleaseUrl = "https://github.com/ShiinaMayuri123/Online_Tools/releases/download/v$AgentVersion"
$InstallerPath = Join-Path ([System.IO.Path]::GetTempPath()) "adb-agent-$AgentVersion-setup.exe"
$ChecksumPath = Join-Path ([System.IO.Path]::GetTempPath()) "adb-agent-$AgentVersion-SHA256SUMS.txt"

Write-Host ''
Write-Host "  下载 ADB Local Agent $AgentVersion" -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri "$ReleaseUrl/adb-agent-setup.exe" -OutFile $InstallerPath
    Invoke-WebRequest -Uri "$ReleaseUrl/SHA256SUMS.txt" -OutFile $ChecksumPath

    $checksumLine = Get-Content -LiteralPath $ChecksumPath |
        Where-Object { $_ -match '\sadb-agent-setup\.exe$' } |
        Select-Object -First 1
    if (-not $checksumLine) {
        throw '发布校验文件中缺少 adb-agent-setup.exe 的 SHA-256。'
    }

    $expectedHash = ($checksumLine -split '\s+')[0].ToUpperInvariant()
    $actualHash = (Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($expectedHash -ne $actualHash) {
        throw '安装包 SHA-256 校验失败，已停止安装。'
    }

    Start-Process -FilePath $InstallerPath -Wait
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
