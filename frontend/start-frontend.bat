@echo off
setlocal

echo ============================================================
echo WhatsSelf Frontend - Starting Development Server
echo ============================================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [ERROR] Dependencies not installed!
    echo Please run setup-frontend.bat first.
    pause
    exit /b 1
)

REM Check if .env.local exists
if not exist ".env.local" (
    echo [WARNING] .env.local file not found!
    echo Creating with default values...
    (
        echo VITE_API_URL=http://localhost:3001
        echo VITE_WS_URL=ws://localhost:3001
        echo VITE_WS_PATH=/socket.io
    ) > .env.local
    echo Created .env.local
)

REM Check if backend is running
echo Checking backend connectivity...
curl -s http://localhost:3001/health >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [WARNING] Backend does not appear to be running!
    echo.
    echo The frontend requires the backend API running on port 3001.
    echo Please start the backend first:
    echo    cd ..\apps\backend
    echo    npm run dev
    echo.
    set /p CONTINUE="Continue anyway? (Y/N): "
    if /i not "!CONTINUE!"=="Y" (
        echo.
        echo Startup cancelled. Start backend first.
        pause
        exit /b 0
    )
)

echo.
echo Starting WhatsSelf Frontend...
echo.
echo Server will be available at: http://localhost:5173
echo Press CTRL+C to stop the server.
echo ============================================================
echo.

npm run dev

REM If we get here, the server stopped
echo.
echo ============================================================
echo Server stopped.
echo ============================================================
pause
