import bcrypt from 'bcryptjs';
import { db } from '../server/db/database';
import { sanitizeLogMessage, maskPhoneNumber } from '../server/middleware/sanitizer';
import { jarvisEngine } from '../server/jarvis/engine';

async function runTests() {
  console.log('--- DÉMARRAGE DE LA SUITE DE TESTS JARVIS CLOUD ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Hachage sécurisé des mots de passe
    const rawPass = 'SecretPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPass, salt);
    const valid = await bcrypt.compare(rawPass, hash);
    const invalid = await bcrypt.compare('WrongPassword', hash);
    assert(valid && !invalid, 'Test 1: Hachage bcryptjs et vérification des mots de passe');

    // Test 2: Création de deux utilisateurs distincts
    const user1 = db.createUser({
      id: 'usr_test_1',
      email: 'testuser1@example.com',
      passwordHash: hash,
      role: 'user',
      isSuspended: false,
    });
    const user2 = db.createUser({
      id: 'usr_test_2',
      email: 'testuser2@example.com',
      passwordHash: hash,
      role: 'user',
      isSuspended: false,
    });
    assert(user1.id !== user2.id, 'Test 2: Création de 2 utilisateurs distincts');

    // Test 3: Création de deux instances de bots isolées
    const bot1 = db.createBot({
      id: 'bot_test_1',
      userId: user1.id,
      name: 'Bot Utilisateur 1',
      phoneNumber: '+33612345678',
      status: 'OFFLINE',
      config: {
        botName: 'JARVIS 1',
        prefix: '!',
        autoRead: false,
        reactToStatus: false,
        antiDelete: false,
        antiSpam: true,
        welcomeMessage: 'Bot 1 welcome',
        enabledCommands: ['help', 'ping', 'calc'],
      },
      stats: { messagesHandled: 0, commandsExecuted: 0, reconnectAttempts: 0 },
    });

    const bot2 = db.createBot({
      id: 'bot_test_2',
      userId: user2.id,
      name: 'Bot Utilisateur 2',
      phoneNumber: '+221778901234',
      status: 'OFFLINE',
      config: {
        botName: 'JARVIS 2',
        prefix: '#',
        autoRead: true,
        reactToStatus: true,
        antiDelete: true,
        antiSpam: false,
        welcomeMessage: 'Bot 2 welcome',
        enabledCommands: ['ping'],
      },
      stats: { messagesHandled: 0, commandsExecuted: 0, reconnectAttempts: 0 },
    });

    assert(bot1.userId === user1.id && bot2.userId === user2.id, 'Test 3: Attribution stricte des bots aux propriétaires');

    // Test 4: Isolation des paramètres (modifier bot1 ne modifie pas bot2)
    db.updateBot(bot1.id, {
      config: { ...bot1.config, prefix: '$' },
    });
    const refreshedBot2 = db.getBotById(bot2.id);
    assert(refreshedBot2?.config.prefix === '#', 'Test 4: Isolation stricte des configurations entre instances');

    // Test 5: Masquage sécurisé du numéro de téléphone
    const masked1 = maskPhoneNumber('+33612345678');
    const masked2 = maskPhoneNumber('+221778901234');
    assert(masked1.includes('•••') && masked2.includes('•••'), 'Test 5: Masquage du numéro de téléphone');

    // Test 6: Nettoyage et sanitisation des logs
    const dirtyLog = 'Bearer eyJhbGciOiJIUzI1NiJ9.test and secret="123456" password: "supersecret"';
    const cleanLog = sanitizeLogMessage(dirtyLog);
    assert(
      !cleanLog.includes('eyJhbGciOiJIUzI1NiJ9') &&
      !cleanLog.includes('supersecret') &&
      cleanLog.includes('[REDACTED]'),
      'Test 6: Sanitisation des secrets et tokens dans les journaux'
    );

    // Test 7: Exécution isolée du simulateur de commande JARVIS
    const simPing = await jarvisEngine.simulateCommand(bot1.id, '$ping');
    assert(simPing.success && simPing.reply.includes('PONG'), 'Test 7: Exécution isolée du simulateur de commande ($ping)');

    // Test 8: Respect des commandes désactivées
    const simCalcBot2 = await jarvisEngine.simulateCommand(bot2.id, '#calc 5 + 5');
    assert(!simCalcBot2.success && simCalcBot2.reply.includes('désactivée'), 'Test 8: Blocage d\'une commande désactivée par un utilisateur spécifique');

    // Test 9: Prise en compte du préfixe personnalisé dynamique de l'utilisateur
    db.updateBot(bot1.id, {
      config: { ...bot1.config, prefix: '!' },
    });
    const simPingExclamation = await jarvisEngine.simulateCommand(bot1.id, '!ping');
    assert(simPingExclamation.success && simPingExclamation.reply.includes('PONG'), 'Test 9: Prise en compte du préfixe personnalisé sélectionné (!)');

    console.log(`\n===========================================`);
    console.log(`RÉSULTAT : ${passed} passés, ${failed} échoués`);
    console.log(`===========================================`);
  } catch (err: any) {
    console.error('Erreur critique pendant les tests:', err);
    failed++;
  }
}

runTests();
