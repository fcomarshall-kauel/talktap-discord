import { useCallback, useEffect, useState, useRef } from 'react';
import { useDiscordSDK } from './useDiscordSDK';
import { Category } from '@/data/categories';

interface LocalGameState {
  currentCategory: Category;
  usedLetters: string[];
  isGameActive: boolean;
  currentPlayerIndex: number;
  playerScores: Record<string, number>;
  roundNumber: number;
  timerDuration: number;
  host: string | null;
  lastAction: {
    type: string;
    playerId: string;
    timestamp: number;
    payload: any;
  } | null;
  syncTimestamp: number;
}

export const useDiscordMultiplayer = () => {
  const { user, participants, isHost, instanceId, isConnected, discordSdk } = useDiscordSDK();
  const [gameState, setGameState] = useState<LocalGameState>({
    currentCategory: { id: "animals", es: "Animales", en: "Animals" },
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    playerScores: {},
    roundNumber: 1,
    timerDuration: 30,
    host: null,
    lastAction: null,
    syncTimestamp: Date.now()
  });

  const lastSyncRef = useRef<number>(Date.now());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Discord SDK event handling for pure Discord gameplay
  useEffect(() => {
    if (!discordSdk || !user || !isConnected) {
      console.log('⚠️ Cannot setup Discord events:', { 
        hasDiscordSdk: !!discordSdk, 
        hasUser: !!user, 
        isConnected 
      });
      return;
    }

    console.log('🎮 Setting up hybrid Discord event system for gameplay');

    // Subscribe to Discord SDK events
    try {
      // Listen for activity instance updates
      discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (data) => {
        console.log('👥 Discord participants update in game:', data);
        // This will trigger participant sync automatically
      });
      
      console.log('✅ Hybrid Discord event system set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up Discord event system:', error);
    }

    // Set up periodic sync for real-time updates
    const startSyncPolling = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(async () => {
        await syncGameState();
      }, 3000); // Poll every 3 seconds
    };

    startSyncPolling();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [discordSdk, user, isConnected]);

  // Sync game state with other players
  const syncGameState = useCallback(async () => {
    if (!discordSdk || !isConnected || !instanceId) return;

    try {
      // Get current activity state to detect changes
      const currentTime = Date.now();
      
      // Check if we need to sync based on timestamp
      if (currentTime - lastSyncRef.current > 5000) { // Sync every 5 seconds
        console.log('🔄 Checking for Discord activity changes...');
        
        // Update our local sync timestamp
        setGameState(prev => ({
          ...prev,
          syncTimestamp: currentTime
        }));
        
        lastSyncRef.current = currentTime;
      }
    } catch (error) {
      console.log('⚠️ Sync check failed:', error);
    }
  }, [discordSdk, isConnected, instanceId]);

  // Handle game events from Discord
  const handleGameEvent = useCallback((event: any) => {
    console.log('🎮 Processing Discord game event:', event.type, event.payload);
    
    switch (event.type) {
      case 'LETTER_SELECTED':
        if (event.playerId !== user?.id) {
          console.log('📝 Letter selected by another player via Discord:', event.payload.letter);
          setGameState(prev => ({
            ...prev,
            usedLetters: [...prev.usedLetters, event.payload.letter],
            currentPlayerIndex: (prev.currentPlayerIndex + 1) % participants.length,
            lastAction: {
              type: 'LETTER_SELECTED',
              playerId: event.playerId,
              timestamp: Date.now(),
              payload: event.payload
            }
          }));
          window.dispatchEvent(new CustomEvent('timerReset'));
        }
        break;

      case 'ROUND_START':
        console.log('🎮 Round started by host via Discord:', event.payload.category);
        setGameState(prev => ({
          ...prev,
          currentCategory: event.payload.category,
          usedLetters: [],
          isGameActive: true,
          currentPlayerIndex: 0,
          roundNumber: prev.roundNumber + 1,
          lastAction: {
            type: 'ROUND_START',
            playerId: event.playerId,
            timestamp: Date.now(),
            payload: event.payload
          }
        }));
        break;

      case 'GAME_RESET':
        console.log('🔄 Game reset by host via Discord');
        setGameState(prev => ({
          ...prev,
          usedLetters: [],
          isGameActive: false,
          currentPlayerIndex: 0,
          roundNumber: 1,
          playerScores: participants.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>),
          lastAction: {
            type: 'GAME_RESET',
            playerId: event.playerId,
            timestamp: Date.now(),
            payload: event.payload
          }
        }));
        break;
    }
  }, [user, participants]);

  // Broadcast game event via Discord activity and local state
  const broadcastDiscordEvent = useCallback(async (eventType: string, payload: any) => {
    if (!discordSdk || !user || !isConnected) return;

    try {
      console.log('📡 Broadcasting Discord game event:', eventType, payload);
      
      // Update local state immediately for instant feedback
      const newAction = {
        type: eventType,
        playerId: user.id,
        timestamp: Date.now(),
        payload
      };
      
      setGameState(prev => ({
        ...prev,
        lastAction: newAction
      }));
      
      // Update Discord activity for display and to signal other players
      await discordSdk.commands.setActivity({
        activity: {
          type: 0, // Playing
          details: eventType === 'ROUND_START' 
            ? `Category: ${payload.category?.en || 'Unknown'}`
            : `Letters used: ${gameState.usedLetters.length}/26`,
          state: `Round ${gameState.roundNumber}`,
          timestamps: {
            start: Date.now()
          }
        }
      });

      console.log('✅ Discord game event broadcasted successfully');
      
      // Force immediate sync for other players
      setTimeout(() => {
        syncGameState();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to broadcast Discord game event:', error);
    }
  }, [discordSdk, user, isConnected, gameState, instanceId, participants, syncGameState]);

  // Game actions using hybrid Discord events
  const startNewRound = useCallback(() => {
    if (!isHost) {
      console.log('⚠️ Non-host Discord user tried to start round');
      return;
    }

    console.log('🎮 Discord host starting new round');
    
    const allCategories = [
      { id: "animals", es: "Animales", en: "Animals" },
      { id: "food", es: "Comida", en: "Food" },
      { id: "countries", es: "Países", en: "Countries" },
      { id: "professions", es: "Profesiones", en: "Professions" },
      { id: "colors", es: "Colores", en: "Colors" }
    ];
    const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];

    const newState = {
      currentCategory: randomCategory,
      usedLetters: [],
      isGameActive: true,
      currentPlayerIndex: 0,
      roundNumber: gameState.roundNumber + 1
    };

    console.log('🔄 Discord round state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    // Broadcast via Discord activity
    broadcastDiscordEvent('ROUND_START', { category: randomCategory });
  }, [isHost, gameState.roundNumber, broadcastDiscordEvent]);

  const selectLetter = useCallback(async (letter: string) => {
    if (!user || gameState.usedLetters.includes(letter)) {
      console.log('⚠️ Discord user cannot select letter:', letter, 'Reason: Already used or no user');
      return;
    }

    const currentPlayer = participants[gameState.currentPlayerIndex];
    if (currentPlayer?.id !== user.id) {
      console.log('⚠️ Discord user tried to select letter out of turn:', letter);
      return;
    }

    console.log('🎯 Discord user selecting letter:', letter, 'for instance:', instanceId, 'user:', user.id);

    const newState = {
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % participants.length
    };

    console.log('🔄 Discord letter selection state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    // Broadcast via Discord activity
    broadcastDiscordEvent('LETTER_SELECTED', { letter });
  }, [user, gameState, participants, instanceId, broadcastDiscordEvent]);

  const resetGame = useCallback(() => {
    if (!isHost) {
      console.log('⚠️ Non-host Discord user tried to reset game');
      return;
    }

    console.log('🔄 Discord host resetting game');
    
    const resetScores = participants.reduce((acc, p) => {
      acc[p.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    const newState = {
      usedLetters: [],
      isGameActive: false,
      currentPlayerIndex: 0,
      roundNumber: 1,
      playerScores: resetScores
    };

    console.log('🔄 Discord reset state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    // Broadcast via Discord activity
    broadcastDiscordEvent('GAME_RESET', {});
  }, [isHost, participants, broadcastDiscordEvent]);

  const getCurrentPlayer = useCallback(() => {
    return participants[gameState.currentPlayerIndex];
  }, [participants, gameState.currentPlayerIndex]);

  const isCurrentPlayer = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer?.id === user?.id;
  }, [getCurrentPlayer, user?.id]);

  // Manual sync function for Discord activities
  const syncWithDiscordActivity = useCallback(async () => {
    if (!discordSdk || !isConnected) return;
    
    try {
      console.log('🔄 Manual sync with Discord activity...');
      await syncGameState();
      console.log('✅ Manual sync completed');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
    }
  }, [discordSdk, isConnected, syncGameState]);

  return {
    gameState,
    startNewRound,
    resetGame,
    selectLetter,
    getCurrentPlayer,
    isCurrentPlayer,
    syncWithDiscordActivity,
    participants,
    isHost,
    isConnected,
    user
  };
}; 