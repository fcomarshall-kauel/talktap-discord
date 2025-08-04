import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!supabase) {
      setConnectionStatus('no-config');
      return;
    }

    // Test basic connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('game_events').select('count').limit(1);
        if (error) {
          console.error('Database connection error:', error);
          setConnectionStatus('db-error');
        } else {
          setConnectionStatus('connected');
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionStatus('connection-failed');
      }
    };

    testConnection();

    // Set up realtime subscription for testing
    const channel = supabase
      .channel('realtime-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: 'instance_id=eq.realtime-test'
        },
        (payload) => {
          console.log('📡 Real-time event received:', payload);
          setMessages(prev => [...prev, {
            id: payload.new.id,
            message: payload.new.payload?.message || 'No message',
            timestamp: new Date().toLocaleTimeString(),
            player_id: payload.new.player_id
          }]);
        }
      )
      .subscribe((status) => {
        console.log('🔗 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('realtime-connected');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const sendTestMessage = async () => {
    if (!supabase || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('game_events')
        .insert({
          instance_id: 'realtime-test',
          event_type: 'TIMER_UPDATE',
          payload: { message: newMessage },
          player_id: 'test-user-' + Date.now()
        });

      if (error) {
        console.error('Failed to send test message:', error);
        alert('Failed to send message: ' + error.message);
      } else {
        setNewMessage('');
        console.log('✅ Test message sent successfully');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'realtime-connected': return 'text-green-500';
      case 'db-error': return 'text-red-600';
      case 'connection-failed': return 'text-red-600';
      case 'no-config': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ Database Connected';
      case 'realtime-connected': return '🚀 Realtime Connected!';
      case 'db-error': return '❌ Database Error - Check your schema';
      case 'connection-failed': return '❌ Connection Failed';
      case 'no-config': return '⚠️ Supabase Not Configured';
      default: return '🔄 Connecting...';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Realtime Test</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className={`text-lg font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>
          {!supabase && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">
                Supabase client not initialized. Check your environment variables:
              </p>
              <ul className="mt-2 text-sm text-yellow-700">
                <li>• NEXT_PUBLIC_SUPABASE_URL</li>
                <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          )}
        </div>

        {/* Test Messaging */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Real-time Messaging</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter a test message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
              />
              <button
                onClick={sendTestMessage}
                disabled={!newMessage.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send Test Message
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Messages will appear here in real-time (open in multiple tabs to test)
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Real-time Messages</h2>
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet. Send a test message above!</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                  <div className="font-medium">{msg.message}</div>
                  <div className="text-sm text-gray-600">
                    {msg.timestamp} - from {msg.player_id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
          <ol className="space-y-2 text-blue-800">
            <li>1. ✅ Configure environment variables (already done)</li>
            <li>2. 🔄 Run database schema in Supabase dashboard</li>
            <li>3. 📡 Enable realtime for tables in Database → Replication</li>
            <li>4. 🧪 Test real-time functionality on this page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}