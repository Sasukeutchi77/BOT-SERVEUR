#!/bin/bash
echo "
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚡ 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 V2 STARTUP  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
"

if [ ! -f ".env" ]; then
  echo "⚠️  Fichier .env manquant. Copiez .env.example et configurez-le."
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trouvé. Installez Node.js 18+ d'abord."
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js $NODE_VER détecté. Version 18+ requise."
  exit 1
fi

echo "✅ Node.js $(node -v) détecté"

if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

mkdir -p data auth_info_baileys

echo "🚀 Démarrage..."
node index.js
