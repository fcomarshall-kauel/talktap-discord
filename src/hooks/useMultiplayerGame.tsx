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

  // Broadcast game event to all participants using Discord Activity state
  const broadcastEvent = useCallback(async (event: GameEvent) => {
    if (!discordSdk || !isHost) return;

    try {
      console.log('Broadcasting event via Discord Activity:', event.type);
      
      // Store game state in Discord Activity metadata
      const activityState = {
        details: 'Playing Basta!',
        state: `Round ${gameState.roundNumber} - ${gameState.currentCategory.en}`,
        party: {
          id: 'basta-game',
          size: [participants.length, 8]
        },
        instance: true,
        timestamps: {
          start: Date.now()
        },
        metadata: {
          gameEvent: JSON.stringify(event),
          eventTimestamp: Date.now(),
          gameState: JSON.stringify({
            currentCategory: gameState.currentCategory,
            usedLetters: gameState.usedLetters,
            isGameActive: gameState.isGameActive,
            currentPlayerIndex: gameState.currentPlayerIndex,
            roundNumber: gameState.roundNumber
          })
        }
      };

      await discordSdk.commands.setActivity({
        activity: activityState
      });
      
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

  // Listen for Discord activity updates to receive game events
  useEffect(() => {
    if (!discordSdk || !participants.length || !user) return;
    
    let lastProcessedTimestamp = Date.now();
    
    const handleActivityUpdate = (activityData: any) => {
      try {
        console.log('Received activity update:', activityData);
        
        if (activityData.metadata && activityData.metadata.gameEvent) {
          const eventTimestamp = activityData.metadata.eventTimestamp;
          
          // Only process new events
          if (eventTimestamp > lastProcessedTimestamp) {
            const gameEvent = JSON.parse(activityData.metadata.gameEvent);
            
            // Don't process events from the current player
            if (gameEvent.playerId !== user.id) {
              console.log('Processing remote activity event:', gameEvent.type, 'from player:', gameEvent.playerId);
              handleRemoteEvent(gameEvent);
              lastProcessedTimestamp = eventTimestamp;
            }
          }
        }
      } catch (error) {
        console.error('Error processing activity update:', error);
      }
    };

    // Subscribe to activity instance updates
    const subscribeToUpdates = async () => {
      try {
        await discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleActivityUpdate);
        console.log('Subscribed to Discord activity updates');
      } catch (error) {
        console.error('Failed to subscribe to activity updates:', error);
      }
    };

    subscribeToUpdates();

    return () => {
      // Cleanup subscription when component unmounts
      if (discordSdk) {
        discordSdk.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleActivityUpdate).catch(console.error);
      }
    };
  }, [discordSdk, participants, user, handleRemoteEvent]);

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

    // Broadcast via Discord Activity (any player can update activity state for their move)
    try {
      if (discordSdk) {
        console.log('Broadcasting letter selection via Discord Activity:', letter);
        
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
          },
          metadata: {
            gameEvent: JSON.stringify(event),
            eventTimestamp: Date.now(),
            gameState: JSON.stringify({
              currentCategory: newGameState.currentCategory,
              usedLetters: newGameState.usedLetters,
              isGameActive: newGameState.isGameActive,
              currentPlayerIndex: newGameState.currentPlayerIndex,
              roundNumber: newGameState.roundNumber
            })
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