import { useState, useCallback, useEffect } from "react";
import { GameTimer } from "@/components/GameTimer";
import { LetterGrid } from "@/components/LetterGrid";
import { CategoryDisplay } from "@/components/CategoryDisplay";
import { GameControls } from "@/components/GameControls";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PlayerSelector } from "@/components/PlayerSelector";
import { getRandomCategory } from "@/data/categories";
import { useLanguage } from "@/hooks/useLanguage";
import { useThemeRotation } from "@/hooks/useThemeRotation";

const Index = () => {
  const [currentCategory, setCurrentCategory] = useState({ id: "animals", es: "animales", en: "animals" }); // Always use default for SSR
  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());
  const [isGameActive, setIsGameActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);
  const [timerKey, setTimerKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const [playerCount, setPlayerCount] = useState(2);
  const { t } = useLanguage();
  
  // Use theme rotation hook with player count
  useThemeRotation(themeIndex, playerCount);

  // Update to random category after hydration is complete
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentCategory(getRandomCategory());
    }
  }, []); // Only run once after mount



  const startNewRound = useCallback(() => {
    setUsedLetters(new Set());
    setIsGameActive(true);
    setTimerKey(prev => prev + 1);
    setThemeIndex(prev => prev + 1); // Change theme each round
  }, []);

  const resetGame = useCallback(() => {
    const newCategory = getRandomCategory();
    setCurrentCategory(newCategory);
    setUsedLetters(new Set());
    setIsGameActive(false); // Don't start automatically
    setTimerKey(prev => prev + 1);
    setThemeIndex(prev => prev + 1); // Change theme each round
  }, []);

  const handleLetterSelect = useCallback((letter: string) => {
    if (!isGameActive || usedLetters.has(letter)) return;
    
    setUsedLetters(prev => new Set([...prev, letter]));
    setTimerKey(prev => prev + 1); // Reset timer
    setThemeIndex(prev => prev + 1); // Change theme each turn
  }, [isGameActive, usedLetters]);

  const handleTimeout = useCallback(() => {
    setIsGameActive(false);
    // Just reset, don't auto-start new round
    const newCategory = getRandomCategory();
    setCurrentCategory(newCategory);
    setUsedLetters(new Set());
    setTimerKey(prev => prev + 1);
  }, []);

  const handleStartGame = useCallback(() => {
    if (!isGameActive) {
      startNewRound();
    }
  }, [isGameActive, startNewRound]);

  const handleStopGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col safe-area-inset">
      {/* Header */}
      <div className="relative text-center py-4 px-4">
        <div className="absolute top-4 left-4">
          <LanguageToggle />
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <PlayerSelector
            playerCount={playerCount}
            onPlayerCountChange={setPlayerCount}
            isCompact={true}
          />
          <GameControls
            onNewRound={resetGame}
            timerDuration={timerDuration}
            onTimerDurationChange={setTimerDuration}
            isGameActive={isGameActive}
            showSettings={showSettings}
            onToggleSettings={handleToggleSettings}
            isCompact={true}
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">{t('app.title')}</h1>
        <p className="text-sm text-white mt-4 mb-4">{t('app.subtitle')}</p>
        
        {/* Category Display */}
        <CategoryDisplay 
          category={currentCategory} 
          isActive={isGameActive} 
        />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col justify-start px-4 space-y-4 max-w-sm mx-auto w-full pb-safe">
        
        {/* Timer with integrated start button */}
        <div className="flex justify-center">
          <GameTimer
            key={timerKey}
            duration={timerDuration}
            isRunning={isGameActive}
            onTimeout={handleTimeout}
            onStartGame={handleStartGame}
            onStopGame={handleStopGame}
          />
        </div>

        {/* Letter Grid */}
        <div className="flex justify-center">
          <LetterGrid
            usedLetters={usedLetters}
            onLetterSelect={handleLetterSelect}
            disabled={!isGameActive}
          />
        </div>

        {/* Game Stats */}
        {isGameActive && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('game.lettersUsed')}: {usedLetters.size}/26
            </p>
          </div>
        )}
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleToggleSettings}
        >
          <div 
            className="bg-gradient-secondary p-6 rounded-2xl shadow-game max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <GameControls
              onNewRound={resetGame}
              timerDuration={timerDuration}
              onTimerDurationChange={setTimerDuration}
              isGameActive={isGameActive}
              showSettings={showSettings}
              onToggleSettings={handleToggleSettings}
              isCompact={false}
              playerCount={playerCount}
              onPlayerCountChange={setPlayerCount}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;