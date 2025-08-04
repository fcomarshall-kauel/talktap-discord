require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugPlayers() {
  console.log('🔍 Debugging players in database...');
  
  try {
    // Check all players
    const { data: allPlayers, error: allError } = await supabase
      .from('web_players')
      .select('*')
      .order('joined_at', { ascending: true });

    if (allError) {
      console.error('❌ Error fetching all players:', allError);
      return;
    }

    console.log('📊 All players in database:', allPlayers?.length || 0);
    if (allPlayers) {
      allPlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.global_name} (${player.id}) - Online: ${player.is_online} - Last seen: ${player.last_seen}`);
      });
    }

    // Check only online players
    const { data: onlinePlayers, error: onlineError } = await supabase
      .from('web_players')
      .select('*')
      .eq('is_online', true)
      .order('joined_at', { ascending: true });

    if (onlineError) {
      console.error('❌ Error fetching online players:', onlineError);
      return;
    }

    console.log('\n📊 Online players:', onlinePlayers?.length || 0);
    if (onlinePlayers) {
      onlinePlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.global_name} (${player.id}) - Host: ${player.is_host}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugPlayers(); 