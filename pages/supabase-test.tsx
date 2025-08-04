import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseTest() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testSupabase() {
      try {
        setStatus('Testing Supabase connection...');
        
        if (!supabase) {
          setError('Supabase client not available');
          setStatus('Failed');
          return;
        }

        // Test basic connection
        const { data, error } = await supabase
          .from('web_players')
          .select('count')
          .limit(1);

        if (error) {
          setError(`Database error: ${error.message}`);
          setStatus('Failed');
          return;
        }

        setStatus('✅ Supabase connection working!');
        
        // Test realtime
        const channel = supabase
          .channel('test')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'web_players' }, () => {})
          .subscribe((status) => {
            console.log('Realtime status:', status);
            if (status === 'SUBSCRIBED') {
              setStatus('✅ Supabase connection and realtime working!');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setError(`Realtime error: ${status}`);
              setStatus('Failed');
            }
          });

        return () => {
          channel.unsubscribe();
        };
      } catch (err) {
        setError(`Unexpected error: ${err}`);
        setStatus('Failed');
      }
    }

    testSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
            <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 