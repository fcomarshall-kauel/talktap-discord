// Discord URL Mapping API endpoint for multiplayer sync
// This endpoint is mapped through Discord's proxy to bypass CSP restrictions

// In-memory storage for game events (in production, use a database)
const gameEvents = new Map(); // instanceId -> events array

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

  try {
    if (req.method === 'POST') {
      // Broadcast a game event
      const { instanceId, event, gameState, timestamp } = req.body;
      
      if (!instanceId || !event) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Store the event for this instance
      if (!gameEvents.has(instanceId)) {
        gameEvents.set(instanceId, []);
      }
      
      const events = gameEvents.get(instanceId);
      events.push({
        ...event,
        gameState,
        timestamp,
        instanceId
      });
      
      // Keep only the last 50 events to prevent memory issues
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      console.log(`Broadcasted event to instance ${instanceId}:`, event.type);
      
      res.status(200).json({ success: true, eventCount: events.length });
      
    } else if (req.method === 'GET') {
      // Poll for game events
      const { instanceId, since } = req.query;
      
      if (!instanceId) {
        return res.status(400).json({ error: 'Missing instanceId parameter' });
      }
      
      const events = gameEvents.get(instanceId) || [];
      const sinceTimestamp = since ? parseInt(since) : 0;
      
      // Filter events that are newer than the since timestamp
      const newEvents = events.filter(event => event.timestamp > sinceTimestamp);
      
      console.log(`Returning ${newEvents.length} events for instance ${instanceId}`);
      
      res.status(200).json({
        events: newEvents,
        timestamp: Date.now()
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Sync API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 