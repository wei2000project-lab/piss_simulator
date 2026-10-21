@echo off
setlocal
cd /d "%~dp0"
title Porcelain Playground
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
if errorlevel 1 (
  echo.
  echo Launch failed. Please see the message above.
  pause
)
endlocal
