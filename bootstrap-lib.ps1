# Shared by the Windows launcher and its clean-install checks. No tar, global
# npm installation, administrator access or developer-machine paths are needed.
# Windows PowerShell 5.1 otherwise enables the legacy 260-character limit,
# which Node's nested npm files can exceed in a downloaded ZIP's folder.
[AppContext]::SetSwitch('Switch.System.IO.UseLegacyPathHandling', $false)
[AppContext]::SetSwitch('Switch.System.IO.BlockLongPaths', $false)
function Remove-SetupDirectory {
    param([string]$Path, [string]$RuntimeRoot)
    $target = [IO.Path]::GetFullPath($Path)
    $rootPrefix = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\') + '\'
    if (-not $target.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to remove a directory outside the project runtime.'
    }
    if (Test-Path -LiteralPath $target) { [IO.Directory]::Delete(('\\?\' + $target), $true) }
}

function Expand-SetupZip {
    param([string]$Archive, [string]$Destination)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $root = '\\?\' + [IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        foreach ($entry in $zip.Entries) {
            # Normalize ZIP separators before using Windows extended paths.
            # Check relative segments before joining, without MAX_PATH checks.
            $relative = $entry.FullName.Replace('/', '\')
            if ($relative.StartsWith('\') -or $relative.Contains(':') -or @($relative.Split('\') | Where-Object { $_ -eq '..' }).Count -gt 0) { throw 'ZIP entry escaped the extraction directory.' }
            $target = $root + $relative
            if ($relative.EndsWith('\')) { [void][IO.Directory]::CreateDirectory($target); continue }
            [void][IO.Directory]::CreateDirectory($target.Substring(0, $target.LastIndexOf('\')))
            $sourceStream = $entry.Open()
            try {
                $targetStream = [IO.File]::Open($target, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
                try { $sourceStream.CopyTo($targetStream) } finally { $targetStream.Dispose() }
            } finally { $sourceStream.Dispose() }
        }
    } finally { $zip.Dispose() }
}

function Receive-VerifiedDownload {
    param([string]$Uri, [string]$Destination, [string]$Sha256, [int]$Attempts = 3)
    if (Test-Path -LiteralPath $Destination) {
        if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -eq $Sha256) { return }
        Write-Host 'Discarding an incomplete or damaged download.' -ForegroundColor Yellow
        Remove-Item -LiteralPath $Destination -Force
    }
    $partial = $Destination + '.part'
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
            Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $partial -TimeoutSec 120
            if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne $Sha256) {
                throw 'The downloaded file is incomplete or its SHA-256 checksum does not match.'
            }
            Move-Item -LiteralPath $partial -Destination $Destination -Force
            return
        } catch {
            if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
            if ($attempt -eq $Attempts) { throw ('Download failed after ' + $Attempts + ' attempts: ' + $Uri + "`n" + $_.Exception.Message) }
            Write-Host ('Download attempt ' + $attempt + ' failed; retrying...') -ForegroundColor Yellow
            Start-Sleep -Seconds $attempt
        }
    }
}

function Test-NodeAndNpm {
    param([string]$Node, [string]$Npm)
    if (-not (Test-Path -LiteralPath $Node) -or -not (Test-Path -LiteralPath $Npm)) { return $false }
    try {
        $output = @(& $Node --version 2>$null)
        $version = [string]$output[0]
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 24) { return $false }
        $output = @(& $Node $Npm --version 2>$null)
        $npmVersion = [string]$output[0]
        return ($LASTEXITCODE -eq 0 -and $npmVersion -match '^\d+\.\d+\.\d+')
    } catch { return $false }
}

function Get-SetupRuntime {
    param([string]$ProjectRoot, [switch]$Portable)
    $runtimeRoot = Join-Path $ProjectRoot '.runtime'
    $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'arm64' } else { 'x64' }
    $name = 'node-v24.14.0-win-' + $architecture
    $folder = Join-Path $runtimeRoot $name
    $node = Join-Path $folder 'node.exe'
    $npm = Join-Path $folder 'node_modules\npm\bin\npm-cli.js'
    if (Test-NodeAndNpm $node $npm) { return @{ Node = $node; Npm = $npm } }
    if (-not $Portable) {
        $installed = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($installed) {
            $installedNpm = Join-Path (Split-Path -Parent $installed.Source) 'node_modules\npm\bin\npm-cli.js'
            if (Test-NodeAndNpm $installed.Source $installedNpm) { return @{ Node = $installed.Source; Npm = $installedNpm } }
        }
    }
    # Both hashes are pinned from the official v24.14.0 SHASUMS256.txt.
    $hashes = @{
        x64 = '313fa40c0d7b18575821de8cb17483031fe07d95de5994f6f435f3b345f85c66'
        arm64 = '88d36e8109736a2fa9bdc596f2cf507a3c52c69cdf96e54f8acd473ec14be853'
    }
    $downloads = Join-Path $runtimeRoot 'downloads'
    New-Item -ItemType Directory -Force -Path $downloads | Out-Null
    $archive = Join-Path $downloads ($name + '.zip')
    Write-Host 'Downloading official portable Node.js with its included npm...' -ForegroundColor Cyan
    Receive-VerifiedDownload -Uri ('https://nodejs.org/dist/v24.14.0/' + $name + '.zip') -Destination $archive -Sha256 $hashes[$architecture]
    $staging = Join-Path $runtimeRoot ('node-extract-' + [guid]::NewGuid().ToString('N'))
    try {
        New-Item -ItemType Directory -Path $staging | Out-Null
        Expand-SetupZip -Archive $archive -Destination $staging
        $extracted = Join-Path $staging $name
        $stageNode = Join-Path $extracted 'node.exe'
        $stageNpm = Join-Path $extracted 'node_modules\npm\bin\npm-cli.js'
        if (-not (Test-NodeAndNpm $stageNode $stageNpm)) { throw 'The official Node.js ZIP did not produce a working Node.js/npm pair.' }
        # The source and destination of this directory move must both remain
        # below this project's .runtime, including repair after interruption.
        $runtimePrefix = [IO.Path]::GetFullPath($runtimeRoot).TrimEnd('\') + '\'
        foreach ($candidate in @($extracted, $folder)) {
            if (-not [IO.Path]::GetFullPath($candidate).StartsWith($runtimePrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Runtime extraction path escaped the project.' }
        }
        Remove-SetupDirectory -Path $folder -RuntimeRoot $runtimeRoot
        Move-Item -LiteralPath $extracted -Destination $folder
    } finally { Remove-SetupDirectory -Path $staging -RuntimeRoot $runtimeRoot }
    return @{ Node = $node; Npm = $npm }
}

function Test-GameDependencies {
    param([string]$ProjectRoot)
    try {
        $required = @('electron\dist\electron.exe', 'electron\dist\version', 'electron\path.txt', 'electron\dist\icudtl.dat', 'electron\dist\resources\default_app.asar', 'three\build\three.module.js', 'three\build\three.core.js')
        foreach ($file in $required) { if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ('node_modules\' + $file)))) { return $false } }
        $manifest = Get-Content -LiteralPath (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
        foreach ($package in @('electron', 'three')) {
            $installed = Get-Content -LiteralPath (Join-Path $ProjectRoot ('node_modules\' + $package + '\package.json')) -Raw | ConvertFrom-Json
            if ($installed.version -ne $manifest.dependencies.$package) { return $false }
        }
        $version = (Get-Content -LiteralPath (Join-Path $ProjectRoot 'node_modules\electron\dist\version') -Raw).Trim().TrimStart('v')
        $executable = (Get-Content -LiteralPath (Join-Path $ProjectRoot 'node_modules\electron\path.txt') -Raw).Trim()
        return ($version -eq $manifest.dependencies.electron -and $executable -eq 'electron.exe')
    } catch { return $false }
}

function Install-GameDependencies {
    param([string]$ProjectRoot, [hashtable]$Runtime)
    $env:Path = (Split-Path -Parent $Runtime.Node) + ';' + $env:Path
    $env:ELECTRON_CACHE = Join-Path $ProjectRoot '.cache\electron'
    $env:electron_config_cache = $env:ELECTRON_CACHE
    $command = if (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package-lock.json')) { 'ci' } else { 'install' }
    $npmArguments = @($Runtime.Npm, $command, '--no-audit', '--no-fund', '--include=optional', '--ignore-scripts=false', '--registry=https://registry.npmjs.org', '--fetch-retries=3', '--fetch-retry-mintimeout=1000', '--fetch-retry-maxtimeout=8000', '--fetch-timeout=120000', '--cache', (Join-Path $ProjectRoot '.cache\npm'))
    $oldForce = $env:force_no_cache
    try {
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            Write-Host ('Installing game dependencies (attempt ' + $attempt + '/3)...') -ForegroundColor Cyan
            if ($attempt -gt 1) { $env:force_no_cache = 'true' }
            & $Runtime.Node @npmArguments
            if ($LASTEXITCODE -eq 0) {
                # npm can consider the package installed even if an earlier
                # Electron binary download failed or install scripts were skipped.
                $installer = Join-Path $ProjectRoot 'node_modules\electron\install.js'
                if (-not (Test-GameDependencies $ProjectRoot) -and (Test-Path -LiteralPath $installer)) { & $Runtime.Node $installer }
                if (Test-GameDependencies $ProjectRoot) { return }
            }
            if ($attempt -lt 3) { Write-Host 'Installation was incomplete; retrying with a fresh Electron download...' -ForegroundColor Yellow; Start-Sleep -Seconds $attempt }
        }
        throw 'Dependency installation failed after 3 attempts. Check access to nodejs.org, registry.npmjs.org and github.com, then run start.bat again. Completed downloads are cached; game saves are not removed.'
    } finally { $env:force_no_cache = $oldForce }
}
