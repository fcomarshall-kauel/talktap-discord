import { cn } from "@/lib/utils";

interface LetterGridProps {
  usedLetters: string[] | Set<string>;
  onLetterSelect: (letter: string) => void;
  disabled?: boolean;
}

export const LetterGrid = ({ usedLetters, onLetterSelect, disabled = false }: LetterGridProps) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Helper function to check if a letter is used
  const isLetterUsed = (letter: string) => {
    if (usedLetters instanceof Set) {
      return usedLetters.has(letter);
    } else {
      return usedLetters.includes(letter);
    }
  };

  const handleLetterClick = (letter: string) => {
    if (disabled || isLetterUsed(letter)) return;
    onLetterSelect(letter);
  };

  return (
    <div className="grid grid-cols-6 gap-2 max-w-sm mx-auto px-4">
      {alphabet.map((letter) => {
        const isUsed = isLetterUsed(letter);
        const isDisabled = disabled || isUsed;
        
        return (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            disabled={isDisabled}
            className={cn(
              "relative w-14 h-14 rounded-xl font-bold text-base transition-all duration-200",
              "flex items-center justify-center shadow-letter touch-manipulation",
              "active:animate-letter-bounce select-none",
              !isDisabled && [
                "bg-gradient-accent text-foreground active:scale-95",
                "shadow-lg transform-gpu active:shadow-xl"
              ],
              isUsed && [
                "bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
                "relative overflow-hidden"
              ],
              disabled && !isUsed && [
                "bg-secondary text-secondary-foreground opacity-70 cursor-not-allowed"
              ]
            )}
          >
            <span className="relative z-10">{letter}</span>
            {isUsed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-destructive rotate-45 absolute" />
                <div className="w-8 h-0.5 bg-destructive -rotate-45 absolute" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};