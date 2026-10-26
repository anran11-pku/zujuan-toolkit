@echo off
chcp 65001 >nul
setlocal
if not exist "%~dp0api.local.json" copy /y "%~dp0API设置示例.json" "%~dp0api.local.json" >nul
start "" notepad.exe "%~dp0api.local.json"
