require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllPlayers() {
  console.log('🗑️ Clearing all players from database...');
  
  try {
    // Delete all players
    const { error } = await supabase
      .from('web_players')
      .delete()
      .neq('id', 'dummy'); // Keep dummy records if any
    
    if (error) {
      console.error('❌ Error clearing players:', error);
      return;
    }
    
    console.log('✅ All players cleared from database');
    
    // Also clear game states and events
    const { error: gameStatesError } = await supabase
      .from('web_game_states')
      .delete()
      .neq('instance_id', 'dummy');
    
    if (gameStatesError) {
      console.error('❌ Error clearing game states:', gameStatesError);
    } else {
      console.log('✅ All game states cleared');
    }
    
    const { error: gameEventsError } = await supabase
      .from('web_game_events')
      .delete()
      .neq('instance_id', 'dummy');
    
    if (gameEventsError) {
      console.error('❌ Error clearing game events:', gameEventsError);
    } else {
      console.log('✅ All game events cleared');
    }
    
    console.log('🎯 Database is now clean and ready for fresh testing!');
    
  } catch (error) {
    console.error('❌ Clear failed:', error);
  }
}

clearAllPlayers(); 