import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trash2, 
  Users, 
  Database, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Player {
  id: string;
  username: string;
  global_name: string;
  avatar?: string;
  is_host: boolean;
  joined_at: string;
  last_seen: string;
  is_online: boolean;
}

const ResetPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    onlinePlayers: 0,
    gameStates: 0,
    gameEvents: 0
  });

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Load stats on page load
  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = async () => {
    setIsLoading(true);
    try {
      // Get players
      const { data: playersData, error: playersError } = await supabase
        .from('web_players')
        .select('*')
        .order('joined_at', { ascending: false });

      if (playersError) {
        console.error('Error fetching players:', playersError);
        showMessage('error', 'Failed to fetch players');
        return;
      }

      // Get game states count
      const { count: gameStatesCount, error: gameStatesError } = await supabase
        .from('web_game_states')
        .select('*', { count: 'exact', head: true });

      if (gameStatesError) {
        console.error('Error fetching game states:', gameStatesError);
      }

      // Get game events count
      const { count: gameEventsCount, error: gameEventsError } = await supabase
        .from('web_game_events')
        .select('*', { count: 'exact', head: true });

      if (gameEventsError) {
        console.error('Error fetching game events:', gameEventsError);
      }

      setPlayers(playersData || []);
      setStats({
        totalPlayers: playersData?.length || 0,
        onlinePlayers: playersData?.filter(p => p.is_online).length || 0,
        gameStates: gameStatesCount || 0,
        gameEvents: gameEventsCount || 0
      });

      showMessage('success', 'Stats refreshed successfully');
    } catch (error) {
      console.error('Error refreshing stats:', error);
      showMessage('error', 'Failed to refresh stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('⚠️ This will delete ALL players, game states, and events. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete all players, game states, and events
      const { error: playersError } = await supabase
        .from('web_players')
        .delete()
        .neq('id', 'dummy');
      
      const { error: gameStatesError } = await supabase
        .from('web_game_states')
        .delete()
        .neq('instance_id', 'dummy');
      
      const { error: gameEventsError } = await supabase
        .from('web_game_events')
        .delete()
        .neq('instance_id', 'dummy');
      
      if (playersError || gameStatesError || gameEventsError) {
        console.error('Error resetting database:', { playersError, gameStatesError, gameEventsError });
        showMessage('error', 'Failed to reset database');
      } else {
        console.log('✅ Database reset complete');
        showMessage('success', 'Database reset complete! Refreshing stats...');
        await refreshStats();
      }
    } catch (error) {
      console.error('Reset database failed:', error);
      showMessage('error', 'Failed to reset database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanPlayers = async () => {
    if (!confirm('⚠️ This will delete ALL players. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('web_players')
        .delete()
        .neq('id', 'dummy');
      
      if (error) {
        console.error('Error cleaning players:', error);
        showMessage('error', 'Failed to clean players');
      } else {
        console.log('✅ All players cleaned');
        showMessage('success', 'All players cleaned! Refreshing stats...');
        await refreshStats();
      }
    } catch (error) {
      console.error('Clean players failed:', error);
      showMessage('error', 'Failed to clean players');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceCleanup = async () => {
    if (!confirm('⚠️ This will mark all players as offline if they haven\'t been seen in 1 minute. Continue?')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('web_players')
        .update({ is_online: false })
        .lt('last_seen', new Date(Date.now() - 1 * 60 * 1000).toISOString())
        .eq('is_online', true);
      
      if (error) {
        console.error('Error force cleanup:', error);
        showMessage('error', 'Failed to force cleanup');
      } else {
        console.log('✅ Force cleanup complete');
        showMessage('success', 'Force cleanup complete! Refreshing stats...');
        await refreshStats();
      }
    } catch (error) {
      console.error('Force cleanup failed:', error);
      showMessage('error', 'Failed to force cleanup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDisconnect = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing disconnect via API...');
      
      const disconnectData = {
        player_id: 'test-player-id',
        player_name: 'Test Player',
        action: 'disconnect',
        timestamp: new Date().toISOString(),
        test: true
      };
      
      console.log('🧪 Sending test disconnect to API:', disconnectData);
      
      const response = await fetch('/api/player-disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disconnectData)
      });
      
      if (response.ok) {
        console.log('✅ Test disconnect API call successful');
        showMessage('success', 'Test disconnect complete! Check server logs.');
      } else {
        console.error('❌ Test disconnect API call failed:', response.status);
        showMessage('error', 'Test disconnect API call failed');
      }
    } catch (error) {
      console.error('Test disconnect failed:', error);
      showMessage('error', 'Failed to test disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckLastSeen = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('web_players')
        .select('id, global_name, last_seen, is_online')
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error checking last seen:', error);
        showMessage('error', 'Failed to check last seen times');
      } else {
        console.log('📊 Last seen times:', data);
        const times = data?.map(p => `${p.global_name}: ${new Date(p.last_seen).toLocaleString()}`).join('\n');
        alert(`Last seen times:\n\n${times || 'No players found'}`);
        showMessage('success', 'Last seen times checked');
      }
    } catch (error) {
      console.error('Check last seen failed:', error);
      showMessage('error', 'Failed to check last seen times');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Database Reset</h1>
          <p className="text-white/80">Manage your multiplayer game database</p>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-500 bg-green-500/10' : 
                           message.type === 'error' ? 'border-red-500 bg-red-500/10' : 
                           'border-blue-500 bg-blue-500/10'}>
            {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {message.type === 'error' && <XCircle className="h-4 w-4" />}
            {message.type === 'info' && <AlertTriangle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Statistics
            </CardTitle>
            <CardDescription className="text-white/70">
              Current state of your multiplayer game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalPlayers}</div>
                <div className="text-sm text-white/70">Total Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.onlinePlayers}</div>
                <div className="text-sm text-white/70">Online Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.gameStates}</div>
                <div className="text-sm text-white/70">Game States</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.gameEvents}</div>
                <div className="text-sm text-white/70">Game Events</div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={refreshStats} 
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reset Database */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5" />
                Reset Database
              </CardTitle>
              <CardDescription className="text-white/70">
                Delete all players, game states, and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleResetDatabase} 
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Everything
              </Button>
            </CardContent>
          </Card>

          {/* Clean Players */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clean Players
              </CardTitle>
              <CardDescription className="text-white/70">
                Delete all players from the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleCleanPlayers} 
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clean All Players
              </Button>
            </CardContent>
          </Card>

          {/* Force Cleanup */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <WifiOff className="w-5 h-5" />
                Force Cleanup
              </CardTitle>
              <CardDescription className="text-white/70">
                Mark inactive players as offline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleForceCleanup} 
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                Force Cleanup
              </Button>
            </CardContent>
          </Card>

          {/* Test Disconnect */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Test Disconnect
              </CardTitle>
              <CardDescription className="text-white/70">
                Test the disconnect API endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTestDisconnect} 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Test Disconnect API
              </Button>
            </CardContent>
          </Card>

          {/* Check Last Seen */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Check Last Seen
              </CardTitle>
              <CardDescription className="text-white/70">
                View when players were last active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleCheckLastSeen} 
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                Check Last Seen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Players List */}
        {players.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Current Players ({players.length})
              </CardTitle>
              <CardDescription className="text-white/70">
                All players in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {players.map((player) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${player.is_online ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <div>
                        <div className="font-medium text-white">{player.global_name}</div>
                        <div className="text-xs text-white/60">{player.username}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={player.is_host ? "default" : "secondary"} className="text-xs">
                        {player.is_host ? 'Host' : 'Player'}
                      </Badge>
                      <div className="text-xs text-white/60 mt-1">
                        {new Date(player.last_seen).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/game'} 
            variant="outline"
            className="mr-2"
          >
            Go to Game
          </Button>
          <Button 
            onClick={() => window.location.href = '/multiplayer-web'} 
            variant="outline"
          >
            Go to Test Page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPage; 