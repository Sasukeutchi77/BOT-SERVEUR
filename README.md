# 🚀 JARVIS CLOUD — Plateforme Web d'Hébergement Multi-Utilisateurs de Bots WhatsApp

JARVIS CLOUD est une plateforme web SaaS clé en main permettant à n'importe quel utilisateur d'associer et d'héberger son propre bot WhatsApp JARVIS en toute autonomie, directement depuis son navigateur web, sans devoir installer Node.js, ouvrir un terminal ou posséder un serveur personnel.

---

## 🌟 Points Forts & Architecture

- **Isolation Stricte Multi-Utilisateurs** : Un moteur commun JARVIS avec répertoires de sessions, clés d'authentification Baileys (`data/sessions/<instanceId>/`) et contextes d'exécution 100% indépendants. Aucun utilisateur ne peut accéder ou contrôler la session d'un autre.
- **Jumelage Instantané WhatsApp** : Support du **Code de Jumelage officiel à 8 caractères** (Pairing Code) et du **QR Code**, sans jamais demander le mot de passe WhatsApp.
- **Protection & Anti-Ban** : Limitation des tentatives de jumelage (Rate-Limiter), reconnexion automatique avec temporisation exponentielle progressive (5s, 10s, 20s, max 60s) et arrêt propre des sockets.
- **Suite Complète de Commandes JARVIS** :
  - **Général** : `.help`, `.ping`, `.runtime`, `.speed`, `.info`
  - **Intelligence Artificielle** : `.ai <question>`, `.gemini` alimenté par le SDK officiel `@google/genai` (modèle Gemini 2.5 Flash)
  - **Utilitaires** : `.calc <expression>`, `.qr <texte/lien>`, `.quote`
  - **Groupe** : `.tagall`
  - **Personnalisation** : activation ou désactivation unitaire de chaque commande par utilisateur depuis l'interface web.
- **Simulateur Interactif WhatsApp** : Permet de tester le bot en temps réel directement dans la console web avant ou pendant la liaison avec un téléphone.
- **Console d'Administration Globale** : Vue en direct des ressources matérielles (RAM, CPU, Heap, Uptime), modération des comptes (suspension/réactivation), et arrêt d'urgence des instances abusives.
- **Sécurité Maximale** : Mots de passe hachés avec `bcryptjs`, authentification JWT, masquage partiel des numéros de téléphone (`+33 6 ••• •• 78`), et sanitisation automatique des tokens dans les journaux.

---

## 📋 Variables d'Environnement (.env)

Créez un fichier `.env` à la racine du projet :

```ini
# Port d'écoute du serveur HTTP / WebSocket
PORT=3000

# Environnement (development ou production)
NODE_ENV=production

# Clé secrète pour signer les jetons d'authentification JWT
JWT_SECRET=super_secret_jwt_key_pour_jarvis_cloud_vps_2026_a_changer

# Identifiants de l'administrateur initial
ADMIN_EMAIL=admin@jarviscloud.local
ADMIN_PASSWORD=JarvisCloud2026!

# Clé API Google Gemini (optionnel, active l'IA temps réel dans .ai)
GEMINI_API_KEY=votre_cle_gemini_api
```

---

## 🛠️ Déploiement en Production sur un VPS Linux (Ubuntu 22.04 / 24.04 ou Debian 12)

### 1. Préparation du système et installation de Node.js 22 LTS

Connectez-vous à votre VPS via SSH :

```bash
ssh root@votre_ip_vps
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Installer Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Doit afficher v22.x.x
```

### 2. Déploiement du code sur le VPS

```bash
sudo mkdir -p /var/www/jarvis-cloud
cd /var/www/jarvis-cloud

# Cloner ou transférer le code
# Ex: git clone <votre_depot> .

# Installer les dépendances et compiler le frontend
npm install
npm run build
```

### 3. Création du service persistant Systemd

Créez le fichier de service `/etc/systemd/system/jarvis-cloud.service` :

```bash
sudo nano /etc/systemd/system/jarvis-cloud.service
```

Collez la configuration suivante :

```ini
[Unit]
Description=JARVIS CLOUD - Hébergement Bots WhatsApp Multi-Tenant
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/jarvis-cloud
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=generer_une_cle_secrete_aleatoire_64_chars
Environment=ADMIN_EMAIL=admin@votre-domaine.com
Environment=ADMIN_PASSWORD=MotDePasseAdminUltraSecurise2026!
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=jarvis-cloud

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service :

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis-cloud
sudo systemctl status jarvis-cloud
```

### 4. Configuration de Nginx en Reverse Proxy et WebSocket

Créez la configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/jarvis-cloud
```

Contenu :

```nginx
server {
    listen 80;
    server_name jarvis.votre-domaine.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jarvis.votre-domaine.com;

    # Certificats SSL générés par Certbot
    ssl_certificate /etc/letsencrypt/live/jarvis.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jarvis.votre-domaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Activez le site et obtenez un certificat SSL HTTPS gratuit :

```bash
sudo ln -s /etc/nginx/sites-available/jarvis-cloud /etc/nginx/sites-enabled/
sudo ufw allow 'Nginx Full'
sudo certbot --nginx -d jarvis.votre-domaine.com
sudo systemctl restart nginx
```

---

## 💾 Sauvegarde et Restauration

### Sauvegarde automatique :
Toutes les données (utilisateurs, configurations, statistiques et clés de session WhatsApp isolées) sont stockées dans le dossier `/var/www/jarvis-cloud/data/`.

Pour effectuer une sauvegarde :
```bash
# Sauvegarde compressée horodatée
tar -czvf /backup/jarvis-backup-$(date +%F).tar.gz -C /var/www/jarvis-cloud data
```

### Restauration :
```bash
sudo systemctl stop jarvis-cloud
tar -xzvf /backup/jarvis-backup-2026-10-15.tar.gz -C /var/www/jarvis-cloud/
sudo systemctl start jarvis-cloud
```

---

## 🧪 Tests Automatisés

Pour exécuter la suite de tests unitaires et de vérification d'isolation multi-tenant :

```bash
npm run test # ou: npx tsx tests/suite.ts
```

La suite vérifie :
1. Le hachage et la validation des mots de passe avec `bcryptjs`.
2. La création et séparation de plusieurs utilisateurs indépendants.
3. L'isolation stricte des instances de bots et de leurs dossiers de session.
4. L'étanchéité des configurations (modifier le bot A ne modifie jamais le bot B).
5. Le masquage sécurisé des numéros WhatsApp.
6. La sanitisation des clés d'autorisation et des tokens secrets dans les logs.
7. L'exécution sandboxée du simulateur de commandes.
8. Le blocage des commandes désactivées individuellement.
