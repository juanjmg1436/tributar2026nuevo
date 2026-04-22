@echo off
chcp 65001 >/dev/null
title TRIBUT.AR - Arreglar Login

cd /d "C:\Users\juanj\OneDrive\Desktop\Simulador Fiscal"

echo.
echo ================================================
echo   TRIBUT.AR - Confirmando cuentas de usuario...
echo ================================================
echo.

node fix-login.js

echo.
pause
