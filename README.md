# ⚡ 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 V2

Bot WhatsApp multi-fonctions basé sur Baileys (Node.js ESM).

## 🚀 Installation

```bash
# 1. Cloner ou extraire le ZIP
cd jarvis-v2

# 2. Configurer
cp .env.example .env
nano .env  # Remplissez OWNER_NUMBER au minimum

# 3. Démarrer
chmod +x start.sh
./start.sh
```

## 📋 Commandes (112)

| Catégorie | Commandes |
|-----------|-----------|
| 🛡️ Modération | ban, unban, kick, warn, warnlist, resetwarn, promote, demote, add |
| 🔒 Protection | antilink, antispam, antitag, antimention, antiflood, antiword, antipurge, antidemote, antipromote |
| 🏠 Groupe | mute, unmute, tagall, hidetag, link, revoke, groupname, groupdesc, groupphoto, groupinfo, open, close |
| ℹ️ Infos | ping, uptime, whoami, userinfo, groupinfo, listadmin, stats, info |
| 🛠️ Outils | calc, style, translate, dictionary, qrcode, shorturl, url, ocr, tts, sticker |
| 🎵 Médias | song, ytmp4, lyrics, download, image, vv, pp |
| 🌤️ Utilitaires | weather, horoscope, remind, schedule, notes, rules, poll |
| 🎮 Fun | joke, quote, fact, coinflip, dice, choose, 8ball, rps, roast, compliment, tictactoe, quiz |
| 📊 Profil | daily, afk, rank, leaderboard, profile, pseudo |
| 👑 Owner | broadcast, setsudo, delsudo, listsudo, setpremium, delpremium, dit, setprefix, setmode, botname, maintenance, backup, restore, stop, restart, eval, exec, logs, modlog, clearstats |

## ⚙️ Configuration

Éditez `.env` :
- `OWNER_NUMBER` — Votre numéro (obligatoire)
- `PREFIX` — Préfixe (défaut: `.`)
- `MODE` — public/private/group
- `MAX_WARNS` — Warns avant expulsion (défaut: 3)

## 🔑 Système de permissions

- 👑 **Owner** — Accès total
- 🔑 **Sudo** — Quasi-owner (`.setsudo`)
- 💎 **Premium** — Fonctions premium (`.setpremium`)
- ⭐ **Admin** — Commandes d'administration groupe
- 👤 **Membre** — Commandes publiques

## 📁 Structure

```
jarvis-v2/
├── index.js          # Point d'entrée principal
├── config.js         # Configuration
├── .env              # Variables d'environnement
├── commands/         # 112+ commandes
├── lib/              # Bibliothèques
│   ├── ownerSystem.js     # Gestion owner/sudo/premium
│   ├── groupConfig.js     # Config groupes + cache meta
│   ├── sendMessage.js     # Envoi de messages
│   ├── animLoader.js      # Loaders animés
│   ├── spamManager.js     # Anti-spam
│   ├── antiLinkManager.js # Anti-liens
│   └── ...
└── data/             # Données persistantes (JSON)
```

## 📝 Notes

- Compatible Node.js 18+
- Basé sur @whiskeysockets/baileys (ESM)
- Cache groupMetadata 5min (évite rate-limit 429)
- Système LID pour les comptes liés


---

## 🆕 Nouvelles fonctionnalités — Multi-Session v2

### Système Multi-Session (Bot-as-a-Service)

Chaque utilisateur peut connecter son propre compte WhatsApp via un code de pairing.

### Commandes ajoutées

| Commande | Description |
|---|---|
| `.pairing +226XXXXXXXX` | Générer un code de pairing pour connecter un compte |
| `.mypair` | Vérifier l'état de votre session active |
| `.stoppair` | Déconnecter et supprimer votre session |

### Fonctionnalités

- ✅ Multi-session avec `useMultiFileAuthState` par utilisateur
- ✅ Sessions stockées dans `sessions/{numero}/`
- ✅ Reconnexion automatique en cas de déconnexion
- ✅ Cooldown 60 secondes anti-spam
- ✅ Détection de session dupliquée
- ✅ Restauration des sessions au redémarrage du bot
- ✅ Bot principal non affecté


## Configuration après extraction

1. Copiez `.env.example` vers `.env`.
2. Renseignez au minimum `OWNER_NUMBER` avec votre numéro WhatsApp sans le signe `+`.
3. Ajoutez vos propres clés API si vous utilisez les fonctions IA correspondantes.
4. Renseignez `BOT_CONNECT_LINK` lorsque votre lien de connexion sera prêt.
5. Installez les dépendances avec `npm install`, puis lancez `npm start`.

Ne partagez jamais `.env`, le dossier de session WhatsApp ou les fichiers de données runtime. L'archive de distribution ne contient pas le `.env` personnel ni les données JSON runtime.

### Liens configurés

- Groupe Telegram : https://t.me/+kcLFkzePlwwyZjE8
- Chaîne Telegram : https://t.me/nexusforger
- Chaîne WhatsApp : https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o
