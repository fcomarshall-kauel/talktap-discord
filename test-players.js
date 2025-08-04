require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPlayers() {
  console.log('🔍 Testing web_players table...');
  
  try {
    // Get all players
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
      allPlayers.forEach(player => {
        console.log(`  - ${player.global_name} (${player.id}) - Online: ${player.is_online}`);
      });
    }
    
    // Get only online players
    const { data: onlinePlayers, error: onlineError } = await supabase
      .from('web_players')
      .select('*')
      .eq('is_online', true)
      .order('joined_at', { ascending: true });
    
    if (onlineError) {
      console.error('❌ Error fetching online players:', onlineError);
      return;
    }
    
    console.log('📊 Online players:', onlinePlayers?.length || 0);
    if (onlinePlayers) {
      onlinePlayers.forEach(player => {
        console.log(`  - ${player.global_name} (${player.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPlayers(); 