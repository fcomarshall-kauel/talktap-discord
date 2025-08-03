import { useDiscordSDK } from "@/hooks/useDiscordSDK";
import { useSupabaseMultiplayer } from "@/hooks/useSupabaseMultiplayer";
import { useLanguage } from "@/hooks/useLanguage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Users } from "lucide-react";

export const MultiplayerStatus = () => {
  const { participants, isHost, user, isConnected } = useDiscordSDK();
  const { getCurrentPlayer, isCurrentPlayer } = useSupabaseMultiplayer();
  const { t } = useLanguage();

  const currentPlayer = getCurrentPlayer();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
        <Users className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">
          {t('multiplayer.notConnected')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Turn Indicator */}
      {currentPlayer && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <Avatar className="h-6 w-6">
            <AvatarImage 
              src={`https://cdn.discordapp.com/avatars/${currentPlayer.id}/${currentPlayer.avatar}.png`} 
            />
            <AvatarFallback>{currentPlayer.username[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {isCurrentPlayer() ? t('multiplayer.yourTurn') : `${currentPlayer.global_name || currentPlayer.username}'s turn`}
          </span>
          {isCurrentPlayer() && (
            <Badge variant="secondary" className="ml-auto">
              {t('multiplayer.yourTurn')}
            </Badge>
          )}
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">
            {t('multiplayer.participants')} ({participants.length})
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {participants.map((participant, index) => (
            <div 
              key={participant.id}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                participant.id === currentPlayer?.id 
                  ? 'bg-primary/10 border-primary/20' 
                  : 'bg-muted/50'
              }`}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={`https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.png`} 
                />
                <AvatarFallback>{participant.username[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {participant.global_name || participant.username}
                </p>
                {participant.id === user?.id && (
                  <Badge variant="outline" className="text-xs">
                    {t('multiplayer.you')}
                  </Badge>
                )}
              </div>

              {isHost && index === 0 && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};