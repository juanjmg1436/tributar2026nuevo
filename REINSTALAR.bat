@echo off
title TRIBUT.AR - Reinstalacion limpia
color 0E
echo.
echo  Borrando node_modules y reinstalando para Windows...
echo.
rmdir /s /q node_modules 2>nul
del /f /q package-lock.json 2>nul
echo  Instalando...
call npm install
echo.
if %errorlevel% == 0 (
    color 0A
    echo  OK - Instalacion completa. Ahora ejecuta INICIAR.bat
) else (
    color 0C
    echo  ERROR - Revisa tu conexion a internet e intenta de nuevo.
)
echo.
pause
