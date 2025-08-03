// Test endpoint to verify URL mapping
export default async function handler(req, res) {
  console.log('Test API called with method:', req.method);
  console.log('Request headers:', req.headers);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({ 
    message: 'Test endpoint working!',
    method: req.method,
    timestamp: Date.now()
  });
} 