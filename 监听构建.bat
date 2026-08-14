@echo off
cd /d "%~dp0"
echo Watching... edit md files and they will rebuild automatically.
echo Press Ctrl+C to stop.
node build.mjs --watch
echo.
pause
