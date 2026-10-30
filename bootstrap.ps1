param([switch]$InstallOnly, [switch]$PortableRuntime)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    . (Join-Path $PSScriptRoot 'bootstrap-lib.ps1')
    $electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
    if (-not (Test-GameDependencies $PSScriptRoot)) {
        Write-Host 'Preparing Porcelain Playground (first launch needs internet)...' -ForegroundColor Cyan
        $runtime = Join-Path $PSScriptRoot '.runtime'
        New-Item -ItemType Directory -Force -Path $runtime | Out-Null
        $temporary = Join-Path $runtime 'temp'
        New-Item -ItemType Directory -Force -Path $temporary | Out-Null
        $env:TEMP = $temporary
        $env:TMP = $temporary
        $setup = Get-SetupRuntime -ProjectRoot $PSScriptRoot -Portable:$PortableRuntime
        Install-GameDependencies -ProjectRoot $PSScriptRoot -Runtime $setup
    }
    if ($InstallOnly) { Write-Host 'Dependencies are ready.' -ForegroundColor Green; exit 0 }
    # Electron interprets this environment variable as Node mode; remove inherited values.
    Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    # A GUI executable launched with & may return immediately in Windows
    # PowerShell 5.1 without setting LASTEXITCODE. Wait on the process itself.
    $gameProcess = New-Object System.Diagnostics.Process
    $gameProcess.StartInfo.FileName = $electron
    $gameProcess.StartInfo.Arguments = '"' + $PSScriptRoot + '"'
    $gameProcess.StartInfo.WorkingDirectory = $PSScriptRoot
    $gameProcess.StartInfo.UseShellExecute = $false
    $gameProcess.StartInfo.CreateNoWindow = $true
    [void]$gameProcess.Start()
    $gameProcess.WaitForExit()
    $gameExitCode = $gameProcess.ExitCode
    $gameProcess.Dispose()
    if ($gameExitCode -ne 0) { throw ('Application exited with code ' + $gameExitCode) }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
