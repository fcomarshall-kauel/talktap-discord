import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Play } from "lucide-react";

interface GameTimerProps {
  duration: number;
  isRunning: boolean;
  currentPlayerId?: string;
  onTimeout: () => void;
  onStartGame: () => void;
  onStopGame: () => void;
  onReset?: () => void;
}

export const GameTimer = ({ duration, isRunning, currentPlayerId, onTimeout, onStartGame, onStopGame, onReset }: GameTimerProps) => {
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
          "bg-gradient-primary shadow-game cursor-pointer touch-manipulation",
          isLowTime && isRunning && "animate-pulse-timer",
          !isRunning && "hover:scale-105 active:scale-95"
        )}
        onClick={isRunning ? onStopGame : onStartGame}
      >
        {isRunning && (
          <div 
            className="absolute inset-0 rounded-full border-4 border-accent transition-all duration-1000"
            style={{
              background: `conic-gradient(from 0deg, hsl(var(--game-secondary)) ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`
            }}
          />
        )}
        
        {isRunning ? (
          <span className={cn(
            "relative z-10 text-3xl font-bold text-foreground",
            isLowTime && "text-game-danger"
          )}>
            {timeLeft}
          </span>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-foreground">
            <Play className="w-8 h-8 mb-1" />
            <span className="text-xs font-semibold">{t('game.start')}</span>
          </div>
        )}
      </div>
    </div>
  );
};