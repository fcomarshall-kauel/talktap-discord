import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log('🧹 ===== CLEANUP OFFLINE PLAYERS API CALLED =====');
  console.log('🧹 Timestamp:', timestamp);
  console.log('🧹 Method:', req.method);

  if (req.method !== 'POST') {
    console.log('❌ API: Method not allowed');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Calculate the cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    console.log('🧹 Cutoff time (5 minutes ago):', cutoffTime);

    // Find players who haven't been seen in the last 5 minutes but are still marked as online
    const { data: stalePlayers, error: fetchError } = await supabase
      .from('web_players')
      .select('id, global_name, last_seen')
      .eq('is_online', true)
      .lt('last_seen', cutoffTime);

    if (fetchError) {
      console.error('❌ API: Error fetching stale players:', fetchError);
      return res.status(500).json({ message: 'Failed to fetch stale players' });
    }

    console.log('🧹 Found stale players:', stalePlayers?.length || 0);
    
    if (stalePlayers && stalePlayers.length > 0) {
      console.log('🧹 Stale players details:');
      stalePlayers.forEach(player => {
        console.log(`🧹 - ${player.global_name} (${player.id}): last seen ${player.last_seen}`);
      });

      // Mark all stale players as offline
      const { error: updateError } = await supabase
        .from('web_players')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .in('id', stalePlayers.map(p => p.id));

      if (updateError) {
        console.error('❌ API: Error marking players offline:', updateError);
        return res.status(500).json({ message: 'Failed to mark players offline' });
      }

      console.log('✅ API: Marked', stalePlayers.length, 'players as offline');

      // Broadcast disconnect events for each stale player
      for (const player of stalePlayers) {
        const { error: broadcastError } = await supabase
          .from('web_game_events')
          .insert({
            instance_id: 'web-multiplayer-game',
            event_type: 'PLAYER_DISCONNECT',
            payload: {
              player_id: player.id,
              player_name: player.global_name,
              timestamp: new Date().toISOString(),
              reason: 'timeout'
            },
            player_id: player.id
          });

        if (broadcastError) {
          console.error('❌ API: Error broadcasting disconnect for', player.global_name, ':', broadcastError);
        } else {
          console.log('✅ API: Broadcasted disconnect for', player.global_name);
        }
      }

      console.log('🧹 ===== CLEANUP COMPLETE =====');
      return res.status(200).json({ 
        message: 'Cleanup completed', 
        playersMarkedOffline: stalePlayers.length,
        players: stalePlayers.map(p => ({ id: p.id, name: p.global_name }))
      });
    } else {
      console.log('✅ API: No stale players found');
      console.log('🧹 ===== CLEANUP COMPLETE =====');
      return res.status(200).json({ 
        message: 'No stale players found', 
        playersMarkedOffline: 0 
      });
    }
  } catch (error) {
    console.error('❌ API: Cleanup error:', error);
    console.log('🧹 ===== CLEANUP ERROR =====');
    return res.status(500).json({ message: 'Internal server error' });
  }
} 