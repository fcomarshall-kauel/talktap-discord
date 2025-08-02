// Simple game synchronization API for Discord Activity
// Acts as a message broker for multiplayer game events

const games = new Map(); // In-memory storage for game events by instanceId

export default function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { instanceId, since } = req.query;

  try {
    if (req.method === 'GET') {
      // Get game events for instance
      if (!instanceId) {
        return res.status(400).json({ 
          error: 'Missing instanceId parameter',
          usage: 'GET /api/game-sync?instanceId=YOUR_INSTANCE_ID'
        });
      }

      const events = games.get(instanceId) || [];
      const sinceTimestamp = since ? parseInt(since) : 0;
      
      // Filter events newer than 'since' timestamp
      const newEvents = events.filter(event => event.timestamp > sinceTimestamp);

      return res.status(200).json({ 
        events: newEvents,
        totalEvents: events.length,
        instanceId: instanceId
      });

    } else if (req.method === 'POST') {
      // Broadcast game event
      const { event, gameState, playerId } = req.body;

      if (!instanceId) {
        return res.status(400).json({ 
          error: 'Missing instanceId parameter',
          usage: 'POST /api/game-sync?instanceId=YOUR_INSTANCE_ID'
        });
      }

      if (!event) {
        return res.status(400).json({ 
          error: 'Missing event data in request body' 
        });
      }

      // Initialize storage for this instance if needed
      if (!games.has(instanceId)) {
        games.set(instanceId, []);
      }

      // Create and store the game event
      const gameEvent = {
        timestamp: Date.now(),
        event: event,
        gameState: gameState,
        playerId: playerId
      };

      games.get(instanceId).push(gameEvent);

      // Keep only last 50 events per instance to prevent memory issues
      const events = games.get(instanceId);
      if (events.length > 50) {
        games.set(instanceId, events.slice(-50));
      }

      console.log(`Game event stored for instance ${instanceId}:`, event.type);
      return res.status(200).json({ 
        success: true, 
        timestamp: gameEvent.timestamp,
        instanceId: instanceId
      });

    } else {
      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ 
        error: `Method ${req.method} not allowed`,
        allowedMethods: ['GET', 'POST', 'OPTIONS']
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}