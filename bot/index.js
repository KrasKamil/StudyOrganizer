require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ── 1. FIREBASE ADMIN INITIALIZATION ──────────────────────────────────────────
function initFirebase() {
  if (admin.apps.length > 0) return admin.app();

  // Option A: Local serviceAccountKey.json file
  const localKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    console.log('[Firebase] Loading credentials from local serviceAccountKey.json');
    const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Option B: Environment variable (JSON string or base64) for Cloud Hosting (Render/Railway)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (!raw.startsWith('{')) {
        // Base64 decode if encoded
        raw = Buffer.from(raw, 'base64').toString('utf8');
      }
      const serviceAccount = JSON.parse(raw);
      console.log(`[Firebase] Initialized with Service Account for project: ${serviceAccount.project_id}`);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', err.message);
    }
  }

  // Option C: Default Project ID fallback
  const projectId = process.env.FIREBASE_PROJECT_ID || 'organizer-637f1';
  console.log(`[Firebase] Initializing with default credentials for project ${projectId}`);
  return admin.initializeApp({ projectId });
}

initFirebase();
const db = admin.firestore();

// ── 2. DISCORD CLIENT INITIALIZATION ─────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Target UID (if set, saves for this specific user; if empty, broadcasts to all active users)
const TARGET_UID = process.env.TARGET_UID || '';
const ALLOWED_CHANNELS = (process.env.ALLOWED_CHANNELS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/^#/, ''))
  .filter(Boolean);

client.once('ready', () => {
  console.log('────────────────────────────────────────────────────────────');
  console.log(`🤖 StudyOrganizer Discord Bot zalogowany jako: ${client.user.tag}`);
  console.log(`📡 Połączono z serwerami: ${client.guilds.cache.map((g) => g.name).join(', ')}`);
  if (ALLOWED_CHANNELS.length > 0) {
    console.log(`🔍 Monitorowane kanały: #${ALLOWED_CHANNELS.join(', #')}`);
  } else {
    console.log('🔍 Monitorowane kanały: WSZYSTKIE kanały tekstowe na serwerze');
  }
  if (TARGET_UID) {
    console.log(`🎯 Zapisywanie dla użytkownika UID: ${TARGET_UID}`);
  } else {
    console.log('🎯 Tryb broadcast: wpisy zapisywane dla wszystkich zarejestrowanych studentów');
  }
  console.log('────────────────────────────────────────────────────────────');
});

// Helper: Normalize Polish characters for channel matching
function slugify(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── 3. MESSAGE LISTENER & FIRESTORE SYNC ──────────────────────────────────────
client.on('messageCreate', async (message) => {
  // Ignore messages from the bot itself or other bots
  if (message.author.bot) return;

  const channelName = message.channel.name || '';
  const channelSlug = slugify(channelName);

  // If ALLOWED_CHANNELS is defined, filter out unlisted channels
  if (ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(channelSlug)) {
    return;
  }

  // Extract clean content & any attached files or images
  let content = message.cleanContent || message.content || '';
  if (message.attachments.size > 0) {
    const attachmentLinks = message.attachments.map((a) => a.url).join('\n');
    content = content ? `${content}\n\n📎 Załączniki:\n${attachmentLinks}` : `📎 Załączniki:\n${attachmentLinks}`;
  }

  if (!content.trim()) return;

  // Determine user display name & role
  const authorName = message.member?.displayName || message.author.username;
  const isStarostaOrAdmin = message.member?.roles.cache.some((r) => {
    const rName = r.name.toLowerCase();
    return rName.includes('starosta') || rName.includes('admin') || rName.includes('moderator') || rName.includes('prowadzący');
  });
  const role = isStarostaOrAdmin ? 'Admin' : 'Student';

  console.log(`\n📨 Nowa wiadomość na #${channelName} od [${authorName}]:`);
  console.log(`   "${content.slice(0, 80).replace(/\n/g, ' ')}${content.length > 80 ? '...' : ''}"`);

  try {
    // 1. Determine target UIDs
    let targetUids = [];
    if (TARGET_UID) {
      targetUids = [TARGET_UID];
    } else {
      const usersSnap = await db.collection('users').get();
      if (!usersSnap.empty) {
        targetUids = usersSnap.docs.map((d) => d.id);
      }
    }

    if (targetUids.length === 0) {
      console.warn('⚠️ Brak zarejestrowanych użytkowników w Firestore users. Wiadomość pominięta.');
      return;
    }

    // 2. Save message for each target user (using composite ID to prevent duplication)
    for (const uid of targetUids) {
      // Try to find matching courseId for this user
      let matchedCourseId = null;
      try {
        const coursesSnap = await db.collection('courses').where('uid', '==', uid).get();
        if (!coursesSnap.empty) {
          for (const cDoc of coursesSnap.docs) {
            const cData = cDoc.data();
            const cSlug = slugify(cData.name || '');
            if (channelSlug.includes(cSlug) || cSlug.includes(channelSlug)) {
              matchedCourseId = cDoc.id;
              break;
            }
          }
        }
      } catch (err) {
        // Fallback silently if course search fails
      }

      const docId = `discord_${uid}_${message.id}`;
      await db.collection('messages').doc(docId).set(
        {
          uid,
          content,
          author: authorName,
          role,
          courseId: matchedCourseId,
          channelName: `#${channelName}`,
          source: 'discord_bot',
          url: message.url || null,
          timestamp: message.createdAt.toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log(`   ✅ Zapisano pomyślnie w Firestore dla ${targetUids.length} użytkowników!`);

    // Optional: Add a subtle checkmark reaction on Discord
    try {
      await message.react('✅');
    } catch {
      // Missing reaction permission is harmless
    }
  } catch (err) {
    console.error('   ❌ Błąd zapisu do Firestore:', err.message);
  }
});

// ── 4. WEB SERVER FOR 24/7 CLOUD HOSTING HEALTH CHECKS (RENDER / KOYEB) ──────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'StudyOrganizer Discord Bridge',
    botUser: client.user ? client.user.tag : 'connecting...',
    uptimeSeconds: Math.floor(process.uptime()),
    servers: client.guilds.cache.map((g) => g.name),
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`🌐 Health-check server nasłuchuje na porcie ${PORT}`);
});

// ── 5. START BOT ─────────────────────────────────────────────────────────────
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error('\n❌ BŁĄD: Brak zmiennej DISCORD_BOT_TOKEN w pliku .env!');
  console.error('Wklej token bota do pliku bot/.env (DISCORD_BOT_TOKEN=twoj_token)\n');
} else {
  client.login(DISCORD_BOT_TOKEN).catch((err) => {
    console.error('❌ Nie udało się zalogować bota do Discorda:', err.message);
  });
}
