@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo WhatsSelf Frontend - Windows Setup Script
echo ============================================================
echo.

REM Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do echo Node.js version: %%i
echo.

REM Check if npm is installed
echo [2/5] Checking npm installation...
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do echo npm version: %%i
echo.

REM Install dependencies
echo [3/5] Installing dependencies...
echo This may take 2-5 minutes...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

REM Setup environment file
echo [4/5] Setting up environment configuration...
if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local"
        echo Created .env.local from .env.example
    ) else (
        echo Creating .env.local with default values...
        (
            echo VITE_API_URL=http://localhost:3001
            echo VITE_WS_URL=ws://localhost:3001
            echo VITE_WS_PATH=/socket.io
        ) > .env.local
        echo Created .env.local with default values
    )
) else (
    echo .env.local already exists
)
echo.

REM Type check
echo [5/5] Running TypeScript type check...
call npm run type-check
if %errorLevel% neq 0 (
    echo [WARNING] TypeScript errors found, but setup can continue
    echo Run 'npm run lint:fix' to fix common issues
)
echo.

echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Review .env.local configuration
echo   2. Ensure backend is running on port 3001
echo   3. Run: start-frontend.bat
echo.
echo Common commands:
echo   npm run dev         - Start development server
echo   npm run build       - Build for production
echo   npm run lint:fix    - Fix linting issues
echo   npm run type-check  - Check TypeScript errors
echo.
pause
