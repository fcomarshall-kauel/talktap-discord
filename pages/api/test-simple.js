// Very simple test API endpoint
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Simple test endpoint works!',
      method: req.method,
      timestamp: Date.now()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}