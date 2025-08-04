require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPlayers() {
  console.log('🔄 Resetting all players to online...');
  
  try {
    // Set all players to online
    const { error } = await supabase
      .from('web_players')
      .update({ 
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .neq('id', 'dummy'); // Exclude dummy records
    
    if (error) {
      console.error('❌ Error resetting players:', error);
      return;
    }
    
    console.log('✅ All players reset to online');
    
    // Verify the reset
    const { data: onlinePlayers } = await supabase
      .from('web_players')
      .select('*')
      .eq('is_online', true);
    
    console.log(`📊 Now have ${onlinePlayers?.length || 0} online players`);
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

resetPlayers(); 