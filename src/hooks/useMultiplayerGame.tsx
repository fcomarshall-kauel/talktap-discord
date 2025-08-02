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

  // Broadcast game event to all participants
  const broadcastEvent = useCallback(async (event: GameEvent) => {
    if (!discordSdk || !isHost) return;

    try {
      // Update Discord activity status
      await discordSdk.commands.setActivity({
        activity: {
          type: 0,
          details: 'Playing Basta!',
          state: `Round ${gameState.roundNumber}`,
          party: {
            id: 'basta-game',
            size: [participants.length, 8]
          },
          instance: true,
          timestamps: {
            start: Date.now()
          }
        }
      });

      // Broadcast event to other players via API
      const roomId = `basta-${participants[0]?.id || 'default'}`;
      console.log('Broadcasting event to room:', roomId, event.type);
      
      await fetch(`/api/game-events?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }, [discordSdk, isHost, gameState.roundNumber, participants]);

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

  // Listen for game events via polling
  useEffect(() => {
    if (!participants.length || !user) return;
    
    const roomId = `basta-${participants[0]?.id || 'default'}`;
    let lastEventTimestamp = Date.now();
    let pollInterval: NodeJS.Timeout;
    
    const pollForEvents = async () => {
      try {
        const response = await fetch(`/api/game-events?roomId=${roomId}&since=${lastEventTimestamp}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.events && data.events.length > 0) {
            console.log(`Received ${data.events.length} events for room ${roomId}`);
            
            data.events.forEach((event: GameEvent) => {
              // Don't process events from the current player
              if (event.playerId !== user.id) {
                console.log('Processing remote event:', event.type, 'from player:', event.playerId);
                handleRemoteEvent(event);
              }
            });
            
            // Update timestamp to latest event
            if (data.timestamp) {
              lastEventTimestamp = data.timestamp;
            }
          }
        }
      } catch (error) {
        console.error('Error polling for events:', error);
      }
    };

    // Start polling every 2 seconds
    pollInterval = setInterval(pollForEvents, 2000);
    
    // Initial poll
    pollForEvents();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [participants, user, handleRemoteEvent]);

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
    setGameState(prev => ({
      ...prev,
      usedLetters: [...prev.usedLetters, letter],
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % participants.length
    }));

    // Broadcast to other players (any player can broadcast their moves)
    try {
      const roomId = `basta-${participants[0]?.id || 'default'}`;
      console.log('Broadcasting letter selection to room:', roomId, letter);
      
      await fetch(`/api/game-events?roomId=${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to broadcast letter selection:', error);
    }
  }, [user, gameState.usedLetters, gameState.currentPlayerIndex, participants]);

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