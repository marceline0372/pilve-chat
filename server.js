require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('connect', () => {
  console.log('[Server] Connected to Redis successfully');
});

redis.on('error', (err) => {
  console.error('[Server] Redis Connection Error:', err);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/send - Push message to Redis queue
app.post('/api/send', async (req, res) => {
  try {
    const { username, text } = req.body;

    if (!username || !text || !username.trim() || !text.trim()) {
      return res.status(400).json({ error: 'Username and message text are required.' });
    }

    const payload = {
      username: username.trim(),
      text: text.trim(),
      timestamp: Date.now()
    };

    // RPUSH into chat_queue for reader to process
    await redis.rpush('chat_queue', JSON.stringify(payload));

    return res.status(200).json({ success: true, message: 'Enqueued to Redis' });
  } catch (error) {
    console.error('[Server] Failed to enqueue message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Web application listening on http://localhost:${PORT}`);
});
