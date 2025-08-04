import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useWebMultiplayer } from "@/hooks/useWebMultiplayer";
import { GameTimer } from "@/components/GameTimer";
import { LetterGrid } from "@/components/LetterGrid";
import { CategoryDisplay } from "@/components/CategoryDisplay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Settings, Crown, Users, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Game = () => {
  const { t } = useLanguage();
    const {
    players,
    gameState,
    currentPlayer,
    isHost,
    isConnected,
    connectionStatus,
    startNewRound,
    resetGame,
    selectLetter,
    handleTimerTimeout,
    getCurrentPlayer,
    isCurrentPlayer,
    showLeaveWarning,
    handleConfirmLeave,
    handleCancelLeave,
    setShowLeaveWarning,
    changePlayerName,
    localLosingPlayer,
    losingHistory
  } = useWebMultiplayer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState(currentPlayer?.global_name || '');
  const [showOverlay, setShowOverlay] = useState(false);

  // Auto-hide overlay after 5 seconds
  useEffect(() => {
    if (localLosingPlayer) {
      setShowOverlay(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
    }
  }, [localLosingPlayer]);

  const handleLetterSelect = useCallback(async (letter: string) => {
    await selectLetter(letter);
  }, [selectLetter]);

  const handleNameChange = useCallback(async () => {
    if (!newPlayerName.trim() || newPlayerName.trim() === currentPlayer?.global_name) {
      setShowNameEdit(false);
      return;
    }

    const success = await changePlayerName(newPlayerName.trim());
    if (success) {
      setShowNameEdit(false);
      setNewPlayerName('');
      setShowSettings(false); // Close settings window after successful name change
    }
  }, [newPlayerName, currentPlayer?.global_name, changePlayerName]);

  const handleEditName = useCallback(() => {
    setNewPlayerName(currentPlayer?.global_name || '');
    setShowNameEdit(true);
  }, [currentPlayer?.global_name]);
  
  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col safe-area-inset">
      {/* Header */}
      <div className="relative text-center py-4 px-4">
        <div className="absolute top-4 left-4">
          <LanguageToggle />
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Talk & Tap! </h1>
        <p className="text-sm text-white mt-4 mb-4">Say a word and touch its first letter</p>
        
        {/* Category Display */}
        <CategoryDisplay 
          category={gameState.currentCategory} 
          isActive={gameState.isGameActive} 
        />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col justify-start px-4 space-y-4 max-w-sm mx-auto w-full pb-safe">
        
        {/* Timer with integrated start button */}
        <div className="flex justify-center">
          <GameTimer
            duration={timerDuration}
            isRunning={gameState.isGameActive}
            currentPlayerId={players[gameState.currentPlayerIndex]?.id}
            onTimeout={handleTimerTimeout}
            onStartGame={startNewRound}
            onStopGame={resetGame}
            isMyTurn={isCurrentPlayer()}
            isHost={isHost}
          />
        </div>

        {/* Letter Grid */}
        <div className="flex justify-center">
          <LetterGrid
            usedLetters={gameState.usedLetters}
            onLetterSelect={handleLetterSelect}
            disabled={!gameState.isGameActive}
            isMyTurn={isCurrentPlayer()}
          />
        </div>

        {/* Losing Message Overlay */}
        {localLosingPlayer && showOverlay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="text-center p-8 bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-400/40 rounded-2xl shadow-2xl animate-pulse max-w-md mx-auto backdrop-blur-sm">
              {localLosingPlayer.id === currentPlayer?.id ? (
                <div className="space-y-4">
                  <div className="text-6xl mb-4 animate-bounce">😭</div>
                  <h3 className="text-2xl font-bold text-red-400">⏰ Time's Up!</h3>
                  <p className="text-base text-red-300 mb-4">You ran out of time! Better luck next round!</p>
                  <div className="text-sm text-red-400/70 bg-red-500/10 px-4 py-2 rounded-full">
                    💡 Tip: Try to think faster next time!
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl mb-4 animate-bounce">🎉</div>
                  <h3 className="text-2xl font-bold text-red-400">💀 {localLosingPlayer.name} Lost!</h3>
                  <p className="text-base text-red-300 mb-4">They ran out of time!</p>
                  <div className="text-sm text-red-400/70 bg-green-500/10 px-4 py-2 rounded-full">
                    🏆 You survived this round!
                  </div>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-red-400/20">
                <p className="text-sm text-red-400/60">
                  {isHost ? "Click 'Start New Round' to continue!" : "Wait for the host to start a new round."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Non-loser Message (shows after overlay disappears) */}
        {localLosingPlayer && localLosingPlayer.id !== currentPlayer?.id && (
          <div className="text-center p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border-2 border-green-400/40 rounded-xl shadow-lg animate-pulse">
            <div className="space-y-2">
              <div className="text-2xl animate-bounce">🎉</div>
              <h3 className="text-lg font-bold text-green-400">💀 {localLosingPlayer.name} Lost!</h3>
              <p className="text-sm text-green-300">They ran out of time!</p>
              <div className="text-xs text-green-400/70 bg-green-500/10 px-3 py-1 rounded-full">
                🏆 You survived this round!
              </div>
            </div>
          </div>
        )}



        {/* Connected Players */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/80 font-medium">Players</span>
            <Badge variant="secondary" className="text-xs">
              {players.length}
            </Badge>
          </div>
          
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            {/* Current Player */}
            {currentPlayer && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-white/60 font-medium">You</span>
                <button
                  onClick={handleEditName}
                  className={`bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-2 border-white/40 rounded-xl p-2 shadow-lg transition-all hover:from-blue-500/40 hover:to-purple-500/40 hover:border-white/60 relative ${
                    gameState.isGameActive && isCurrentPlayer() ? 'ring-4 ring-yellow-400/50 animate-pulse' : ''
                  }`}
                  title="Click to edit your name"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {currentPlayer.global_name.charAt(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-semibold text-sm">
                        {currentPlayer.global_name}
                      </span>
                      {currentPlayer.is_host && (
                        <Crown className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  {/* Red X marks for losing history */}
                  {losingHistory[currentPlayer.id] > 0 && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {Array.from({ length: Math.min(losingHistory[currentPlayer.id], 3) }).map((_, index) => (
                        <span key={index} className="text-red-500 text-xs">❌</span>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Other Players - 2-row grid */}
            {players.filter(p => p.id !== currentPlayer?.id).length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {players
                  .filter(player => player.id !== currentPlayer?.id)
                  .map((player) => (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all relative ${
                        gameState.isGameActive && player.id === players[gameState.currentPlayerIndex]?.id
                          ? 'bg-yellow-500/30 border-yellow-400/50 ring-2 ring-yellow-400/30 animate-pulse'
                          : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {player.global_name.charAt(0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white font-medium truncate max-w-12">
                          {player.global_name}
                        </span>
                        {player.is_host && (
                          <Crown className="w-2.5 h-2.5 text-yellow-400" />
                        )}
                      </div>
                      {/* Red X marks for losing history */}
                      {losingHistory[player.id] > 0 && (
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                          {Array.from({ length: Math.min(losingHistory[player.id], 3) }).map((_, index) => (
                            <span key={index} className="text-red-500 text-xs">❌</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
          
          {gameState.isGameActive && (
            <div className="text-sm text-white/80">
              Current Turn: {isCurrentPlayer() ? "You" : players[gameState.currentPlayerIndex]?.global_name}
            </div>
          )}
        </div>
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-gradient-secondary p-6 rounded-2xl shadow-game max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
            <div className="space-y-4">
              {/* Player Name Change */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleNameChange()}
                  />
                  <Button
                    onClick={handleNameChange}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Change your display name in the game.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Timer Duration (seconds)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value) || 10)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>
                <p className="text-xs text-gray-500">
                  Set the timer duration for each round. Only the host can change this.
                </p>
              </div>
              
              {/* Game Controls */}
              <div className="space-y-3 pt-4 border-t">
                {isHost && (
                  <Button 
                    onClick={startNewRound}
                    disabled={!isConnected || gameState.isGameActive}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    Start New Round
                  </Button>
                )}
                {isHost && (
                  <Button 
                    onClick={resetGame}
                    variant="outline"
                    className="w-full"
                  >
                    Reset Game
                  </Button>
                )}
                <Button 
                  onClick={() => setShowLeaveWarning(true)}
                  variant="destructive"
                  className="w-full"
                >
                  Leave Game
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Warning Modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Leave Game?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to leave the game? You will be disconnected from the multiplayer session.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleCancelLeave}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmLeave}
                variant="destructive"
                className="flex-1"
              >
                Leave Game
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game; 