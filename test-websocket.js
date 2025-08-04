require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testWebSocket() {
  console.log('🧪 Testing WebSocket connections...');
  
  try {
    // Test 1: Subscribe to player changes
    console.log('📡 Setting up player subscription...');
    const playersChannel = supabase
      .channel('test-players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'web_players' },
        (payload) => {
          console.log('🎯 Player change detected:', payload.eventType, payload.new?.global_name);
        }
      )
      .subscribe((status) => {
        console.log('📡 Player subscription status:', status);
      });

    // Test 2: Subscribe to game state changes
    console.log('📡 Setting up game state subscription...');
    const gameStateChannel = supabase
      .channel('test-game-state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'web_game_states' },
        (payload) => {
          console.log('🎯 Game state change detected:', payload.new?.is_game_active);
        }
      )
      .subscribe((status) => {
        console.log('📡 Game state subscription status:', status);
      });

    // Test 3: Insert a test player to trigger WebSocket
    console.log('🎮 Creating test player...');
    const testPlayerId = `test-${Date.now()}`;
    const { data: testPlayer, error: insertError } = await supabase
      .from('web_players')
      .insert({
        id: testPlayerId,
        username: 'test_player',
        global_name: 'Test Player',
        is_host: false,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_online: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating test player:', insertError);
    } else {
      console.log('✅ Test player created:', testPlayer.global_name);
    }

    // Test 4: Update the test player
    setTimeout(async () => {
      console.log('🔄 Updating test player...');
      const { error: updateError } = await supabase
        .from('web_players')
        .update({ global_name: 'Updated Test Player' })
        .eq('id', testPlayerId);

      if (updateError) {
        console.error('❌ Error updating test player:', updateError);
      } else {
        console.log('✅ Test player updated');
      }
    }, 2000);

    // Test 5: Delete the test player
    setTimeout(async () => {
      console.log('🗑️ Deleting test player...');
      const { error: deleteError } = await supabase
        .from('web_players')
        .delete()
        .eq('id', testPlayerId);

      if (deleteError) {
        console.error('❌ Error deleting test player:', deleteError);
      } else {
        console.log('✅ Test player deleted');
      }

      // Cleanup subscriptions
      setTimeout(() => {
        playersChannel.unsubscribe();
        gameStateChannel.unsubscribe();
        console.log('🧹 WebSocket test completed');
        process.exit(0);
      }, 1000);
    }, 4000);

  } catch (error) {
    console.error('❌ WebSocket test failed:', error);
  }
}

// Run the test
testWebSocket(); 