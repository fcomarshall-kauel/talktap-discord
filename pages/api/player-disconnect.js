import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log('🚪 ===== PLAYER DISCONNECT API CALLED =====');
  console.log('🚪 Timestamp:', timestamp);
  console.log('🚪 Method:', req.method);
  console.log('🚪 User-Agent:', req.headers['user-agent']);
  console.log('🚪 Origin:', req.headers['origin']);
  console.log('🚪 Content-Type:', req.headers['content-type']);
  console.log('🚪 Body length:', req.body ? req.body.length : 'undefined');
  console.log('🚪 Raw body:', req.body);

  if (req.method !== 'POST') {
    console.log('❌ API: Method not allowed');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse the beacon data - handle both Blob (sendBeacon) and JSON string (fetch)
    let disconnectData;
    if (typeof req.body === 'string') {
      // Handle fetch() requests (JSON string)
      disconnectData = JSON.parse(req.body);
    } else if (req.body && typeof req.body === 'object') {
      // Handle sendBeacon requests (already parsed object)
      disconnectData = req.body;
    } else {
      console.error('❌ API: Invalid body format');
      return res.status(400).json({ message: 'Invalid body format' });
    }
    
    console.log('🚪 ===== DISCONNECT DATA PARSED =====');
    console.log('🚪 Player ID:', disconnectData.player_id);
    console.log('🚪 Player Name:', disconnectData.player_name);
    console.log('🚪 Action:', disconnectData.action);
    console.log('🚪 Timestamp:', disconnectData.timestamp);
    console.log('🚪 Is Test:', disconnectData.test || false);

    const { player_id, player_name } = disconnectData;

    if (!player_id) {
      console.log('❌ API: Player ID required');
      return res.status(400).json({ message: 'Player ID required' });
    }

    console.log('🚪 ===== MARKING PLAYER OFFLINE =====');
    console.log('🚪 Player ID:', player_id);
    console.log('🚪 Player Name:', player_name);

    // Mark player as offline
    const { error: updateError } = await supabase
      .from('web_players')
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq('id', player_id);

    if (updateError) {
      console.error('❌ API: Error marking player offline:', updateError);
      return res.status(500).json({ message: 'Failed to mark player offline' });
    }

    console.log('✅ API: Player marked offline successfully');
    console.log('🚪 ===== PLAYER OFFLINE SUCCESS =====');

    // Broadcast disconnect event
    console.log('🚪 ===== BROADCASTING DISCONNECT EVENT =====');
    const { error: broadcastError } = await supabase
      .from('web_game_events')
      .insert({
        instance_id: 'web-multiplayer-game',
        event_type: 'PLAYER_DISCONNECT',
        payload: {
          player_id: player_id,
          player_name: player_name,
          timestamp: new Date().toISOString()
        },
        player_id: player_id
      });

    if (broadcastError) {
      console.error('❌ API: Error broadcasting disconnect:', broadcastError);
    } else {
      console.log('✅ API: Player disconnect broadcasted:', player_name);
      console.log('🚪 ===== DISCONNECT BROADCAST SUCCESS =====');
    }

    console.log('🚪 ===== DISCONNECT API COMPLETE =====');
    return res.status(200).json({ message: 'Player marked offline' });
  } catch (error) {
    console.error('❌ API: Player disconnect API error:', error);
    console.log('🚪 ===== DISCONNECT API ERROR =====');
    return res.status(500).json({ message: 'Internal server error' });
  }
} 