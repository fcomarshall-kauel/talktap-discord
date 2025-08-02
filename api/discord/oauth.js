import { DiscordAuth } from '../../server/auth.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, client_id, redirect_uri } = req.body;
    
    if (!code || !client_id) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code and client_id' 
      });
    }

    console.log('Exchanging Discord OAuth code for access token...');
    console.log('Client ID:', client_id);
    
    const discordAuth = new DiscordAuth();
    const result = await discordAuth.exchangeCodeForToken(code, client_id, redirect_uri);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 