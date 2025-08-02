import fetch from "node-fetch";

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
    console.log('Token exchange request received:', req.body);
    
    // Exchange the code for an access_token
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.body.code,
      }),
    });

    console.log('Discord API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    // Retrieve the access_token from the response
    const tokenData = await response.json();
    console.log('Token exchange successful');

    // Return the access_token to our client as { access_token: "..."}
    res.status(200).json({ access_token: tokenData.access_token });
    
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 