@echo off
cd /d "%~dp0"
echo Building blog...
node build.mjs
echo.
pause
