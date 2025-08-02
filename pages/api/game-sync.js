// Discord Interactions webhook for game synchronization
// This acts as a message broker for multiplayer game events

const games = new Map(); // In-memory storage for game events by instanceId

export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, query, body } = req;
  const { instanceId, since } = query;

  if (method === 'POST') {
    // Broadcast game event
    if (!instanceId || !body.event) {
      return res.status(400).json({ error: 'Missing instanceId or event data' });
    }

    // Store event for this instance
    if (!games.has(instanceId)) {
      games.set(instanceId, []);
    }

    const gameEvent = {
      timestamp: Date.now(),
      event: body.event,
      gameState: body.gameState,
      playerId: body.playerId
    };

    games.get(instanceId).push(gameEvent);

    // Keep only last 50 events per instance
    const events = games.get(instanceId);
    if (events.length > 50) {
      games.set(instanceId, events.slice(-50));
    }

    console.log(`Game event broadcasted for instance ${instanceId}:`, body.event.type);
    return res.status(200).json({ success: true, timestamp: gameEvent.timestamp });

  } else if (method === 'GET') {
    // Get events for instance
    if (!instanceId) {
      return res.status(400).json({ error: 'Missing instanceId' });
    }

    const events = games.get(instanceId) || [];
    const sinceTimestamp = since ? parseInt(since) : 0;
    
    // Filter events newer than 'since' timestamp
    const newEvents = events.filter(event => event.timestamp > sinceTimestamp);

    return res.status(200).json({ 
      events: newEvents,
      totalEvents: events.length,
      instanceId
    });

  } else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}