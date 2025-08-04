require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRealtimeConfig() {
  console.log('🔍 Checking real-time configuration...');
  
  try {
    // Test 1: Check if we can read from tables
    console.log('📊 Testing table access...');
    const { data: players, error: playersError } = await supabase
      .from('web_players')
      .select('count')
      .limit(1);
    
    if (playersError) {
      console.error('❌ Cannot read web_players:', playersError);
    } else {
      console.log('✅ Can read from web_players table');
    }

    // Test 2: Check if we can write to tables
    console.log('✍️ Testing table write...');
    const testId = `realtime-test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('web_players')
      .insert({
        id: testId,
        username: 'realtime_test',
        global_name: 'Realtime Test',
        is_host: false,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_online: true
      })
      .select();

    if (insertError) {
      console.error('❌ Cannot write to web_players:', insertError);
    } else {
      console.log('✅ Can write to web_players table');
    }

    // Test 3: Check if we can delete
    const { error: deleteError } = await supabase
      .from('web_players')
      .delete()
      .eq('id', testId);

    if (deleteError) {
      console.error('❌ Cannot delete from web_players:', deleteError);
    } else {
      console.log('✅ Can delete from web_players table');
    }

    // Test 4: Check real-time subscription
    console.log('📡 Testing real-time subscription...');
    let eventReceived = false;
    
    const channel = supabase
      .channel('realtime-test')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'web_players' }, (payload) => {
        console.log('🎯 REAL-TIME EVENT RECEIVED:', payload.eventType, payload.new?.global_name);
        eventReceived = true;
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          // Insert a test record to trigger the event
          setTimeout(async () => {
            console.log('🎮 Triggering real-time event...');
            const triggerId = `trigger-${Date.now()}`;
            const { error: triggerError } = await supabase
              .from('web_players')
              .insert({
                id: triggerId,
                username: 'trigger_test',
                global_name: 'Trigger Test',
                is_host: false,
                joined_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                is_online: true
              });

            if (triggerError) {
              console.error('❌ Trigger insert failed:', triggerError);
            } else {
              console.log('✅ Trigger record inserted');
            }

            // Clean up trigger record
            setTimeout(async () => {
              await supabase
                .from('web_players')
                .delete()
                .eq('id', triggerId);
              
              channel.unsubscribe();
              
              if (eventReceived) {
                console.log('✅ Real-time is working!');
              } else {
                console.log('❌ Real-time events not received');
              }
              
              process.exit(0);
            }, 2000);
          }, 1000);
        }
      });

  } catch (error) {
    console.error('❌ Real-time check failed:', error);
  }
}

checkRealtimeConfig(); 