require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicates() {
  console.log('🔧 Fixing duplicate players...');
  
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
    
    // Find Player 1 duplicates
    const player1Duplicates = allPlayers.filter(player => 
      player.global_name === 'Player 1'
    );
    
    if (player1Duplicates.length > 1) {
      console.log(`🔍 Found ${player1Duplicates.length} Player 1 duplicates`);
      
      // Sort by joined_at to keep the oldest
      player1Duplicates.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
      
      // Delete all but the first (oldest) one
      for (let i = 1; i < player1Duplicates.length; i++) {
        const { error } = await supabase
          .from('web_players')
          .delete()
          .eq('id', player1Duplicates[i].id);
        
        if (error) {
          console.error(`❌ Error deleting duplicate ${player1Duplicates[i].id}:`, error);
        } else {
          console.log(`🗑️ Deleted duplicate: ${player1Duplicates[i].id}`);
        }
      }
      
      console.log(`✅ Kept oldest Player 1: ${player1Duplicates[0].id}`);
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
    console.error('❌ Fix failed:', error);
  }
}

fixDuplicates(); 