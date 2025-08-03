import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Crown, User, Clock, Play, Square } from "lucide-react";

// Simulated player data
const PLAYER_1 = {
  id: 'test-player-1',
  username: 'Player1',
  global_name: 'Alice',
  avatar: null
};

const PLAYER_2 = {
  id: 'test-player-2', 
  username: 'Player2',
  global_name: 'Bob',
  avatar: null
};

const TEST_INSTANCE_ID = 'game-test-instance';

// Test categories
const categories = [
  { id: "animals", es: "Animales", en: "Animals" },
  { id: "colors", es: "Colores", en: "Colors" },
  { id: "food", es: "Comida", en: "Food" },
  { id: "countries", es: "Países", en: "Countries" }
];

// Game state interface
interface GameState {
  currentCategory: any;
  usedLetters: string[];
  isGameActive: boolean;
  currentPlayerIndex: number;
  roundNumber: number;
  timerDuration: number;
  host: string | null;
}

// Letter grid component
const LetterGrid = ({ usedLetters, onLetterSelect, disabled, currentPlayer }: {
  usedLetters: Set<string>;
  onLetterSelect: (letter: string) => void;
  disabled: boolean;
  currentPlayer: string;
}) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return (
    <div className="grid grid-cols-6 gap-2 max-w-md mx-auto">
      {letters.map((letter) => {
        const isUsed = usedLetters.has(letter);
        return (
          <button
            key={letter}
            onClick={() => !disabled && !isUsed && onLetterSelect(letter)}
            disabled={disabled || isUsed}
            className={`
              aspect-square rounded-lg font-bold text-lg transition-all duration-200
              ${isUsed 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 active:scale-95'
              }
            `}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
};

// Player view component
const PlayerView = ({ 
  player, 
  isHost, 
  gameState, 
  onStartGame, 
  onStopGame, 
  onLetterSelect, 
  isCurrentPlayer,
  otherPlayer
}: {
  player: any;
  isHost: boolean;
  gameState: GameState;
  onStartGame: () => void;
  onStopGame: () => void;
  onLetterSelect: (letter: string) => void;
  isCurrentPlayer: boolean;
  otherPlayer: any;
}) => {
  
  return (
    <div className={`
      border-2 rounded-xl p-6 transition-all duration-300
      ${isCurrentPlayer && gameState.isGameActive 
        ? 'border-green-500 bg-green-50' 
        : 'border-gray-300 bg-white'
      }
    `}>
      {/* Player Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{player.global_name}</h2>
            <p className="text-sm text-gray-600">@{player.username}</p>
          </div>
          {isHost && <Crown className="h-5 w-5 text-yellow-500" />}
        </div>
        
        {/* Turn Indicator */}
        <div className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${isCurrentPlayer && gameState.isGameActive
            ? 'bg-green-500 text-white animate-pulse'
            : gameState.isGameActive
            ? 'bg-gray-200 text-gray-600'
            : 'bg-gray-100 text-gray-500'
          }
        `}>
          {isCurrentPlayer && gameState.isGameActive ? '🎯 Your Turn!' : 
           gameState.isGameActive ? '⏳ Waiting...' : '⏸️ Not Started'}
        </div>
      </div>

      {/* Game Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Round:</span>
            <span className="ml-2 font-medium">{gameState.roundNumber}</span>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <span className="ml-2 font-medium">{gameState.currentCategory?.en || 'None'}</span>
          </div>
          <div>
            <span className="text-gray-600">Used Letters:</span>
            <span className="ml-2 font-medium">{gameState.usedLetters.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className={`ml-2 font-medium ${gameState.isGameActive ? 'text-green-600' : 'text-red-600'}`}>
              {gameState.isGameActive ? 'Active' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            Host Controls
          </h3>
          <div className="flex gap-3">
            <Button
              onClick={onStartGame}
              disabled={gameState.isGameActive}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Round
            </Button>
            <Button
              onClick={onStopGame}
              disabled={!gameState.isGameActive}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Game
            </Button>
          </div>
        </div>
      )}

      {/* Letter Selection */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Select Letter</h3>
        <LetterGrid
          usedLetters={new Set(gameState.usedLetters)}
          onLetterSelect={onLetterSelect}
          disabled={!isCurrentPlayer || !gameState.isGameActive}
          currentPlayer={player.id}
        />
      </div>

      {/* Game Info */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          {isHost ? (
            <>
              <li>• You are the host - start/stop the game</li>
              <li>• Click "Start Round" to begin</li>
            </>
          ) : (
            <>
              <li>• Wait for {otherPlayer.global_name} to start the game</li>
              <li>• You'll get your turn after they select a letter</li>
            </>
          )}
          <li>• Select letters when it's your turn</li>
          <li>• Watch real-time updates from other player!</li>
        </ul>
      </div>
    </div>
  );
};

export default function GameTest() {
  const [gameState, setGameState] = useState<GameState>({
    currentCategory: categories[0],
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    roundNumber: 1,
    timerDuration: 30,
    host: PLAYER_1.id
  });

  const players = [PLAYER_1, PLAYER_2];
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  // Initialize game state in database
  useEffect(() => {
    const initializeGame = async () => {
      if (!supabase) return;

      try {
        // First, try to get existing game state
        const { data: existingState } = await supabase
          .from('game_states')
          .select('*')
          .eq('instance_id', TEST_INSTANCE_ID)
          .single();

        if (existingState) {
          // Update existing state
          const { error } = await supabase
            .from('game_states')
            .update({
              current_category: gameState.currentCategory,
              used_letters: gameState.usedLetters,
              is_game_active: gameState.isGameActive,
              current_player_index: gameState.currentPlayerIndex,
              player_scores: {},
              round_number: gameState.roundNumber,
              timer_duration: gameState.timerDuration,
              host: gameState.host
            })
            .eq('instance_id', TEST_INSTANCE_ID);

          if (error) {
            console.error('Failed to update game state:', error);
          } else {
            console.log('✅ Game state updated');
          }
        } else {
          // Create new state
          const { error } = await supabase
            .from('game_states')
            .insert({
              instance_id: TEST_INSTANCE_ID,
              current_category: gameState.currentCategory,
              used_letters: gameState.usedLetters,
              is_game_active: gameState.isGameActive,
              current_player_index: gameState.currentPlayerIndex,
              player_scores: {},
              round_number: gameState.roundNumber,
              timer_duration: gameState.timerDuration,
              host: gameState.host
            });

          if (error) {
            console.error('Failed to create game state:', error);
          } else {
            console.log('✅ Game state created');
          }
        }

        // Handle participants similarly
        const { data: existingParticipants } = await supabase
          .from('participants')
          .select('user_id')
          .eq('instance_id', TEST_INSTANCE_ID);

        const existingUserIds = existingParticipants?.map(p => p.user_id) || [];

        // Only insert participants that don't exist
        const participantsToInsert = [
          {
            instance_id: TEST_INSTANCE_ID,
            user_id: PLAYER_1.id,
            username: PLAYER_1.username,
            global_name: PLAYER_1.global_name,
            is_host: true
          },
          {
            instance_id: TEST_INSTANCE_ID,
            user_id: PLAYER_2.id,
            username: PLAYER_2.username,
            global_name: PLAYER_2.global_name,
            is_host: false
          }
        ].filter(p => !existingUserIds.includes(p.user_id));

        if (participantsToInsert.length > 0) {
          const { error: participantsError } = await supabase
            .from('participants')
            .insert(participantsToInsert);

          if (participantsError) {
            console.error('Failed to add participants:', participantsError);
          } else {
            console.log('✅ Participants added');
          }
        } else {
          console.log('✅ Participants already exist');
        }

        setConnectionStatus('connected');

      } catch (error) {
        console.error('Initialization error:', error);
        setConnectionStatus('error');
      }
    };

    initializeGame();
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!supabase) return;

    console.log('🔗 Setting up realtime subscriptions...');

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel(`game-events-${TEST_INSTANCE_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `instance_id=eq.${TEST_INSTANCE_ID}`
        },
        (payload) => {
          const event = payload.new as any;
          console.log('🔄 Real-time game event received:', event);

          // Handle different event types
          switch (event.event_type) {
            case 'LETTER_SELECTED':
              setGameState(prev => ({
                ...prev,
                usedLetters: [...prev.usedLetters, event.payload.letter],
                currentPlayerIndex: (prev.currentPlayerIndex + 1) % players.length
              }));
              break;

            case 'ROUND_START':
              setGameState(prev => ({
                ...prev,
                currentCategory: event.payload.category,
                usedLetters: [],
                isGameActive: true,
                currentPlayerIndex: 0,
                roundNumber: prev.roundNumber + 1
              }));
              break;

            case 'GAME_RESET':
              setGameState(prev => ({
                ...prev,
                usedLetters: [],
                isGameActive: false,
                currentPlayerIndex: 0,
                roundNumber: 1
              }));
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game events subscription status:', status);
      });

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel(`game-state-${TEST_INSTANCE_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `instance_id=eq.${TEST_INSTANCE_ID}`
        },
        (payload) => {
          const state = payload.new as any;
          console.log('🔄 Real-time game state update:', state);
          
          setGameState({
            currentCategory: state.current_category,
            usedLetters: state.used_letters,
            isGameActive: state.is_game_active,
            currentPlayerIndex: state.current_player_index,
            roundNumber: state.round_number,
            timerDuration: state.timer_duration,
            host: state.host
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Game state subscription status:', status);
      });

    return () => {
      gameEventsChannel.unsubscribe();
      gameStateChannel.unsubscribe();
    };
  }, []);

  // Broadcast game event
  const broadcastEvent = useCallback(async (eventType: string, payload: any, playerId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('game_events')
        .insert({
          instance_id: TEST_INSTANCE_ID,
          event_type: eventType,
          payload,
          player_id: playerId
        });

      if (error) {
        console.error('Failed to broadcast event:', error);
      } else {
        console.log('✅ Event broadcasted:', eventType);
      }
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }, []);

  // Update game state in database
  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('game_states')
        .update({
          current_category: newState.currentCategory ?? gameState.currentCategory,
          used_letters: newState.usedLetters ?? gameState.usedLetters,
          is_game_active: newState.isGameActive ?? gameState.isGameActive,
          current_player_index: newState.currentPlayerIndex ?? gameState.currentPlayerIndex,
          round_number: newState.roundNumber ?? gameState.roundNumber,
          timer_duration: newState.timerDuration ?? gameState.timerDuration,
          host: newState.host ?? gameState.host
        })
        .eq('instance_id', TEST_INSTANCE_ID);

      if (error) {
        console.error('Failed to update game state:', error);
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  }, [gameState]);

  // Game actions for Player 1
  const player1Actions = {
    startGame: () => {
      const newCategory = categories[Math.floor(Math.random() * categories.length)];
      broadcastEvent('ROUND_START', { category: newCategory }, PLAYER_1.id);
      updateGameState({
        currentCategory: newCategory,
        usedLetters: [],
        isGameActive: true,
        currentPlayerIndex: 0,
        roundNumber: gameState.roundNumber + 1
      });
    },
    
    stopGame: () => {
      broadcastEvent('GAME_RESET', {}, PLAYER_1.id);
      updateGameState({
        usedLetters: [],
        isGameActive: false,
        currentPlayerIndex: 0
      });
    },
    
    selectLetter: (letter: string) => {
      if (gameState.currentPlayerIndex === 0 && gameState.isGameActive) {
        broadcastEvent('LETTER_SELECTED', { letter }, PLAYER_1.id);
        updateGameState({
          usedLetters: [...gameState.usedLetters, letter],
          currentPlayerIndex: 1
        });
      }
    }
  };

  // Game actions for Player 2
  const player2Actions = {
    startGame: () => {}, // Player 2 can't start
    stopGame: () => {},  // Player 2 can't stop
    
    selectLetter: (letter: string) => {
      if (gameState.currentPlayerIndex === 1 && gameState.isGameActive) {
        broadcastEvent('LETTER_SELECTED', { letter }, PLAYER_2.id);
        updateGameState({
          usedLetters: [...gameState.usedLetters, letter],
          currentPlayerIndex: 0
        });
      }
    }
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to realtime...</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">❌ Connection Error</p>
          <p className="text-gray-600">Check your Supabase configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎮 2-Player Realtime Test</h1>
          <p className="text-gray-600">
            Test real-time synchronization between two simulated players
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Realtime Connected
          </div>
        </div>

        {/* Game Flow Instructions */}
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Test Flow</h2>
          <ol className="space-y-2 text-blue-800">
            <li><strong>1.</strong> Player 1 (Alice) clicks "Start Round"</li>
            <li><strong>2.</strong> Both players see the game start in real-time</li>
            <li><strong>3.</strong> Player 1 selects a letter</li>
            <li><strong>4.</strong> Turn automatically switches to Player 2 (Bob)</li>
            <li><strong>5.</strong> Player 2 selects a letter</li>
            <li><strong>6.</strong> Turn switches back to Player 1</li>
            <li><strong>7.</strong> Continue until Player 1 stops the game</li>
          </ol>
        </div>

        {/* Two Player Views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player 1 View */}
          <PlayerView
            player={PLAYER_1}
            isHost={true}
            gameState={gameState}
            onStartGame={player1Actions.startGame}
            onStopGame={player1Actions.stopGame}
            onLetterSelect={player1Actions.selectLetter}
            isCurrentPlayer={gameState.currentPlayerIndex === 0}
            otherPlayer={PLAYER_2}
          />

          {/* Player 2 View */}
          <PlayerView
            player={PLAYER_2}
            isHost={false}
            gameState={gameState}
            onStartGame={player2Actions.startGame}
            onStopGame={player2Actions.stopGame}
            onLetterSelect={player2Actions.selectLetter}
            isCurrentPlayer={gameState.currentPlayerIndex === 1}
            otherPlayer={PLAYER_1}
          />
        </div>

        {/* Game Log */}
        <div className="mt-8 p-6 bg-white rounded-xl border">
          <h2 className="text-xl font-semibold mb-4">📋 Game Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{gameState.roundNumber}</div>
              <div className="text-sm text-gray-600">Round</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{gameState.usedLetters.length}</div>
              <div className="text-sm text-gray-600">Letters Used</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {players[gameState.currentPlayerIndex]?.global_name || 'None'}
              </div>
              <div className="text-sm text-gray-600">Current Turn</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${gameState.isGameActive ? 'text-green-600' : 'text-red-600'}`}>
                {gameState.isGameActive ? 'Active' : 'Stopped'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
          
          {gameState.usedLetters.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Used Letters:</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.usedLetters.map((letter, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}