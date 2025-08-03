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
          const response = await fetch('/api/sync', {
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
          
          if (response.ok) {
            console.log('Successfully broadcasted via Discord URL mapping:', event.type);
          } else {
            console.error('Failed to broadcast via Discord URL mapping:', response.status);
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
    console.log('🔄 Handling remote event:', event.type, 'payload:', event.payload);
    
    switch (event.type) {
      case 'LETTER_SELECTED':
        console.log('📝 Processing LETTER_SELECTED event, letter:', event.payload.letter);
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
      
      case 'TIMER_UPDATE':
        // This will trigger a timer reset in the UI
        // The timer reset is handled by the GameTimer component
        // We'll emit a custom event that the UI can listen to
        window.dispatchEvent(new CustomEvent('timerReset'));
        break;
      

    }
  }, [participants.length]);

  // Use Discord URL mappings for multiplayer sync (bypasses CSP)
  useEffect(() => {
    if (!user || !discordSdk) return;
    
    console.log('Setting up Discord URL mapping sync for instance:', instanceId);
    
    let lastProcessedTimestamp = 0; // Start from 0 to catch all events
    
    // Use Discord's URL mapping system for real-time sync
    const pollForGameEvents = async () => {
      try {
        // Use Discord's mapped URL instead of direct API call
        console.log('🔍 Polling for events with instanceId:', instanceId, 'since:', lastProcessedTimestamp);
        const response = await fetch(`/api/sync?instanceId=${instanceId}&since=${lastProcessedTimestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.events && data.events.length > 0) {
            console.log(`Received ${data.events.length} events via Discord URL mapping`);
            
            data.events.forEach((eventData: any) => {
              console.log('Checking event:', eventData.type, 'from player:', eventData.playerId, 'timestamp:', eventData.timestamp, 'lastProcessed:', lastProcessedTimestamp);
              
              if (eventData.timestamp > lastProcessedTimestamp && eventData.playerId !== user.id) {
                console.log('✅ Processing remote game event via URL mapping:', eventData.type, 'from player:', eventData.playerId);
                
                const fullEvent: GameEvent = {
                  type: eventData.type,
                  playerId: eventData.playerId,
                  timestamp: eventData.timestamp,
                  payload: eventData.payload || {}
                };
                
                handleRemoteEvent(fullEvent);
                lastProcessedTimestamp = eventData.timestamp;
              } else {
                console.log('❌ Skipping event:', eventData.type, 'reason:', 
                  eventData.timestamp <= lastProcessedTimestamp ? 'old timestamp' : 'own event');
              }
            });
          }
        } else {
          console.error('Failed to fetch events via Discord URL mapping:', response.status);
        }
      } catch (error) {
        console.error('Error polling via Discord URL mapping:', error);
      }
    };
    
    // Poll every 300ms for game events via Discord URL mapping (reduced from 500ms)
    const pollInterval = setInterval(pollForGameEvents, 300);
    
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
    console.log('🎯 Letter selection attempt:', {
      letter,
      user: user?.id,
      usedLetters: gameState.usedLetters,
      isLetterUsed: gameState.usedLetters.includes(letter)
    });
    
    if (!user || gameState.usedLetters.includes(letter)) {
      console.log('❌ Letter selection blocked:', !user ? 'no user' : 'letter already used');
      return;
    }

    const currentPlayer = participants[gameState.currentPlayerIndex];
    console.log('🎯 Turn check:', {
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentPlayer: currentPlayer?.id,
      user: user.id,
      participants: participants.map(p => p.id),
      isCurrentPlayer: currentPlayer?.id === user.id
    });
    
    if (currentPlayer?.id !== user.id) {
      console.log('❌ Not your turn! Current player:', currentPlayer?.id, 'You:', user.id);
      return; // Not this player's turn
    }

    console.log('🎯 Selecting letter:', letter, 'for instance:', instanceId, 'user:', user.id);

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
    broadcastEvent(event);

    // Also broadcast a timer reset event
    const timerResetEvent: GameEvent = {
      type: 'TIMER_UPDATE',
      payload: { action: 'reset' },
      timestamp: Date.now(),
      playerId: user.id
    };
    broadcastEvent(timerResetEvent);


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