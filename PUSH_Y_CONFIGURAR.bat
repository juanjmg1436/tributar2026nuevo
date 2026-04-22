@echo off
echo ===============================================
echo  TRIBUT.AR - Push y configuracion de Vercel
echo ===============================================
echo.

echo [1/2] Pusheando commits al repositorio...
git push origin main
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo pushear. Verifica tu conexion y credenciales de GitHub.
    pause
    exit /b 1
)
echo OK - Codigo pusheado exitosamente.
echo.

echo [2/2] Listo!
echo.
echo ===============================================
echo  PASO SIGUIENTE - Configurar Vercel
echo ===============================================
echo.
echo Abre este link en tu navegador:
echo https://vercel.com/dashboard
echo.
echo Luego:
echo  1. Click en tu proyecto tributar2026nuevo
echo  2. Settings ^> Environment Variables
echo  3. Agregar estas 2 variables (para Production, Preview y Development):
echo.
echo  Nombre: NEXT_PUBLIC_SUPABASE_URL
echo  Valor:  https://tapxqpuhfzymocgdheab.supabase.co
echo.
echo  Nombre: NEXT_PUBLIC_SUPABASE_ANON_KEY
echo  Valor:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ
echo.
echo  4. Despues de guardar: Deployments ^> (ultimo deploy) ^> Redeploy
echo.
echo ===============================================
echo.
echo Para diagnostico, visita: /diagnostico en tu app
echo.
pause
