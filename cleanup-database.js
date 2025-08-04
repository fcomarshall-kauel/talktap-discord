require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Delete ALL players from web_players table
    const { error: deletePlayersError } = await supabase
      .from('web_players')
      .delete()
      .neq('id', 'dummy'); // Delete all records
    
    if (deletePlayersError) {
      console.error('❌ Error deleting players:', deletePlayersError);
    } else {
      console.log('✅ Deleted all players from web_players table');
    }

    // Delete ALL game states
    const { error: deleteGameStatesError } = await supabase
      .from('web_game_states')
      .delete()
      .neq('instance_id', 'dummy'); // Delete all records
    
    if (deleteGameStatesError) {
      console.error('❌ Error deleting game states:', deleteGameStatesError);
    } else {
      console.log('✅ Deleted all game states from web_game_states table');
    }

    // Delete ALL game events
    const { error: deleteGameEventsError } = await supabase
      .from('web_game_events')
      .delete()
      .neq('id', 'dummy'); // Delete all records
    
    if (deleteGameEventsError) {
      console.error('❌ Error deleting game events:', deleteGameEventsError);
    } else {
      console.log('✅ Deleted all game events from web_game_events table');
    }

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📊 All tables have been reset to empty state.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDatabase(); 