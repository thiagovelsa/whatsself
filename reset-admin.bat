@echo off
echo ===========================================================
echo       RESETANDO CREDENCIAIS DO ADMIN
echo ===========================================================
echo.
echo Este script vai:
echo   1. Atualizar o .env com as novas credenciais
echo   2. Resetar o usuario admin no banco de dados
echo.
echo Credenciais novas:
echo   Email: admin@whatsself.local
echo   Senha: admin
echo.
pause

cd /d "%~dp0apps\backend"

echo [1/2] Atualizando .env...
node ..\..\scripts\ensure-env.mjs
if errorlevel 1 (
	echo [ERRO] Falha ao atualizar .env
	pause
	exit /b 1
)

echo [2/2] Resetando usuario admin no banco de dados...
echo.
echo IMPORTANTE: Se o usuario admin ja existe, ele sera atualizado.
echo Se nao existir, sera criado.
echo.
call npm run admin:reset
if errorlevel 1 (
	echo [ERRO] Falha ao resetar usuario admin
	echo Verifique os logs acima para mais detalhes.
	pause
	exit /b 1
)

echo.
echo ===========================================================
echo       CREDENCIAIS RESETADAS COM SUCESSO!
echo ===========================================================
echo.
echo   Email: admin@whatsself.local
echo   Senha: admin
echo.
echo   Agora voce pode fazer login com essas credenciais.
echo.
pause

