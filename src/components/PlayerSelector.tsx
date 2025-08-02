
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PlayerSelectorProps {
  playerCount: number;
  onPlayerCountChange: (count: number) => void;
  isCompact?: boolean;
}

export const PlayerSelector = ({ 
  playerCount, 
  onPlayerCountChange, 
  isCompact = false 
}: PlayerSelectorProps) => {
  const { t } = useLanguage();

  if (isCompact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-12 px-1 rounded-xl border-2 border-muted-foreground text-muted-foreground bg-muted",
              "focus:border-accent focus:text-accent transition-all duration-200",
              "touch-manipulation active:scale-95 gap-1"
            )}
          >
            <Users className="w-3 h-3" />
            <span className="text-xs font-semibold">{playerCount}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{t('game.players')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-6">
            {[2, 3, 4, 5, 6].map((count) => (
              <Button
                key={count}
                variant={playerCount === count ? "default" : "outline"}
                className={cn(
                  "h-16 text-xl font-semibold rounded-xl border-2 touch-manipulation",
                  "active:scale-95 transition-all duration-200",
                  playerCount === count 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                    : "border-muted-foreground hover:border-accent hover:text-accent"
                )}
                onClick={() => onPlayerCountChange(count)}
              >
                {count}
              </Button>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground pb-2">
            {t('game.players')}: {playerCount}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        {t('game.players')}: {playerCount}
      </label>
      <div className="grid grid-cols-3 gap-3">
        {[2, 3, 4, 5, 6].map((count) => (
          <Button
            key={count}
            variant={playerCount === count ? "default" : "outline"}
            className={cn(
              "h-12 text-lg font-medium rounded-xl border-2 touch-manipulation",
              "active:scale-95 transition-all duration-200",
              playerCount === count 
                ? "bg-primary text-primary-foreground border-primary" 
                : "border-muted-foreground hover:border-accent"
            )}
            onClick={() => onPlayerCountChange(count)}
          >
            {count}
          </Button>
        ))}
      </div>
    </div>
  );
};
