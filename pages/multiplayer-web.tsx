import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useWebMultiplayer } from "@/hooks/useWebMultiplayer";
import { GameTimer } from "@/components/GameTimer";
import { LetterGrid } from "@/components/LetterGrid";
import { CategoryDisplay } from "@/components/CategoryDisplay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WebMultiplayerStatus } from "@/components/WebMultiplayerStatus";
import { Settings, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MultiplayerWeb = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Basta! Web Multiplayer</h1>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowLeaveWarning(true)}
            >
              Leave Game
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Status */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Game Status</h2>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Host
                    </Badge>
                  )}
                  <Badge variant={isConnected ? "default" : "destructive"}>
                    {connectionStatus === 'connected' ? "Connected" : 
                     connectionStatus === 'connecting' ? "Connecting..." :
                     connectionStatus === 'polling' ? "Polling" : "Disconnected"}
                  </Badge>
                  {!isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-xs"
                    >
                      🔄 Reconnect
                    </Button>
        )}
      </div>
    </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Round:</span>
                  <span className="ml-2 font-medium">{gameState.roundNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Letters Used:</span>
                  <span className="ml-2 font-medium">{gameState.usedLetters.length}/26</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Players:</span>
                  <span className="ml-2 font-medium">{players.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Game Active:</span>
                  <span className="ml-2 font-medium">{gameState.isGameActive ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            {/* Category Display */}
            {gameState.isGameActive && (
              <CategoryDisplay category={gameState.currentCategory} isActive={gameState.isGameActive} />
            )}

            {/* Letter Grid */}
            <LetterGrid
              usedLetters={new Set(gameState.usedLetters)}
              onLetterSelect={handleLetterSelect}
              disabled={!isCurrentPlayer() || !gameState.isGameActive}
            />

            {/* Game Controls */}
            <div className="flex items-center justify-center gap-4">
              {isHost && (
                <>
                  <Button
                    onClick={startNewRound}
                    disabled={gameState.isGameActive}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Start New Round
                  </Button>
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Reset Game
                  </Button>
                </>
              )}
            </div>

            {/* Timer */}
            {gameState.isGameActive && (
              <div className="flex flex-col items-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {isCurrentPlayer() ? "Your turn!" : `${players[gameState.currentPlayerIndex]?.global_name}'s turn`}
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
            )}

            {/* Round End Message */}
            {!gameState.isGameActive && gameState.roundNumber > 0 && (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Round Ended</h3>
                <p className="text-sm text-yellow-700">
                  The round has ended. {isHost ? "Click 'Start New Round' to continue!" : "Wait for the host to start a new round."}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Multiplayer Status */}
            <WebMultiplayerStatus
              players={players}
              currentPlayer={currentPlayer}
              isHost={isHost}
              isConnected={isConnected}
              getCurrentPlayer={getCurrentPlayer}
              isCurrentPlayer={isCurrentPlayer}
            />

            {/* Settings */}
            {showSettings && (
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
                
                {/* Timer Duration Setting */}
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium">Timer Duration (seconds)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(parseInt(e.target.value) || 10)}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-xs text-muted-foreground">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the timer duration for each round. Only the host can change this.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Debug Info</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Your ID:</span>
                      <span className="ml-2 font-mono">{currentPlayer?.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Player Index:</span>
                      <span className="ml-2">{gameState.currentPlayerIndex}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Is Current Player:</span>
                      <span className="ml-2">{isCurrentPlayer() ? "Yes" : "No"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Is Host:</span>
                      <span className="ml-2">{isHost ? "Yes" : "No"}</span>
                    </div>
                  </div>

                  {/* Debug Actions */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Debug Actions</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (typeof window !== 'undefined') {
                            const { supabase } = await import('@/lib/supabase');
                            if (supabase) {
                              const { error } = await supabase
                                .from('web_players')
                                .update({ is_online: false })
                                .lt('last_seen', new Date(Date.now() - 1 * 60 * 1000).toISOString());

        if (error) {
                                console.error('Cleanup error:', error);
          } else {
                                console.log('✅ Manual cleanup completed');
                                window.location.reload();
                              }
                            }
                          }
                        }}
                        className="w-full"
                      >
                        🧹 Clean Up Old Players
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (typeof window !== 'undefined') {
                            const { supabase } = await import('@/lib/supabase');
                            if (supabase) {
                              // Delete all players and start fresh
            const { error } = await supabase
                                .from('web_players')
              .delete()
                                .neq('id', 'dummy');

      if (error) {
                                console.error('Reset error:', error);
      } else {
                                console.log('✅ Database reset completed');
                                window.location.reload();
                              }
                            }
                          }
                        }}
                        className="w-full"
                      >
                        🔄 Reset Database
                </Button>
                <Button
                        variant="outline"
                        size="sm"
                  onClick={() => window.location.reload()}
                        className="w-full"
                >
                  🔄 Refresh Page
                </Button>
              </div>
            </div>
          </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Warning Modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Leave Game?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to leave? Player "{currentPlayer?.global_name}" will be disconnected from the game.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelLeave}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmLeave}
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

export default MultiplayerWeb;