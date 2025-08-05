export default async function handler(req, res) {
  const { method, url, headers, body } = req;
  
  // Extract the path after /api/discord-supabase-proxy
  const supabasePath = url.replace('/api/discord-supabase-proxy', '');
  
  // Construct the full Supabase URL
  const supabaseUrl = `https://ugqbqozygfigsbikuhok.supabase.co${supabasePath}`;
  
  console.log('🔄 Discord Supabase Proxy:', {
    method,
    originalUrl: url,
    supabasePath,
    supabaseUrl
  });

  try {
    // Forward the request to Supabase
    const response = await fetch(supabaseUrl, {
      method,
      headers: {
        ...headers,
        'host': 'ugqbqozygfigsbikuhok.supabase.co',
        'origin': 'https://ugqbqozygfigsbikuhok.supabase.co'
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    const data = await response.text();
    
    console.log('✅ Discord Supabase Proxy Response:', {
      status: response.status,
      statusText: response.statusText,
      dataLength: data.length
    });

    // Forward the response headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(data);
    
  } catch (error) {
    console.error('❌ Discord Supabase Proxy Error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed', 
      details: error.message 
    });
  }
} 