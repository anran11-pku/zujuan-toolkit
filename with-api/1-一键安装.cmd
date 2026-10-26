@echo off
chcp 65001 >nul
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\manage.ps1" -Action Install
set "taskExit=%errorlevel%"
echo.
pause
exit /b %taskExit%
