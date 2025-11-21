@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ===========================================================
REM  WhatsSelf - Script de Correção Automática (Windows)
REM  Uso: repair-windows.bat [--prepare-only] [--force-install] [--reset-session]
REM ===========================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "NEEDS_NODE_FLAG=1"
echo %NODE_OPTIONS% | findstr /I "--no-deprecation" >nul 2>&1 && set "NEEDS_NODE_FLAG=0"
if "%NEEDS_NODE_FLAG%"=="1" (
	if "%NODE_OPTIONS%"=="" (
		set NODE_OPTIONS=--no-deprecation
	) else (
		set NODE_OPTIONS=%NODE_OPTIONS% --no-deprecation
	)
)

set "MODE=full"
set "FORCE_INSTALL=0"
set "RESET_SESSION=0"

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--prepare-only" (
	set "MODE=prepare"
) else if /I "%~1"=="--force-install" (
	set "FORCE_INSTALL=1"
) else if /I "%~1"=="--reset-session" (
	set "RESET_SESSION=1"
) else (
	echo [AVISO] Argumento desconhecido "%~1" ignorado.
)
shift
goto parse_args

:args_done

if not exist "%ROOT%apps\backend\package.json" (
	echo [ERRO] Execute este script na raiz do projeto (onde está start.bat).
	exit /b 1
)

for /f "tokens=2 delims=v" %%I in ('node -v 2^>nul') do set "NODE_VERSION=%%I"
if not defined NODE_VERSION (
	echo [ERRO] Node.js não encontrado. Instale o Node 20.19.0 ou superior.
	exit /b 1
)
for /f "tokens=1,2 delims=." %%I in ("%NODE_VERSION%") do (
	set "NODE_MAJOR=%%I"
	set "NODE_MINOR=%%J"
)
if !NODE_MAJOR! LSS 20 (
	echo [ERRO] Node.js 20.19.0 ou superior é obrigatório. Versão atual: v%NODE_VERSION%
	echo [DICA] Atualize usando "nvm install 20.19.0" e "nvm use 20.19.0".
	exit /b 1
)
if !NODE_MAJOR! EQU 20 if !NODE_MINOR! LSS 19 (
	echo [ERRO] Node.js 20.19.0 ou superior é obrigatório. Versão atual: v%NODE_VERSION%
	echo [DICA] Execute "nvm install 20.19.0" e "nvm use 20.19.0".
	exit /b 1
)

set "LOG_DIR=%ROOT%logs"
if not exist "%LOG_DIR%" (
	mkdir "%LOG_DIR%" >nul 2>&1
)
set "LOG_FILE=%LOG_DIR%\repair.log"

call :log "=== Reparação WhatsSelf iniciada (modo=%MODE%) ==="

REM Em modo completo executamos tudo; em modo prepare apenas verificações leves.
if /I "%MODE%"=="full" (
	call :killProcess node.exe
) else (
	call :log "Modo preparação: pulando finalização de processos."
)

call :ensureEnvSetup
if errorlevel 1 goto :error
if "%RESET_SESSION%"=="1" (
	call :resetSessionDir
	if errorlevel 1 goto :error
)

if /I "%MODE%"=="full" (
	call :installDependencies "apps\backend" "Backend"
	call :installDependencies "frontend" "Frontend"
	call :syncDatabase
	call :buildBackend
	call :buildFrontend
) else (
	call :log "Modo preparação: dependências e builds não executados (use sem --prepare-only para correção completa)."
)

call :log "=== Reparação finalizada com sucesso ==="
exit /b 0

REM ===================== Funções =====================

:log
set "MSG=%~1"
echo [%DATE% %TIME%] %MSG%
>>"%LOG_FILE%" echo [%DATE% %TIME%] %MSG%
exit /b 0

:killProcess
set "PROC=%~1"
call :log "Finalizando processos %PROC% em execução (se houver)..."
tasklist /FI "IMAGENAME eq %PROC%" | find /I "%PROC%" >nul 2>&1
if errorlevel 1 (
	call :log "Nenhum processo %PROC% encontrado."
	exit /b 0
)
taskkill /F /IM "%PROC%" /T >nul 2>&1
if errorlevel 1 (
	call :log "Aviso: não foi possível finalizar %PROC% (pode já ter sido encerrado)."
) else (
	call :log "Processos %PROC% finalizados."
)
exit /b 0

:ensureEnvSetup
call :log "Executando scripts\ensure-env.mjs..."
pushd "%ROOT%" >nul
node scripts\ensure-env.mjs --silent
set "ENSURE_ERROR=%ERRORLEVEL%"
popd >nul
if not "%ENSURE_ERROR%"=="0" (
	call :log "Falha ao garantir arquivos de ambiente (código %ENSURE_ERROR%)."
	exit /b 1
)
exit /b 0

:resetSessionDir
set "SESSION_DIR=%ROOT%data\whatsapp_session"
if not exist "%SESSION_DIR%" (
	mkdir "%SESSION_DIR%" >nul 2>&1
	call :log "Diretório de sessão criado novamente."
	exit /b 0
)
set "BACKUP_NAME=whatsapp_session_backup_%RANDOM%"
set "BACKUP_DIR=%ROOT%data\%BACKUP_NAME%"
call :log "Resetando sessão do WhatsApp (backup em data\%BACKUP_NAME%)..."
ren "%SESSION_DIR%" "%BACKUP_NAME%" >nul 2>&1
mkdir "%ROOT%data\whatsapp_session" >nul 2>&1
exit /b 0

:installDependencies
set "TARGET=%~1"
set "LABEL=%~2"
set "TARGET_DIR=%ROOT%%TARGET%"
set "NEED_INSTALL=0"
if "%FORCE_INSTALL%"=="1" set "NEED_INSTALL=1"
if not exist "%TARGET_DIR%\node_modules" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
	call :log "Instalando dependências do %LABEL%..."
	pushd "%TARGET_DIR%" >nul
	call npm install
	if errorlevel 1 (
		popd >nul
		call :log "Falha ao instalar dependências do %LABEL%. Verifique o npm."
		exit /b 1
	)
	popd >nul
) else (
	call :log "%LABEL% já possui dependências. Use --force-install para reinstalar."
)
exit /b 0

:syncDatabase
call :log "Sincronizando banco (Prisma db push) e gerando client..."
pushd "%ROOT%apps\backend" >nul
call npx prisma db push --skip-seed
if errorlevel 1 (
	popd >nul
	call :log "Erro ao executar prisma db push."
	exit /b 1
)
call npm run db:generate
if errorlevel 1 (
	popd >nul
	call :log "Erro ao gerar Prisma Client."
	exit /b 1
)
popd >nul
exit /b 0

:buildBackend
call :log "Gerando build do backend..."
pushd "%ROOT%apps\backend" >nul
call npm run build
if errorlevel 1 (
	popd >nul
	call :log "Erro ao executar npm run build no backend."
	exit /b 1
)
popd >nul
exit /b 0

:buildFrontend
call :log "Gerando build do frontend..."
pushd "%ROOT%frontend" >nul
call npm run build
if errorlevel 1 (
	popd >nul
	call :log "Erro ao executar npm run build no frontend."
	exit /b 1
)
popd >nul
exit /b 0

