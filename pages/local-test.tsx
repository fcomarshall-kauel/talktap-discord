import { useState, useCallback, useEffect } from "react";
import { useLanguage, LanguageProvider } from "@/hooks/useLanguage";
import { useSupabaseMultiplayerStandalone } from "@/hooks/useSupabaseMultiplayerStandalone";
import { useThemeRotation } from "@/hooks/useThemeRotation";
import { GameTimer } from "@/components/GameTimer";
import { LetterGrid } from "@/components/LetterGrid";
import { CategoryDisplay } from "@/components/CategoryDisplay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Settings, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const LocalTestContent = () => {
  const { t } = useLanguage();
  const { 
    gameState, 
    startNewRound, 
    resetGame, 
    selectLetter, 
    isCurrentPlayer,
    getCurrentPlayer,
    isHost,
    isConnected,
    participants,
    user
  } = useSupabaseMultiplayerStandalone();
  
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
          <h1 className="text-4xl font-bold text-white mb-2">Basta! Local Test</h1>
          <p className="text-white/80">Connecting...</p>
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
              Basta! Local Test
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

                  {/* Player Info */}
          <div className="mb-6 p-4 bg-white/10 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">Supabase Real-time Test</h2>
            <p className="text-white/80 mb-2">Current Player: {user?.username || 'Loading...'}</p>
            <p className="text-white/80 mb-2">Players: {participants.length}</p>
            <p className="text-white/80 mb-2">Host: {isHost ? 'Yes' : 'No'}</p>
            <p className="text-white/80 mb-2">Using Supabase real-time WebSocket connections!</p>
            <div className="flex gap-2 mt-2">
              <Button 
                onClick={() => {
                  localStorage.removeItem('test-game-host');
                  localStorage.removeItem('test-game-host-expiry');
                  window.location.reload();
                }}
                variant="outline"
                size="sm"
              >
                Reset Host
              </Button>
              {!isHost && (
                <Button 
                  onClick={() => {
                    if (user?.id) {
                      localStorage.setItem('test-game-host', user.id);
                      window.location.reload();
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Become Host
                </Button>
              )}
            </div>
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
          {gameState.isGameActive && (
            <CategoryDisplay category={gameState.currentCategory} />
          )}

          {/* Letter Grid */}
          {gameState.isGameActive && (
            <LetterGrid
              usedLetters={new Set(gameState.usedLetters)}
              onLetterSelect={handleLetterSelect}
              isCurrentPlayer={isCurrentPlayer()}
            />
          )}

          {/* Game Controls */}
          {!gameState.isGameActive && (
            <div className="text-center space-y-4">
              <Button
                onClick={handleStartGame}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
                disabled={!isHost}
              >
                {t('game.startGame')}
              </Button>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-black/20 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Debug Info</h3>
          <div className="text-white/80 text-sm space-y-1">
            <p>Player ID: {user?.id || 'Loading...'}</p>
            <p>Is Host: {isHost ? 'Yes' : 'No'}</p>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Current Player Index: {gameState.currentPlayerIndex}</p>
            <p>Used Letters: {gameState.usedLetters.join(', ')}</p>
            <p>Round: {gameState.roundNumber}</p>
            <p>Game Active: {gameState.isGameActive ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const LocalTest = () => {
  return (
    <LanguageProvider>
      <LocalTestContent />
    </LanguageProvider>
  );
};

export default LocalTest; 