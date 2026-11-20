@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   OPERATION: CIPHER v2.2.8 - Safe Shutdown
echo ==================================================

if not exist ".cipher-server.pid" (
  echo [INFO] No running OPERATION: CIPHER server PID file found.
  pause
  exit /b 0
)

set /p SERVER_PID=<.cipher-server.pid
tasklist /FI "PID eq %SERVER_PID%" 2>nul | findstr /I "node.exe" >nul
if errorlevel 1 (
  echo [INFO] Process %SERVER_PID% is no longer a running node.exe server. Cleaning up files...
) else (
  echo Stopping Node server PID %SERVER_PID%...
  taskkill /PID %SERVER_PID% /T /F >nul 2>nul
  if errorlevel 1 (
    echo [WARNING] Could not terminate PID %SERVER_PID%.
  ) else (
    echo [OK] OPERATION: CIPHER server stopped safely.
  )
)

if exist ".cipher-server.pid" del /f /q ".cipher-server.pid"
if exist ".cipher-server.url" del /f /q ".cipher-server.url"
pause
exit /b 0
