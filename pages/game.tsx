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
    changePlayerName
  } = useWebMultiplayer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState(currentPlayer?.global_name || '');

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
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {connectionStatus === 'connected' ? "Connected" : 
             connectionStatus === 'connecting' ? "Connecting..." :
             connectionStatus === 'polling' ? "Polling" : "Disconnected"}
          </Badge>
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
        <h1 className="text-3xl font-bold text-foreground mb-1">Basta! Multiplayer</h1>
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
          />
        </div>

        {/* Letter Grid */}
        <div className="flex justify-center">
          <LetterGrid
            usedLetters={gameState.usedLetters}
            onLetterSelect={handleLetterSelect}
            disabled={!gameState.isGameActive}
          />
        </div>

        {/* Game Stats */}
        {gameState.isGameActive && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Letters Used: {gameState.usedLetters.length}/26
            </p>
          </div>
        )}

        {/* Connected Players */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-medium">Connected Players</span>
            <Badge variant="secondary" className="text-xs">
              {players.length}
            </Badge>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
            {players.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  player.id === currentPlayer?.id 
                    ? 'bg-white/20 border-white/30 shadow-sm' 
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {player.global_name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    player.is_online ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white font-medium truncate max-w-16">
                    {player.global_name}
                  </span>
                  {player.is_host && (
                    <Crown className="w-3 h-3 text-yellow-400" />
                  )}
                  {isCurrentPlayer() && player.id === currentPlayer?.id && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-blue-200 font-medium">(You)</span>
                      <button
                        onClick={handleEditName}
                        className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                        title="Edit your name"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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