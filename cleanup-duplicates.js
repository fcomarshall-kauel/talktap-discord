require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate players...');
  
  try {
    // Get all players
    const { data: allPlayers } = await supabase
      .from('web_players')
      .select('*')
      .order('joined_at', { ascending: true });
    
    if (!allPlayers) {
      console.log('No players found');
      return;
    }
    
    console.log(`📊 Found ${allPlayers.length} total players`);
    
    // Group by global_name to find duplicates
    const duplicates = {};
    allPlayers.forEach(player => {
      if (!duplicates[player.global_name]) {
        duplicates[player.global_name] = [];
      }
      duplicates[player.global_name].push(player);
    });
    
    // Find and delete duplicates (keep the oldest one)
    let deletedCount = 0;
    for (const [name, players] of Object.entries(duplicates)) {
      if (players.length > 1) {
        console.log(`🔍 Found ${players.length} duplicates for ${name}`);
        
        // Sort by joined_at to keep the oldest
        players.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
        
        // Delete all but the first (oldest) one
        for (let i = 1; i < players.length; i++) {
          const { error } = await supabase
            .from('web_players')
            .delete()
            .eq('id', players[i].id);
          
          if (error) {
            console.error(`❌ Error deleting duplicate ${players[i].id}:`, error);
          } else {
            deletedCount++;
            console.log(`🗑️ Deleted duplicate: ${players[i].id}`);
          }
        }
      }
    }
    
    console.log(`✅ Cleaned up ${deletedCount} duplicate players`);
    
    // Set remaining players to online
    const { error: updateError } = await supabase
      .from('web_players')
      .update({ 
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .neq('id', 'dummy');
    
    if (updateError) {
      console.error('❌ Error setting players online:', updateError);
    } else {
      console.log('✅ Set all remaining players to online');
    }
    
    // Show final state
    const { data: finalPlayers } = await supabase
      .from('web_players')
      .select('*')
      .eq('is_online', true);
    
    console.log(`📊 Final state: ${finalPlayers?.length || 0} online players`);
    if (finalPlayers) {
      finalPlayers.forEach(player => {
        console.log(`  - ${player.global_name} (${player.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDuplicates(); 