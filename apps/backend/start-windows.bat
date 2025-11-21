@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo WhatsSelf Backend - Starting Development Server
echo ============================================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [ERROR] Dependencies not installed!
    echo Please run setup-windows.bat first.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please run setup-windows.bat first.
    pause
    exit /b 1
)

REM Check if database exists
if not exist "prisma\dev.db" (
    echo [WARNING] Database file not found!
    echo Running Prisma setup...
    call npx prisma generate
    if errorlevel 1 goto prisma_error
    call npx prisma db push
    if errorlevel 1 goto prisma_error
    echo.
)

goto start_server

:prisma_error
echo [ERROR] Prisma command failed. Check the logs above.
pause
exit /b 1

:start_server

echo.
echo Starting WhatsSelf Backend...
echo.
echo Server will be available at: http://localhost:3001
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
