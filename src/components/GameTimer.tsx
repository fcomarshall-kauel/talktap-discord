import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Play, Clock } from "lucide-react";

interface GameTimerProps {
  duration: number;
  isRunning: boolean;
  currentPlayerId?: string;
  onTimeout: () => void;
  onStartGame: () => void;
  onStopGame: () => void;
  onReset?: () => void;
  isMyTurn?: boolean;
  isHost?: boolean;
}

export const GameTimer = ({ duration, isRunning, currentPlayerId, onTimeout, onStartGame, onStopGame, onReset, isMyTurn = true, isHost = false }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastPlayerId, setLastPlayerId] = useState<string | undefined>(currentPlayerId);
  const { t } = useLanguage();

  // Reset timer when game starts or player changes
  useEffect(() => {
    if (isRunning && (!startTime || currentPlayerId !== lastPlayerId)) {
      setTimeLeft(duration);
      setStartTime(Date.now());
      setLastPlayerId(currentPlayerId);
    } else if (!isRunning) {
      setStartTime(null);
      setLastPlayerId(undefined);
    }
  }, [isRunning, duration, startTime, currentPlayerId, lastPlayerId]);

  useEffect(() => {
    if (onReset) {
      setTimeLeft(duration);
      setStartTime(null);
    }
  }, [onReset, duration]);

  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onTimeout();
      }
    }, 100); // Update more frequently for smoother countdown

    return () => clearInterval(interval);
  }, [isRunning, startTime, duration, onTimeout]);

  const resetTimer = () => {
    setTimeLeft(duration);
  };

  // Expose reset function for parent component
  useEffect(() => {
    if (window) {
      (window as any).resetGameTimer = resetTimer;
    }
  }, []);

  const percentage = (timeLeft / duration) * 100;
  const isLowTime = timeLeft <= 3;

  return (
    <div className="flex flex-col items-center space-y-3">
      <div 
        className={cn(
          "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
          "shadow-game cursor-pointer touch-manipulation",
          // Different colors based on turn
          isRunning && isMyTurn && "bg-gradient-primary",
          isRunning && !isMyTurn && "bg-gradient-to-br from-gray-400 to-gray-500",
          !isRunning && "bg-gradient-primary hover:scale-105 active:scale-95",
          isLowTime && isRunning && isMyTurn && "animate-pulse-timer"
        )}
        onClick={isRunning ? onStopGame : (isHost ? onStartGame : undefined)}
      >
        {isRunning && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full border-4 transition-all duration-1000",
              isMyTurn ? "border-accent" : "border-gray-400"
            )}
            style={{
              background: `conic-gradient(from 0deg, ${isMyTurn ? 'hsl(var(--game-secondary))' : '#9CA3AF'} ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`
            }}
          />
        )}
        
        {isRunning ? (
          <span className={cn(
            "relative z-10 text-3xl font-bold",
            isMyTurn ? "text-foreground" : "text-gray-600",
            isLowTime && isMyTurn && "text-game-danger"
          )}>
            {timeLeft}
          </span>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-foreground">
            {isHost ? (
              <>
                <Play className="w-8 h-8 mb-1" />
                <span className="text-xs font-semibold">{t('game.start')}</span>
              </>
            ) : (
              <>
                <Clock className="w-8 h-8 mb-1 animate-pulse" />
                <span className="text-xs font-semibold">Wait for host</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};