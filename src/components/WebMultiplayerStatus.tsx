import { useLanguage } from "@/hooks/useLanguage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Users, Wifi, WifiOff, Trash2 } from "lucide-react";

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

interface WebMultiplayerStatusProps {
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  isConnected: boolean;
  getCurrentPlayer: () => Player | null;
  isCurrentPlayer: () => boolean;
}

export const WebMultiplayerStatus = ({
  players,
  currentPlayer,
  isHost,
  isConnected,
  getCurrentPlayer,
  isCurrentPlayer
}: WebMultiplayerStatusProps) => {
  const { t } = useLanguage();
  const currentPlayerInGame = getCurrentPlayer();

  const handleCleanPlayers = async () => {
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('@/lib/supabase');
        if (supabase) {
          // Delete all players
          const { error } = await supabase
            .from('web_players')
            .delete()
            .neq('id', 'dummy');
          
          if (error) {
            console.error('❌ Error cleaning players:', error);
            alert('Failed to clean players');
          } else {
            console.log('✅ All players cleaned');
            alert('All players cleaned! Page will refresh.');
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('❌ Clean players failed:', error);
        alert('Failed to clean players');
      }
    }
  };

  const handleResetDatabase = async () => {
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('@/lib/supabase');
        if (supabase) {
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
            console.error('❌ Error resetting database:', { playersError, gameStatesError, gameEventsError });
            alert('Failed to reset database');
          } else {
            console.log('✅ Database reset complete');
            alert('Database reset complete! Page will refresh.');
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('❌ Reset database failed:', error);
        alert('Failed to reset database');
      }
    }
  };

  const handleRefreshPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('multiplayer.status')}
        </h3>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? (
            <Wifi className="w-3 h-3 mr-1" />
          ) : (
            <WifiOff className="w-3 h-3 mr-1" />
          )}
          {isConnected ? t('multiplayer.connected') : t('multiplayer.disconnected')}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{t('multiplayer.players')}:</span>
          <span className="font-medium">{players.length}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span>{t('multiplayer.yourId')}:</span>
          <span className="font-mono text-xs">{currentPlayer?.id?.slice(-8) || 'N/A'}</span>
        </div>

        {currentPlayer && (
          <div className="flex items-center justify-between text-sm">
            <span>{t('multiplayer.yourName')}:</span>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {currentPlayer.global_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {currentPlayer.global_name}
                {isHost && ' (HOST)'}
              </span>
              {isHost && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        )}

        {currentPlayerInGame && (
          <div className="flex items-center justify-between text-sm">
            <span>{t('multiplayer.currentPlayer')}:</span>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {currentPlayerInGame.global_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {currentPlayerInGame.global_name}
                {isCurrentPlayer() && ' (YOUR TURN)'}
              </span>
              {isHost && currentPlayerInGame.id === currentPlayer?.id && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Players list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t('multiplayer.participants')}:</h4>
        <div className="space-y-1">
          {players.map((player, index) => (
            <div key={player.id} className="flex items-center gap-2 text-sm">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {player.global_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1">
                {player.global_name}
                {player.id === currentPlayer?.id && ' (YOU)'}
                {player.id === currentPlayerInGame?.id && ' (CURRENT)'}
              </span>
              <div className="flex items-center gap-1">
                {isHost && player.id === currentPlayer?.id && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
                <Badge 
                  variant={player.is_online ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {player.is_online ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection info */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          <p>• First player becomes host automatically</p>
          <p>• Players are marked offline when they close the tab</p>
          <p>• Real-time sync via Supabase WebSockets</p>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Admin Controls</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanPlayers}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clean Players
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetDatabase}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Reset DB
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPage}
              className="flex items-center gap-1"
            >
              🔄
              Refresh
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 space-y-1">
          <p>• Clean Players: Removes all players</p>
          <p>• Reset DB: Removes players, game states, and events</p>
          <p>• Refresh: Reloads the page</p>
        </div>
      </div>
    </div>
  );
}; 