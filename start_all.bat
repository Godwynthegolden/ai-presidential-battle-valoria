@echo off
title AI Presidential Battle - 9router Edition
cd /d "%~dp0"

echo ======================================================================
echo           AI REPUBLIC: PRESIDENTIAL BATTLE (9router Edition)
echo ======================================================================
echo.

:: Check if node_modules exists, install if missing
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

:: Wait 3 seconds in background to allow Next.js server to boot, then open browser
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [INFO] Starting Next.js Dev Server on http://localhost:3000...
echo [INFO] Your default browser will open automatically in 3 seconds.
echo [INFO] Press Ctrl+C to terminate the server.
echo ======================================================================
echo.

call npm run dev

pause
