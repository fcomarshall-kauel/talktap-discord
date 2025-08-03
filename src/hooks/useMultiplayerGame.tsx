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
  const { discordSdk, user, participants, isHost, isConnected, instanceId } = useDiscordSDK();
  
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
      if (instanceId) {
        const gameData = {
          instanceId: instanceId,
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
        
        console.log('Broadcasting to instance:', instanceId, event.type);
        
        // Use Discord URL mapping for cross-client sync (bypasses CSP)
        try {
          // Use Discord's mapped URL instead of activity state
          const response = await fetch('/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceId: instanceId,
              event: event,
              gameState: {
                roundNumber: gameState.roundNumber,
                currentCategory: gameState.currentCategory,
                isGameActive: gameState.isGameActive,
                currentPlayerIndex: gameState.currentPlayerIndex,
                usedLetters: gameState.usedLetters,
                isHost,
                participants: participants.map(p => ({
                  id: p.id,
                  username: p.username
                }))
              },
              timestamp: Date.now()
            }),
          });
          
          console.log('POST Response status:', response.status);
          
          if (response.ok) {
            const responseText = await response.text();
            console.log('Successfully broadcasted via Discord URL mapping:', event.type);
            console.log('Response:', responseText);
          } else {
            console.error('Failed to broadcast via Discord URL mapping:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText.substring(0, 200) + '...');
          }
        } catch (error) {
          console.error('Error broadcasting via Discord URL mapping:', error);
        }
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

  // Use Discord URL mappings for multiplayer sync (bypasses CSP)
  useEffect(() => {
    if (!user || !discordSdk) return;
    
    console.log('Setting up Discord URL mapping sync for instance:', instanceId);
    
    let lastProcessedTimestamp = Date.now();
    
    // Use Discord's URL mapping system for real-time sync
    const pollForGameEvents = async () => {
      try {
        // Use Discord's mapped URL instead of direct API call
        const response = await fetch(`/sync?instanceId=${instanceId}&since=${lastProcessedTimestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status, 'Response headers:', response.headers);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('Response text:', responseText.substring(0, 200) + '...');
          
          try {
            const data = JSON.parse(responseText);
            
            if (data.events && data.events.length > 0) {
              console.log(`Received ${data.events.length} events via Discord URL mapping`);
              
              data.events.forEach((eventData: any) => {
                if (eventData.timestamp > lastProcessedTimestamp && eventData.playerId !== user.id) {
                  console.log('Processing remote game event via URL mapping:', eventData.type, 'from player:', eventData.playerId);
                  
                  const fullEvent: GameEvent = {
                    type: eventData.type,
                    playerId: eventData.playerId,
                    timestamp: eventData.timestamp,
                    payload: eventData.payload || {}
                  };
                  
                  handleRemoteEvent(fullEvent);
                  lastProcessedTimestamp = eventData.timestamp;
                }
              });
            }
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            console.error('Response was:', responseText);
          }
        } else {
          console.error('Failed to fetch events via Discord URL mapping:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText.substring(0, 200) + '...');
        }
      } catch (error) {
        console.error('Error polling via Discord URL mapping:', error);
      }
    };
    
    // Poll every 2 seconds for game events via Discord URL mapping
    const pollInterval = setInterval(pollForGameEvents, 2000);
    
    // Initial poll
    pollForGameEvents();
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user, discordSdk, instanceId, handleRemoteEvent]);

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
      if (instanceId) {
        const gameData = {
          instanceId: instanceId,
          event: event,
          gameState: newGameState,
          timestamp: Date.now()
        };
        
        console.log('Broadcasting letter to instance:', instanceId, letter);
        
        // Use Discord's native activity state for letter selection sync
        // Encode minimal event data (Discord state limit: 128 chars)
        const minimalLetterEvent = {
          t: event.type.substring(0, 10), // Truncated type
          p: event.playerId.slice(-6), // Last 6 chars of player ID
          ts: Date.now(),
          l: letter // Include the letter
        };
        
        const encodedLetterData = btoa(JSON.stringify(minimalLetterEvent));
        
        try {
          await discordSdk.commands.setActivity({
            activity: {
              details: `Round ${gameState.roundNumber} - Letter Selected`,
              state: `Letter: ${letter}|${encodedLetterData}`.substring(0, 128), // Ensure under 128 chars
              party: {
                id: instanceId,
                size: [participants.length, 8]
              },
              instance: true
            }
          });
          console.log('Successfully broadcasted letter selection via Discord activity:', letter);
        } catch (activityError) {
          console.error('Failed to update Discord activity for letter selection:', activityError);
        }
      }
    } catch (error) {
      console.error('Failed to broadcast letter selection:', error);
    }
  }, [user, gameState, participants, discordSdk, instanceId]);

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