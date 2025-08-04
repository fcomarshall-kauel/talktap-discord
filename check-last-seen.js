require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastSeen() {
  console.log('🔍 Checking last_seen values...');
  console.log('⏰ Current time:', new Date().toISOString());
  console.log('');

  try {
    // Get all players with their last_seen values
    const { data: players, error } = await supabase
      .from('web_players')
      .select('id, global_name, is_online, last_seen, joined_at')
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('❌ Error fetching players:', error);
      return;
    }

    if (!players || players.length === 0) {
      console.log('📭 No players found in database');
      return;
    }

    console.log(`📊 Found ${players.length} players:`);
    console.log('');

    players.forEach((player, index) => {
      const lastSeen = new Date(player.last_seen);
      const now = new Date();
      const timeDiff = now - lastSeen;
      const secondsAgo = Math.floor(timeDiff / 1000);
      const minutesAgo = Math.floor(secondsAgo / 60);

      console.log(`${index + 1}. ${player.global_name}`);
      console.log(`   ID: ${player.id}`);
      console.log(`   Online: ${player.is_online ? '🟢 YES' : '🔴 NO'}`);
      console.log(`   Last seen: ${player.last_seen}`);
      console.log(`   Time ago: ${minutesAgo}m ${secondsAgo % 60}s ago`);
      
      // Check if player should be marked offline (10 seconds)
      if (player.is_online && secondsAgo > 10) {
        console.log(`   ⚠️  Should be offline (${secondsAgo}s > 10s)`);
      } else if (player.is_online) {
        console.log(`   ✅ Still active (${secondsAgo}s <= 10s)`);
      }
      console.log('');
    });

    // Check which players would be cleaned up
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const playersToCleanup = players.filter(p => 
      p.is_online && new Date(p.last_seen) < tenSecondsAgo
    );

    if (playersToCleanup.length > 0) {
      console.log('🧹 Players that should be cleaned up:');
      playersToCleanup.forEach(player => {
        const secondsAgo = Math.floor((new Date() - new Date(player.last_seen)) / 1000);
        console.log(`   - ${player.global_name} (${secondsAgo}s ago)`);
      });
    } else {
      console.log('✅ No players need cleanup');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLastSeen(); 