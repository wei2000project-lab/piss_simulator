$ErrorActionPreference = 'Stop'
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'CursorBridge.cs') -ReferencedAssemblies 'System.Windows.Forms', 'System.Drawing'
    [Porcelain.CursorBridge]::Run()
} catch {
    [Console]::Error.WriteLine($_.Exception.ToString())
    exit 1
}
