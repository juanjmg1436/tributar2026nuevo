@echo off
chcp 65001 >/dev/null
title TRIBUT.AR - Push a GitHub

cd /d "C:\Users\juanj\OneDrive\Desktop\Simulador Fiscal"

echo.
echo ================================================
echo   TRIBUT.AR - Subiendo cambios a GitHub...
echo ================================================
echo.

git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR al hacer push. Intenta ejecutar manualmente:
    echo   git push origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   PUSH EXITOSO! Vercel deployara en ~1 minuto
echo ================================================
echo.
echo PASO FINAL - Agregar en Vercel:
echo   https://vercel.com → tu proyecto → Settings → Environment Variables
echo.
echo   Nombre:  SUPABASE_SERVICE_ROLE_KEY
echo   Valor:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0NTM3NSwiZXhwIjoyMDkxOTIxMzc1fQ.93amDGa5l7pmhI-yQUb9zpxz2fvWGbISZ0R_rTQLHdk
echo.
echo   Entornos: Production + Preview + Development
echo   Luego: Redeploy desde Vercel
echo.
pause
