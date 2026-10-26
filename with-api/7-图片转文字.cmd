@echo off
chcp 65001 >nul
setlocal
if not exist "%~dp0.runtime\node-v24.14.1-win-x64\node.exe" (
  echo 请先运行“1-一键安装.cmd”。
  pause
  exit /b 1
)
"%~dp0.runtime\node-v24.14.1-win-x64\node.exe" "%~dp0tools\ocr.cjs"
set "taskExit=%errorlevel%"
echo.
pause
exit /b %taskExit%
