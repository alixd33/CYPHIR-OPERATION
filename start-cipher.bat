@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==================================================
echo   OPERATION: CIPHER v2.2.1 - Windows Launcher
echo ==================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js 18+ from https://nodejs.org and try again.
  pause
  exit /b 1
)

if exist ".cipher-server.url" del /f /q ".cipher-server.url"

netstat -ano | findstr /R ":4173[ ]" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [WARNING] Default port 4173 is occupied! Trying automatic free port...
  start "OPERATION: CIPHER Server" /B cmd /c "node server.mjs --auto-port > .cipher-server.log 2>&1"
) else (
  start "OPERATION: CIPHER Server" /B cmd /c "node server.mjs --port 4173 > .cipher-server.log 2>&1"
)

set /a tries=0
:waitloop
if exist ".cipher-server.url" goto ready
timeout /t 1 /nobreak >nul
set /a tries+=1
if %tries% GEQ 12 (
  echo [ERROR] Server did not start in time. Check .cipher-server.log for details:
  if exist ".cipher-server.log" type ".cipher-server.log"
  pause
  exit /b 1
)
goto waitloop

:ready
set /p GAME_URL=<.cipher-server.url
echo [OK] Server running at: %GAME_URL%
echo Opening browser...
start "" "%GAME_URL%"
echo Run stop-cipher.bat to shut down the local server safely.
exit /b 0
