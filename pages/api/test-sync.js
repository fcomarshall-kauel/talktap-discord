export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Test sync endpoint called with method:', req.method);

  if (req.method === 'GET') {
    console.log('GET request received');
    res.status(200).json({ 
      message: 'GET request successful',
      method: req.method,
      query: req.query
    });
  } else if (req.method === 'POST') {
    console.log('POST request received');
    res.status(200).json({ 
      message: 'POST request successful',
      method: req.method,
      body: req.body
    });
  } else {
    console.log('Unsupported method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
} 