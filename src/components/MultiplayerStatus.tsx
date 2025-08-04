import { useDiscordSDK } from "@/hooks/useDiscordSDK";
import { useDiscordMultiplayer } from "@/hooks/useDiscordMultiplayer";
import { useLanguage } from "@/hooks/useLanguage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Users, RefreshCw } from "lucide-react";

export const MultiplayerStatus = () => {
  const { participants, isHost, user, isConnected } = useDiscordSDK();
  const { getCurrentPlayer, isCurrentPlayer, syncWithDiscordActivity } = useDiscordMultiplayer();
  const { t } = useLanguage();

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('multiplayer.status')}
        </h3>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? t('multiplayer.connected') : t('multiplayer.disconnected')}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{t('multiplayer.players')}:</span>
          <span className="font-medium">{participants.length}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span>{t('multiplayer.yourId')}:</span>
          <span className="font-mono text-xs">{user?.id?.slice(-8) || 'N/A'}</span>
        </div>

        {currentPlayer && (
          <div className="flex items-center justify-between text-sm">
            <span>{t('multiplayer.currentPlayer')}:</span>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentPlayer.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {currentPlayer.global_name?.[0] || currentPlayer.username[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {currentPlayer.global_name || currentPlayer.username}
                {isCurrentPlayer() && ' (YOU)'}
              </span>
              {isHost && currentPlayer.id === user?.id && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Discord-specific sync controls */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-sm">
          <span>Discord Sync:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncWithDiscordActivity}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Sync
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Discord activities don't sync automatically. Click "Sync" to check for updates.
        </p>
      </div>

      {/* Participants list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t('multiplayer.participants')}:</h4>
        <div className="space-y-1">
          {participants.map((participant, index) => (
            <div key={participant.id} className="flex items-center gap-2 text-sm">
              <Avatar className="w-6 h-6">
                <AvatarImage src={participant.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {participant.global_name?.[0] || participant.username[0]}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1">
                {participant.global_name || participant.username}
                {participant.id === user?.id && ' (YOU)'}
              </span>
              {isHost && participant.id === user?.id && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};