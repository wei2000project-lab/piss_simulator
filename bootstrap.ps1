$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    $electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
    $threeModule = Join-Path $PSScriptRoot 'node_modules\three\build\three.module.js'
    if (-not (Test-Path -LiteralPath $electron) -or -not (Test-Path -LiteralPath $threeModule)) {
        Write-Host 'Preparing Porcelain Playground (first launch needs internet)...' -ForegroundColor Cyan
        $runtime = Join-Path $PSScriptRoot '.runtime'
        New-Item -ItemType Directory -Force -Path $runtime | Out-Null
        $temporary = Join-Path $runtime 'temp'
        New-Item -ItemType Directory -Force -Path $temporary | Out-Null
        $env:TEMP = $temporary
        $env:TMP = $temporary
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        $node = if ($nodeCommand) { $nodeCommand.Source } else { $null }
        $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if (-not $node -and (Test-Path -LiteralPath $bundled)) { $node = $bundled }
        if ($node) {
            $nodeVersion = (& $node --version | Select-Object -First 1)
            $nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
            if ($nodeMajor -lt 24) { $node = $null }
        }
        if (-not $node) {
            $archive = Join-Path $runtime 'node.zip'
            Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v24.14.0/node-v24.14.0-win-x64.zip' -OutFile $archive
            Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
            $node = Join-Path $runtime 'node-v24.14.0-win-x64\node.exe'
        }
        $env:ELECTRON_CACHE = Join-Path $PSScriptRoot '.cache\electron'
        $env:electron_config_cache = $env:ELECTRON_CACHE
        $npm = Join-Path $runtime 'npm\package\bin\npm-cli.js'
        if (-not (Test-Path -LiteralPath $npm)) {
            $npmArchive = Join-Path $runtime 'npm.tgz'
            Invoke-WebRequest -UseBasicParsing -Uri 'https://registry.npmjs.org/npm/-/npm-11.6.2.tgz' -OutFile $npmArchive
            New-Item -ItemType Directory -Force -Path (Join-Path $runtime 'npm') | Out-Null
            & tar.exe -xzf $npmArchive -C (Join-Path $runtime 'npm')
            if ($LASTEXITCODE -ne 0) { throw 'Could not extract npm.' }
        }
        $env:Path = (Split-Path -Parent $node) + ';' + $env:Path
        & $node $npm install --no-audit --no-fund --cache (Join-Path $PSScriptRoot '.cache\npm')
        if ($LASTEXITCODE -ne 0) { throw 'Dependency download failed. Check your internet connection and run start.bat again.' }
    }
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
