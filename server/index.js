import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DiscordAuth } from './auth.js'; //pico

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Initialize Discord auth
const discordAuth = new DiscordAuth();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Discord OAuth endpoint
app.post('/api/discord/oauth', async (req, res) => {
  try {
    const { code, client_id, redirect_uri } = req.body;
    
    if (!code || !client_id) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code and client_id' 
      });
    }

    console.log('Exchanging Discord OAuth code for access token...');
    console.log('Client ID:', client_id);
    
    const result = await discordAuth.exchangeCodeForToken(code, client_id, redirect_uri);
    res.json(result);
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get user info endpoint
app.get('/api/discord/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { authorization } = req.headers;
    
    if (!authorization) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const user = await discordAuth.getUser(userId, authorization);
    res.json(user);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

// Activity metadata endpoint (for Discord Activity discovery)
app.get('/api/activity/metadata', (req, res) => {
  res.json({
    name: 'Basta!',
    description: 'A fun word game for Discord voice channels',
    type: 'game',
    max_participants: 10,
    supported_platforms: ['desktop', 'mobile']
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Discord Activity Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 Activity metadata: http://localhost:${PORT}/api/activity/metadata`);
}); 