import { useState, useCallback, useEffect } from 'react';
import { useDiscordSDK } from './useDiscordSDK';
import { Category } from '@/data/categories';

export interface GameState {
  currentCategory: Category;
  usedLetters: string[];
  isGameActive: boolean;
  currentPlayerIndex: number;
  playerScores: Record<string, number>;
  roundNumber: number;
  timerDuration: number;
  host: string | null;
}

interface GameEvent {
  type: 'LETTER_SELECTED' | 'ROUND_START' | 'GAME_RESET' | 'TIMER_UPDATE' | 'PLAYER_JOIN' | 'PLAYER_LEAVE';
  payload: any;
  timestamp: number;
  playerId: string;
}

export const useMultiplayerGame = () => {
  const { discordSdk, user, participants, isHost, isConnected } = useDiscordSDK();
  
  const [gameState, setGameState] = useState<GameState>({
    currentCategory: { id: "animals", es: "Animales", en: "Animals" },
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    playerScores: {},
    roundNumber: 1,
    timerDuration: 30,
    host: null
  });

  // Initialize game state when participants change
  useEffect(() => {
    if (participants.length > 0 && isHost) {
      const initialScores = participants.reduce((acc, p) => {
        acc[p.id] = 0;
        return acc;
      }, {} as Record<string, number>);

      setGameState(prev => ({
        ...prev,
        playerScores: initialScores,
        host: participants[0]?.id || null
      }));
    }
  }, [participants, isHost]);

  // Broadcast game event to all participants using Discord Activity state text
  const broadcastEvent = useCallback(async (event: GameEvent) => {
    if (!discordSdk || !isHost) return;

    try {
      console.log('Broadcasting event via Discord Activity:', event.type);
      
      // Encode game state in the activity state text
      const encodedState = btoa(JSON.stringify({
        event: event,
        gameState: {
          currentCategory: gameState.currentCategory,
          usedLetters: gameState.usedLetters,
          isGameActive: gameState.isGameActive,
          currentPlayerIndex: gameState.currentPlayerIndex,
          roundNumber: gameState.roundNumber
        },
        timestamp: Date.now()
      }));

      const activityState = {
        details: 'Playing Basta!',
        state: `${gameState.currentCategory.en} | ${encodedState.slice(-100)}`, // Use last part of encoded string
        party: {
          id: 'basta-game',
          size: [participants.length, 8]
        },
        instance: true,
        timestamps: {
          start: Date.now()
        }
      };

      await discordSdk.commands.setActivity({
        activity: activityState
      });
      
      // Use Discord's instanceId for proper multiplayer sync
      if (discordSdk?.instanceId) {
        const gameData = {
          instanceId: discordSdk.instanceId,
          event: event,
          gameState: {
            currentCategory: gameState.currentCategory,
            usedLetters: gameState.usedLetters,
            isGameActive: gameState.isGameActive,
            currentPlayerIndex: gameState.currentPlayerIndex,
            roundNumber: gameState.roundNumber
          },
          timestamp: Date.now()
        };
        
        console.log('Broadcasting to instance:', discordSdk.instanceId, event.type);
        
        // For now, store in sessionStorage with instanceId as key
        // Later we'll replace this with Discord proxy API calls
        sessionStorage.setItem(`basta-${discordSdk.instanceId}`, JSON.stringify(gameData));
        
        // Trigger storage event for same-origin communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: `basta-${discordSdk.instanceId}`,
          newValue: JSON.stringify(gameData)
        }));
      }
      
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }, [discordSdk, isHost, gameState, participants]);

  // Handle events from other players
  const handleRemoteEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case 'LETTER_SELECTED':
        setGameState(prev => ({
          ...prev,
          usedLetters: [...prev.usedLetters, event.payload.letter],
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % participants.length
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
          roundNumber: 1,
          playerScores: participants.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>)
        }));
        break;
    }
  }, [participants.length]);

  // Listen for game events via storage events (using instanceId)
  useEffect(() => {
    if (!user || !discordSdk?.instanceId) return;
    
    const instanceKey = `basta-${discordSdk.instanceId}`;
    console.log('Listening for events on instance:', discordSdk.instanceId);
    
    const handleStorageEvent = (event: StorageEvent) => {
      try {
        if (event.key === instanceKey && event.newValue) {
          const gameData = JSON.parse(event.newValue);
          console.log('Received storage event for instance:', gameData.instanceId);
          
          if (gameData.event && gameData.event.playerId !== user.id) {
            console.log('Processing remote game event:', gameData.event.type, 'from player:', gameData.event.playerId);
            handleRemoteEvent(gameData.event);
          }
        }
      } catch (error) {
        console.error('Error processing storage event:', error);
      }
    };
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageEvent);
    
    // Also check for existing data on mount
    const existingData = sessionStorage.getItem(instanceKey);
    if (existingData) {
      try {
        const gameData = JSON.parse(existingData);
        if (gameData.event && gameData.event.playerId !== user.id) {
          console.log('Processing existing game event:', gameData.event.type);
          handleRemoteEvent(gameData.event);
        }
      } catch (error) {
        console.log('No valid existing game data');
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [user, discordSdk?.instanceId, handleRemoteEvent]);

  // Host-only actions
  const startNewRound = useCallback(() => {
    if (!isHost) return;

    // Import categories locally to avoid circular dependency
    const allCategories = [
      { id: "animals", es: "Animales", en: "Animals" },
      { id: "food", es: "Comida", en: "Food" },
      { id: "countries", es: "Países", en: "Countries" },
      { id: "professions", es: "Profesiones", en: "Professions" },
      { id: "colors", es: "Colores", en: "Colors" }
    ];
    const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
    const event: GameEvent = {
      type: 'ROUND_START',
      payload: { category: randomCategory },
      timestamp: Date.now(),
      playerId: user?.id || ''
    };

    setGameState(prev => ({
      ...prev,
      currentCategory: randomCategory,
      usedLetters: [],
      isGameActive: true,
      currentPlayerIndex: 0,
      roundNumber: prev.roundNumber + 1
    }));

    broadcastEvent(event);
  }, [isHost, user?.id, broadcastEvent]);

  const resetGame = useCallback(() => {
    if (!isHost) return;

    const event: GameEvent = {
      type: 'GAME_RESET',
      payload: {},
      timestamp: Date.now(),
      playerId: user?.id || ''
    };

    const resetScores = participants.reduce((acc, p) => {
      acc[p.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    setGameState(prev => ({
      ...prev,
      usedLetters: [],
      isGameActive: false,
      currentPlayerIndex: 0,
      roundNumber: 1,
      playerScores: resetScores
    }));

    broadcastEvent(event);
  }, [isHost, user?.id, participants, broadcastEvent]);

  // Any player can select a letter
  const selectLetter = useCallback(async (letter: string) => {
    if (!user || gameState.usedLetters.includes(letter)) return;

    const currentPlayer = participants[gameState.currentPlayerIndex];
    if (currentPlayer?.id !== user.id) return; // Not this player's turn

    const event: GameEvent = {
      type: 'LETTER_SELECTED',
      payload: { letter },
      timestamp: Date.now(),
      playerId: user.id
    };

    // Update local state immediately
    const newGameState = {
      ...gameState,
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % participants.length
    };
    
    setGameState(newGameState);

    // Broadcast letter selection to other players
    try {
      console.log('Broadcasting letter selection:', letter);
      
      // Broadcast letter selection using instanceId
      if (discordSdk?.instanceId) {
        const gameData = {
          instanceId: discordSdk.instanceId,
          event: event,
          gameState: newGameState,
          timestamp: Date.now()
        };
        
        console.log('Broadcasting letter to instance:', discordSdk.instanceId, letter);
        
        // Store in sessionStorage with instanceId as key
        sessionStorage.setItem(`basta-${discordSdk.instanceId}`, JSON.stringify(gameData));
        
        // Trigger storage event for same-origin communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: `basta-${discordSdk.instanceId}`,
          newValue: JSON.stringify(gameData)
        }));
      }
      
      // Also update Discord activity for visual feedback
      if (discordSdk) {
        const activityState = {
          details: 'Playing Basta!',
          state: `Round ${newGameState.roundNumber} - ${newGameState.currentCategory.en}`,
          party: {
            id: 'basta-game',
            size: [participants.length, 8]
          },
          instance: true,
          timestamps: {
            start: Date.now()
          }
        };

        await discordSdk.commands.setActivity({
          activity: activityState
        });
      }
    } catch (error) {
      console.error('Failed to broadcast letter selection:', error);
    }
  }, [user, gameState, participants, discordSdk]);

  const getCurrentPlayer = useCallback(() => {
    return participants[gameState.currentPlayerIndex];
  }, [participants, gameState.currentPlayerIndex]);

  const isCurrentPlayer = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer?.id === user?.id;
  }, [getCurrentPlayer, user?.id]);

  return {
    gameState,
    startNewRound,
    resetGame,
    selectLetter,
    getCurrentPlayer,
    isCurrentPlayer,
    participants,
    isHost,
    isConnected,
    user
  };
};