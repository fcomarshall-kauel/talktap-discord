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
    setShowLeaveWarning
  } = useWebMultiplayer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);

  const handleLetterSelect = useCallback(async (letter: string) => {
    await selectLetter(letter);
  }, [selectLetter]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Basta! Multiplayer
            </h1>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-3">
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
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Players */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Players</h2>
                <Badge variant="secondary" className="ml-auto">
                  {players.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div 
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      player.id === currentPlayer?.id 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {player.global_name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        player.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {player.global_name}
                        </span>
                        {player.is_host && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                        {isCurrentPlayer() && player.id === currentPlayer?.id && (
                          <Badge variant="outline" size="sm">You</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.is_online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Game Controls</h3>
              <div className="space-y-3">
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

          {/* Main Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Game Status */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">Game Status</h2>
                  {isHost && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Host
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Round {gameState.roundNumber}</span>
                  </div>
                  <Badge variant="outline">
                    {gameState.isGameActive ? "Active" : "Waiting"}
                  </Badge>
                </div>
              </div>
              
              {/* Current Turn */}
              {gameState.isGameActive && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {players[gameState.currentPlayerIndex]?.global_name.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Current Turn</div>
                        <div className="font-semibold">
                          {isCurrentPlayer() ? "Your turn!" : `${players[gameState.currentPlayerIndex]?.global_name}'s turn`}
                        </div>
                      </div>
                    </div>
                    <GameTimer 
                      duration={timerDuration}
                      isRunning={gameState.isGameActive}
                      currentPlayerId={players[gameState.currentPlayerIndex]?.id}
                      onTimeout={handleTimerTimeout}
                      onStartGame={() => {}}
                      onStopGame={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* Round Ended Message */}
              {!gameState.isGameActive && gameState.roundNumber > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-800">Round Ended</h3>
                      <p className="text-sm text-yellow-700">
                        {isHost ? "Click 'Start New Round' to continue!" : "Wait for the host to start a new round."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category Display */}
            {gameState.isGameActive && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-lg">
                <CategoryDisplay 
                  category={gameState.currentCategory} 
                  isActive={gameState.isGameActive}
                />
              </div>
            )}

            {/* Letter Grid */}
            {gameState.isGameActive && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Select a Letter</h3>
                <LetterGrid 
                  onLetterSelect={handleLetterSelect}
                  usedLetters={gameState.usedLetters}
                />
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
                <div className="space-y-4">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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