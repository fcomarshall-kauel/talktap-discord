import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useDiscordMultiplayer } from "@/hooks/useDiscordMultiplayer";
import { useDiscordSDK } from "@/hooks/useDiscordSDK";
import { useThemeRotation } from "@/hooks/useThemeRotation";
import { GameTimer } from "@/components/GameTimer";
import { LetterGrid } from "@/components/LetterGrid";
import { CategoryDisplay } from "@/components/CategoryDisplay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MultiplayerStatus } from "@/components/MultiplayerStatus";
import { Settings, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const MultiplayerIndex = () => {
  const { t } = useLanguage();
  const { 
    gameState, 
    startNewRound, 
    resetGame, 
    selectLetter, 
    isCurrentPlayer,
    getCurrentPlayer,
    isHost,
    isConnected 
  } = useDiscordMultiplayer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  
  // Use theme rotation with current round as trigger
  useThemeRotation(gameState.roundNumber, 4);

  const handleLetterSelect = useCallback((letter: string) => {
    if (!isCurrentPlayer()) return;
    
    selectLetter(letter);
    setTimerKey(prev => prev + 1);
  }, [selectLetter, isCurrentPlayer]);

  const handleTimeout = useCallback(() => {
    // Only host can handle timeout
    if (isHost) {
      resetGame();
    }
  }, [resetGame, isHost]);

  const handleStartGame = useCallback(() => {
    if (!isHost) return;
    startNewRound();
    setTimerKey(prev => prev + 1);
  }, [startNewRound, isHost]);

  const handleStopGame = useCallback(() => {
    if (!isHost) return;
    resetGame();
  }, [resetGame, isHost]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  // Listen for timer reset events from other players
  useEffect(() => {
    const handleTimerReset = () => {
      setTimerKey(prev => prev + 1);
    };

    window.addEventListener('timerReset', handleTimerReset);
    return () => {
      window.removeEventListener('timerReset', handleTimerReset);
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-game p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white mb-2">Basta! Discord</h1>
          <p className="text-white/80">Connecting to Discord...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="min-h-screen bg-gradient-game transition-all duration-1000">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Basta!
            </h1>
            {isHost && (
              <Crown className="h-6 w-6 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button 
              onClick={handleToggleSettings}
              className="p-2 text-white hover:text-white/80 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Multiplayer Status */}
        <div className="mb-6">
          <MultiplayerStatus />
        </div>

        {/* Current Turn Indicator */}
        {gameState.isGameActive && currentPlayer && (
          <div className="mb-4 text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
              isCurrentPlayer() 
                ? 'bg-green-500/20 text-green-100 border border-green-500/30' 
                : 'bg-white/10 text-white/70'
            }`}>
              {isCurrentPlayer() ? (
                <>
                  <span className="font-medium">🎯 {t('multiplayer.yourTurn')}</span>
                </>
              ) : (
                <span className="font-medium">
                  ⏳ Waiting for {currentPlayer.global_name || currentPlayer.username}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className="space-y-6">
          {/* Timer */}
          <div className="flex justify-center">
            <GameTimer
              key={timerKey}
              duration={gameState.timerDuration}
              isRunning={gameState.isGameActive}
              onTimeout={handleTimeout}
              onStartGame={handleStartGame}
              onStopGame={handleStopGame}
            />
          </div>

          {/* Category Display */}
          <CategoryDisplay 
            category={gameState.currentCategory} 
            isActive={gameState.isGameActive}
          />

          {/* Letter Grid */}
          <LetterGrid 
            usedLetters={new Set(gameState.usedLetters)}
            onLetterSelect={handleLetterSelect}
            disabled={!isCurrentPlayer() || !gameState.isGameActive}
          />

          {/* Game Stats */}
          {gameState.usedLetters.length > 0 && (
            <div className="text-center p-4 mx-4 rounded-2xl bg-white/10 backdrop-blur-md">
              <p className="text-sm text-white/70 mb-1">
                {t('game.usedLetters')}
              </p>
              <p className="text-lg font-medium text-white">
                {gameState.usedLetters.join(', ').toUpperCase()}
              </p>
            </div>
          )}

          {/* Host Controls - Only visible to host */}
          {isHost && (
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStartGame}
                disabled={gameState.isGameActive}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t('game.newRound')}
              </Button>
              <Button
                onClick={handleStopGame}
                disabled={!gameState.isGameActive}
                variant="destructive"
              >
                {t('game.stop')}
              </Button>
            </div>
          )}
        </div>

        {/* Settings Overlay */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('game.settings')}</h3>
                <button 
                  onClick={handleToggleSettings}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('game.gameMode')}
                  </p>
                  <p className="font-medium">Discord Multiplayer</p>
                </div>
                
                {isHost && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Host Controls
                    </p>
                    <p className="text-xs text-gray-500">
                      You can start/stop rounds and manage the game.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerIndex;