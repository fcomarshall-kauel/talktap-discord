// Simple game state sync for Discord Activities via proxy
let gameInstances = new Map(); // In-memory storage for game instances

export default async function handler(req, res) {
  // Handle CORS for Discord proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { instanceId } = req.query;
  
  if (!instanceId) {
    return res.status(400).json({ error: 'Instance ID is required' });
  }

  if (req.method === 'POST') {
    // Update game state for instance
    try {
      const gameData = req.body;
      
      if (!gameData.event || !gameData.timestamp) {
        return res.status(400).json({ error: 'Invalid game data' });
      }
      
      // Store the latest game state for this instance
      gameInstances.set(instanceId, {
        ...gameData,
        lastUpdated: Date.now()
      });
      
      console.log(`Game state updated for instance ${instanceId}:`, gameData.event.type);
      
      res.status(200).json({ 
        success: true,
        instanceId: instanceId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error updating game state:', error);
      res.status(500).json({ error: 'Failed to update game state' });
    }
  } 
  else if (req.method === 'GET') {
    // Get latest game state for instance
    try {
      const { since } = req.query;
      const sinceTimestamp = since ? parseInt(since) : 0;
      
      const gameData = gameInstances.get(instanceId);
      
      if (!gameData) {
        return res.status(200).json({ 
          events: [],
          timestamp: Date.now()
        });
      }
      
      // Only return data if it's newer than requested timestamp
      if (gameData.timestamp > sinceTimestamp) {
        res.status(200).json({
          events: [gameData],
          timestamp: Date.now()
        });
      } else {
        res.status(200).json({
          events: [],
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Clean up old instances (older than 1 hour)
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();
  for (const [id, data] of gameInstances.entries()) {
    if (now - data.lastUpdated > oneHour) {
      gameInstances.delete(id);
    }
  }
}