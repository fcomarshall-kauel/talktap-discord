require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database state...');
  
  try {
    // Check players
    const { data: players, error: playersError } = await supabase
      .from('web_players')
      .select('*')
      .order('joined_at', { ascending: true });
    
    if (playersError) {
      console.error('❌ Error fetching players:', playersError);
      return;
    }
    
    console.log('\n📊 PLAYERS:');
    console.log(`Total players: ${players?.length || 0}`);
    if (players) {
      players.forEach(player => {
        const status = player.is_online ? '🟢 ONLINE' : '🔴 OFFLINE';
        const lastSeen = new Date(player.last_seen).toLocaleString();
        console.log(`  ${status} ${player.global_name} (${player.id.slice(-8)}) - Last seen: ${lastSeen}`);
      });
    }
    
    // Check game events
    const { data: events, error: eventsError } = await supabase
      .from('web_game_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      return;
    }
    
    console.log('\n📡 RECENT EVENTS:');
    console.log(`Total events: ${events?.length || 0}`);
    if (events) {
      events.forEach(event => {
        const timestamp = new Date(event.created_at).toLocaleString();
        console.log(`  ${event.event_type} - ${event.player_id?.slice(-8) || 'N/A'} - ${timestamp}`);
        if (event.payload) {
          console.log(`    Payload: ${JSON.stringify(event.payload)}`);
        }
      });
    }
    
    // Check game states
    const { data: gameStates, error: gameStatesError } = await supabase
      .from('web_game_states')
      .select('*');
    
    if (gameStatesError) {
      console.error('❌ Error fetching game states:', gameStatesError);
      return;
    }
    
    console.log('\n🎮 GAME STATES:');
    console.log(`Total game states: ${gameStates?.length || 0}`);
    if (gameStates) {
      gameStates.forEach(state => {
        console.log(`  Instance: ${state.instance_id} - Active: ${state.is_game_active}`);
      });
    }
    
    // Summary
    const onlinePlayers = players?.filter(p => p.is_online) || [];
    const disconnectEvents = events?.filter(e => e.event_type === 'PLAYER_DISCONNECT') || [];
    
    console.log('\n📋 SUMMARY:');
    console.log(`🟢 Online players: ${onlinePlayers.length}`);
    console.log(`🔴 Offline players: ${(players?.length || 0) - onlinePlayers.length}`);
    console.log(`📡 Disconnect events: ${disconnectEvents.length}`);
    console.log(`📡 Total events: ${events?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDatabase(); 