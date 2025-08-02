import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { PlayerSelector } from "@/components/PlayerSelector";

interface GameControlsProps {
  onNewRound: () => void;
  timerDuration: number;
  onTimerDurationChange: (duration: number) => void;
  isGameActive: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  isCompact?: boolean;
  playerCount?: number;
  onPlayerCountChange?: (count: number) => void;
}

export const GameControls = ({ 
  onNewRound, 
  timerDuration, 
  onTimerDurationChange, 
  isGameActive,
  showSettings,
  onToggleSettings,
  isCompact = false,
  playerCount = 2,
  onPlayerCountChange
}: GameControlsProps) => {
  const { t } = useLanguage();
  
  if (isCompact) {
    return (
      <Button
        onClick={onToggleSettings}
        variant="outline"
        className={cn(
          "h-10 px-3 rounded-xl border-2 border-muted-foreground text-muted-foreground touch-manipulation",
          "active:bg-muted active:text-foreground transition-all duration-200",
          "shadow-letter active:shadow-lg transform active:scale-95"
        )}
      >
        <Settings className="w-4 h-4" />
      </Button>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          onClick={onNewRound}
          variant="outline"
          className={cn(
            "w-full h-14 px-4 rounded-xl border-2 border-accent text-accent touch-manipulation",
            "active:bg-accent active:text-accent-foreground transition-all duration-200",
            "shadow-letter active:shadow-lg transform active:scale-95"
          )}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t('game.newRound')}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            {t('game.timer')}: {timerDuration} {t('game.seconds')}
          </label>
          <Slider
            value={[timerDuration]}
            onValueChange={(value) => onTimerDurationChange(value[0])}
            min={5}
            max={30}
            step={1}
            className="w-full"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {t('game.timer')}
        </p>
      </div>
    </div>
  );
};