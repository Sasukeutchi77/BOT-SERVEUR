#!/bin/bash
set -e

echo "
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚡ 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 CLOUD / BOT STARTUP     ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
"

# Vérification Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trouvé. Version 18+ requise."
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js $NODE_VER détecté. Version 18+ requise."
  exit 1
fi

# Rapport du commit Git en cours
if command -v git &> /dev/null && [ -d ".git" ]; then
  CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "inconnu")
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "détaché")
  echo "📌 Version Git : commit ${CURRENT_COMMIT} (branche ${CURRENT_BRANCH})"

  # Mise à jour optionnelle explicite : échoue immédiatement si le pull échoue
  if [ "$AUTO_UPDATE" = "true" ] || [ "$GIT_PULL_ON_START" = "true" ]; then
    echo "🔄 Vérification des mises à jour du dépôt distant..."
    if ! git pull origin "${CURRENT_BRANCH:-main}"; then
      echo "❌ Échec de la mise à jour Git. Arrêt du démarrage pour éviter toute incohérence."
      exit 1
    fi
    UPDATED_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "inconnu")
    echo "✅ Dépôt mis à jour avec succès : commit ${UPDATED_COMMIT}"
  fi
fi

# Dépendances npm
if [ ! -d "node_modules" ]; then
  echo "📦 Installation initiale des dépendances npm..."
  npm install --omit=dev || npm install
fi

# Dossiers runtime
mkdir -p data auth_info_baileys

# Choix de la cible :
# - "server" (défaut) : Plateforme SaaS multi-utilisateurs (npm start -> tsx server.ts)
# - "bot" : Bot autonome ligne de commande (node index.js)
TARGET=${START_TARGET:-server}

if [ "$TARGET" = "bot" ] || [ "$1" = "bot" ]; then
  echo "🤖 Démarrage du bot autonome CLI (index.js)..."
  exec node index.js
else
  echo "🚀 Démarrage de la plateforme Web JARVIS CLOUD (server.ts)..."
  exec npm start
fi

