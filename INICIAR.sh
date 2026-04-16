#!/bin/bash
# TRIBUT.AR - Script de inicio (Mac / Linux)

echo ""
echo " ============================================"
echo "   TRIBUT.AR - Simulador Fiscal Argentino"
echo " ============================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo " [ERROR] Node.js no está instalado."
    echo " Descargalo en: https://nodejs.org"
    exit 1
fi

echo " Node.js: $(node --version)"
echo ""

# Instalar dependencias si no existe node_modules
if [ ! -d "node_modules" ]; then
    echo " Instalando dependencias... (primera vez, puede tardar unos minutos)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo " [ERROR] Falló la instalación. Iniciando demo-server..."
        node demo-server.js
        exit 0
    fi
fi

# Iniciar Next.js
echo " Iniciando TRIBUT.AR en http://localhost:3001"
echo " (presioná Ctrl+C para detener)"
echo ""
npm run dev
