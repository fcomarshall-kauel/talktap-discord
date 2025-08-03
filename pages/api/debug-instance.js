export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // This endpoint will be called from the Discord app to show the current instanceId
  res.status(200).json({ 
    message: 'Debug endpoint - check browser console for instanceId logs',
    timestamp: Date.now()
  });
} 