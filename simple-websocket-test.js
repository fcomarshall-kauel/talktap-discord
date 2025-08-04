require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function simpleTest() {
  console.log('🧪 Simple WebSocket Test');
  
  // Subscribe to ALL changes
  const channel = supabase
    .channel('simple-test')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('🎯 ANY CHANGE DETECTED:', payload.table, payload.eventType, payload.new);
    })
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
    });

  // Wait a bit, then insert a test record
  setTimeout(async () => {
    console.log('🎮 Inserting test record...');
    const { data, error } = await supabase
      .from('web_players')
      .insert({
        id: `simple-test-${Date.now()}`,
        username: 'simple_test',
        global_name: 'Simple Test',
        is_host: false,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_online: true
      });

    if (error) {
      console.error('❌ Insert error:', error);
    } else {
      console.log('✅ Test record inserted');
    }

    // Clean up after 3 seconds
    setTimeout(() => {
      channel.unsubscribe();
      console.log('🧹 Test completed');
      process.exit(0);
    }, 3000);
  }, 1000);
}

simpleTest(); 