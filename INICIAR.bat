@echo off
setlocal enabledelayedexpansion
title TRIBUT.AR - Iniciando servidor...
color 0B
echo.
echo  ============================================
echo    TRIBUT.AR - Simulador Fiscal Argentino
echo  ============================================
echo.

REM Verificar que Node.js este instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js no esta instalado.
    echo  Descargalo en: https://nodejs.org ^(version LTS recomendada^)
    echo.
    pause
    exit /b 1
)

echo  Node.js encontrado:
node --version
echo.

REM Detectar si node_modules fue instalado en Linux (no tiene el binario para Windows)
REM Si falta el binario win32, hay que reinstalar todo desde cero
if exist "node_modules\" (
    if not exist "node_modules\@next\swc-win32-x64-msvc\" (
        echo  node_modules incompleto para Windows - reinstalando...
        echo  ^(esto puede tardar 2-3 minutos, solo ocurre la primera vez^)
        echo.
        rmdir /s /q node_modules 2>nul
        del /f /q package-lock.json 2>nul
    )
)

REM Instalar dependencias si no existe node_modules
if not exist "node_modules\" (
    echo  Instalando dependencias para Windows...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [AVISO] npm install tuvo problemas. Intentando demo-server...
        goto :demo
    )
    echo.
    echo  OK - Dependencias instaladas.
    echo.
)

REM Iniciar Next.js en puerto 3001
echo  TRIBUT.AR disponible en: http://localhost:3001
echo  Abriendo navegador automaticamente en 6 segundos...
echo  ^(presiona Ctrl+C para detener el servidor^)
echo.
start "" /b cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3001"
call npm run dev
goto :fin

:demo
echo.
echo  Iniciando servidor de demo en http://localhost:3001 ...
echo  ^(presiona Ctrl+C para detener^)
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3001"
node demo-server.js

:fin
echo.
pause
endlocal
