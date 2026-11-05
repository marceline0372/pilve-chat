require('dotenv').config();
const Redis = require('ioredis');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  // Fallback for local testing or ADC
  console.warn('[Reader] Warning: Firebase credentials not fully configured in .env');
}

const db = admin.database ? admin.database() : null;

// Redis client for blocking pop (BLPOP)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('connect', () => {
  console.log('[Reader] Connected to Redis worker instance');
});

redis.on('error', (err) => {
  console.error('[Reader] Redis Error:', err);
});

async function startReader() {
  console.log('[Reader] Worker started. Listening for messages on "chat_queue"...');

  while (true) {
    try {
      // BLPOP blocks until an item is available (0 = block indefinitely)
      const result = await redis.blpop('chat_queue', 0);
      if (result && result.length === 2) {
        const rawData = result[1];
        const messageObj = JSON.parse(rawData);

        console.log(`[Reader] Picked up message from ${messageObj.username}: "${messageObj.text}"`);

        // Save into Firebase Realtime Database
        if (db) {
          const messagesRef = db.ref('messages');
          await messagesRef.push(messageObj);
          console.log('[Reader] Successfully synced to Firebase');
        } else {
          console.log('[Reader] Firebase not initialized; simulated write to DB.');
        }
      }
    } catch (err) {
      console.error('[Reader] Processing error:', err);
      // Wait 1 second before retrying on failure to avoid busy looping
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

startReader();
