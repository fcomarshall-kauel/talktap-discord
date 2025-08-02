// Simple game event broker for real-time multiplayer communication
let gameRooms = new Map(); // In-memory storage for game events per room

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

  const { roomId } = req.query;
  
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (req.method === 'POST') {
    // Broadcast a game event to the room
    try {
      const gameEvent = req.body;
      
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, []);
      }
      
      // Add event to room's event queue
      const roomEvents = gameRooms.get(roomId);
      roomEvents.push({
        ...gameEvent,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });
      
      // Keep only last 50 events to prevent memory overflow
      if (roomEvents.length > 50) {
        roomEvents.splice(0, roomEvents.length - 50);
      }
      
      console.log(`Event broadcasted to room ${roomId}:`, gameEvent.type);
      
      res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Error broadcasting event:', error);
      res.status(500).json({ error: 'Failed to broadcast event' });
    }
  } 
  else if (req.method === 'GET') {
    // Get events for the room since a certain timestamp
    try {
      const { since } = req.query;
      const sinceTimestamp = since ? parseInt(since) : 0;
      
      if (!gameRooms.has(roomId)) {
        return res.status(200).json({ events: [] });
      }
      
      const roomEvents = gameRooms.get(roomId);
      const newEvents = roomEvents.filter(event => event.timestamp > sinceTimestamp);
      
      res.status(200).json({ 
        events: newEvents,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}