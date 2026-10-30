param([string]$RuntimeProject)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
. (Join-Path $project 'bootstrap-lib.ps1')
$testRoot = Join-Path $project ('.runtime\bootstrap-unit-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
$script:checks = 0
function Assert-Setup($condition, [string]$message) { if (-not $condition) { throw $message } }
function Check-Setup([string]$name, [scriptblock]$body) { & $body; $script:checks++; Write-Host ('PASS: ' + $name) }
function Start-Sleep { param([int]$Seconds) }

$script:payload = [Text.Encoding]::UTF8.GetBytes('a complete, verified download')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = [BitConverter]::ToString($sha.ComputeHash($script:payload)).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
$script:requests = 0
$script:failures = 0
$script:networkFailure = $false
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, [string]$Uri, [string]$OutFile, [int]$TimeoutSec)
    $script:requests++
    if ($script:requests -le $script:failures) {
        [IO.File]::WriteAllBytes($OutFile, [byte[]]@(1, 2, 3))
        if ($script:networkFailure) { throw 'Simulated connection interruption.' }
    } else { [IO.File]::WriteAllBytes($OutFile, $script:payload) }
}

try {
    Check-Setup 'truncated cache and stale partial file are discarded; checksum mismatch retries' {
        $archive = Join-Path $testRoot 'download.zip'
        [IO.File]::WriteAllText($archive, 'truncated cached archive')
        [IO.File]::WriteAllText(($archive + '.part'), 'previous interrupted download')
        $script:requests = 0; $script:failures = 1
        Receive-VerifiedDownload -Uri 'https://example.invalid/test' -Destination $archive -Sha256 $digest
        Assert-Setup ($script:requests -eq 2) 'Truncated downloads must be retried.'
        Assert-Setup ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -eq $digest) 'Only verified bytes may become the archive.'
        Assert-Setup (-not (Test-Path -LiteralPath ($archive + '.part'))) 'Partial download must be removed.'
    }
    Check-Setup 'a validated cached archive is reused without any network request' {
        $script:requests = 0; $script:failures = 99
        Receive-VerifiedDownload -Uri 'https://example.invalid/test' -Destination (Join-Path $testRoot 'download.zip') -Sha256 $digest
        Assert-Setup ($script:requests -eq 0) 'Valid cache must not contact the network.'
    }
    Check-Setup 'connection interruption is retried and never leaves a partial archive' {
        $archive = Join-Path $testRoot 'interrupted.zip'
        $script:requests = 0; $script:failures = 1; $script:networkFailure = $true
        Receive-VerifiedDownload -Uri 'https://example.invalid/test' -Destination $archive -Sha256 $digest
        Assert-Setup ($script:requests -eq 2) 'Network interruption must be retried.'
        Assert-Setup (-not (Test-Path -LiteralPath ($archive + '.part'))) 'Interrupted temporary file must be cleaned.'
        $script:networkFailure = $false
    }
    Check-Setup 'repeated truncated downloads stop after three attempts without publishing bad data' {
        $archive = Join-Path $testRoot 'failed.zip'
        $script:requests = 0; $script:failures = 99; $failed = $false
        try { Receive-VerifiedDownload -Uri 'https://example.invalid/test' -Destination $archive -Sha256 $digest } catch { $failed = $true }
        Assert-Setup ($failed -and $script:requests -eq 3) 'Repeated failures must stop after three attempts.'
        Assert-Setup (-not (Test-Path -LiteralPath $archive)) 'An invalid archive must never be promoted.'
        Assert-Setup (-not (Test-Path -LiteralPath ($archive + '.part'))) 'The final partial file must be removed.'
    }
    Check-Setup 'ZIP extraction supports paths longer than 260 characters' {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        Add-Type -AssemblyName System.IO.Compression
        $archive = Join-Path $testRoot 'long-path.zip'
        $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
        $relative = 'node/' + ('a' * 100) + '/' + ('b' * 100) + '/file.txt'
        try {
            $stream = $zip.CreateEntry($relative).Open()
            try { $stream.Write($script:payload, 0, $script:payload.Length) } finally { $stream.Dispose() }
        } finally { $zip.Dispose() }
        $directory = Join-Path $testRoot 'long-extract'
        Expand-SetupZip -Archive $archive -Destination $directory
        $file = '\\?\' + $directory + '\' + $relative.Replace('/', '\')
        Assert-Setup ($file.Length -gt 260) 'Test fixture must exceed MAX_PATH.'
        Assert-Setup ([IO.File]::ReadAllText($file) -eq [Text.Encoding]::UTF8.GetString($script:payload)) 'Long-path extraction changed the data.'
    }
    Check-Setup 'ZIP traversal cannot write outside the staging directory' {
        $archive = Join-Path $testRoot 'traversal.zip'
        $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
        try { [void]$zip.CreateEntry('../escaped.txt') } finally { $zip.Dispose() }
        $failed = $false
        try { Expand-SetupZip -Archive $archive -Destination (Join-Path $testRoot 'traversal-extract') } catch { $failed = $true }
        Assert-Setup $failed 'ZIP traversal should be rejected.'
        Assert-Setup (-not (Test-Path -LiteralPath (Join-Path $testRoot 'escaped.txt'))) 'ZIP escaped its destination.'
    }
    Check-Setup 'cleanup refuses paths outside the project runtime' {
        $failed = $false
        try { Remove-SetupDirectory -Path $project -RuntimeRoot (Join-Path $project '.runtime') } catch { $failed = $true }
        Assert-Setup $failed 'Cleanup must never target the source project.'
    }
    if ($RuntimeProject) {
        Check-Setup 'official portable Node/npm pair can be reused offline in Windows PowerShell 5.1' {
            $script:requests = 0; $script:failures = 99
            $runtime = Get-SetupRuntime -ProjectRoot $RuntimeProject -Portable
            Assert-Setup (Test-NodeAndNpm $runtime.Node $runtime.Npm) 'Portable Node/npm validation failed.'
            Assert-Setup ($script:requests -eq 0) 'A valid portable runtime must not download again.'
        }
    }
    Write-Output ($script:checks.ToString() + ' BOOTSTRAP CHECKS PASSED')
} finally { Remove-SetupDirectory -Path $testRoot -RuntimeRoot (Join-Path $project '.runtime') }
