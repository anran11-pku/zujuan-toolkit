@echo off
chcp 65001 >nul
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\manage.ps1" -Action Stop
set "taskExit=%errorlevel%"
echo.
pause
exit /b %taskExit%
