import { DiscordAuth } from '../../../server/auth.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const { authorization } = req.headers;
    
    if (!authorization) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const discordAuth = new DiscordAuth();
    const user = await discordAuth.getUser(userId, authorization);
    
    res.status(200).json(user);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 