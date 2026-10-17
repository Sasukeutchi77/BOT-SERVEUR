// launcher.cjs — Installe les dépendances si besoin, puis démarre le bot
const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname

function check(pkg) {
  try { require.resolve(path.join(ROOT, 'node_modules', pkg)); return true } catch { return false }
}

console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮')
console.log('┃  ⚡ 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 V2 LAUNCHER  ┃')
console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n')

if (!check('dotenv') || !fs.existsSync(path.join(ROOT, 'node_modules'))) {
  console.log('📦 Installation des dépendances (première fois)...')
  try {
    execSync('npm install --prefix ' + JSON.stringify(ROOT), {
      stdio: 'inherit',
      cwd: ROOT
    })
    console.log('✅ Dépendances installées avec succès!\n')
  } catch (e) {
    console.error('❌ Erreur npm install:', e.message)
    process.exit(1)
  }
} else {
  console.log('✅ Dépendances déjà installées.\n')
}

console.log('🚀 Démarrage du bot...\n')

const bot = spawn(process.execPath, ['index.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env
})

bot.on('exit', (code) => {
  console.log('🔴 Bot arrêté avec code:', code)
  process.exit(code || 0)
})
