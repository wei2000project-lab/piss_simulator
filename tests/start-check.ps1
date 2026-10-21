$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $project 'artifacts\start-stdout.log'
$errPath = Join-Path $project 'artifacts\start-stderr.log'
$batch = Join-Path $project 'start.bat'
$launcher = Start-Process -FilePath 'cmd.exe' -ArgumentList ('/d /c ""' + $batch + '""') -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput $outPath -RedirectStandardError $errPath
$launcherHandle = $launcher.Handle
$game = $null
try {
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        $processList = Get-CimInstance Win32_Process
        $descendants = @($launcher.Id)
        for ($depth = 0; $depth -lt 5; $depth++) {
            $children = @($processList | Where-Object { $descendants -contains $_.ParentProcessId -and $descendants -notcontains $_.ProcessId } | Select-Object -ExpandProperty ProcessId)
            $descendants += $children
        }
        $game = Get-Process -Id $descendants -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq 'electron' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($game) { break }
    }
    if (-not $game) { throw 'start.bat did not open the game window.' }
    Write-Output ('start.bat opened: ' + $game.MainWindowTitle)
    Start-Sleep -Milliseconds 1500
    [void]$game.CloseMainWindow()
    if (-not $launcher.WaitForExit(10000)) { throw 'Launcher did not exit after the game closed.' }
    if ($launcher.ExitCode -ne 0) { throw ('Launcher exit code: ' + $launcher.ExitCode) }
    Write-Output 'BAT LAUNCH AND CLEAN SHUTDOWN PASSED'
} finally {
    if ($game -and -not $game.HasExited) { [void]$game.CloseMainWindow() }
}
