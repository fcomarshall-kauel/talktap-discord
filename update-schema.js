require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateSchema() {
  console.log('🔧 Updating database schema...');
  
  try {
    // Add host column to web_game_states if it doesn't exist
    console.log('📊 Adding host column to web_game_states...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'web_game_states' AND column_name = 'host'
          ) THEN
            ALTER TABLE web_game_states ADD COLUMN host TEXT;
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.log('ℹ️ Host column might already exist or RPC not available');
      console.log('ℹ️ You may need to run this manually in Supabase SQL editor:');
      console.log('ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS host TEXT;');
    } else {
      console.log('✅ Host column added to web_game_states');
    }

    // Check current table structure
    console.log('📋 Checking current table structure...');
    const { data: players, error: playersError } = await supabase
      .from('web_players')
      .select('*')
      .limit(1);

    if (playersError) {
      console.error('❌ Error checking web_players:', playersError);
    } else {
      console.log('✅ web_players table accessible');
    }

    const { data: gameStates, error: gameStatesError } = await supabase
      .from('web_game_states')
      .select('*')
      .limit(1);

    if (gameStatesError) {
      console.error('❌ Error checking web_game_states:', gameStatesError);
      console.log('💡 Try running this in Supabase SQL editor:');
      console.log(`
        -- Add missing columns to web_game_states
        ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS host TEXT;
        ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `);
    } else {
      console.log('✅ web_game_states table accessible');
    }

    console.log('🎉 Schema update completed!');

  } catch (error) {
    console.error('❌ Schema update failed:', error);
  }
}

updateSchema(); 