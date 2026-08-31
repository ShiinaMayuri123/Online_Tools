$ErrorActionPreference = 'Stop'

$requiredFiles = @('adb-agent.exe', 'adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll')
$distPath = Join-Path $PSScriptRoot 'dist'
$files = @(
    Get-ChildItem -LiteralPath $distPath -File |
        Where-Object { $_.Name -in $requiredFiles }
)
$missingFiles = @($requiredFiles | Where-Object { $_ -notin $files.Name })

if ($missingFiles.Count -gt 0) {
    throw "Portable archive is missing: $($missingFiles -join ', ')"
}

$archivePath = Join-Path $distPath 'adb-agent-portable.zip'
Compress-Archive -Path $files.FullName -DestinationPath $archivePath -Force
Write-Output "Created $archivePath"
