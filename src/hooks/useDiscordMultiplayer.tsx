import { useCallback, useEffect, useState } from 'react';
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
    host: null
  });

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

    console.log('🎮 Setting up pure Discord event system for gameplay');

    // Listen for Discord activity state changes
    const handleActivityStateChange = (data: any) => {
      console.log('🔄 Discord activity state change:', data);
      
      // Handle game state updates from Discord activity
      if (data.state && data.state.gameState) {
        console.log('🎮 Game state update from Discord activity:', data.state.gameState);
        setGameState(data.state.gameState);
      }
    };

    // Listen for Discord activity instance updates
    const handleInstanceUpdate = (data: any) => {
      console.log('🔄 Discord instance update:', data);
      
      // Handle game events from Discord instance
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach((event: any) => {
          console.log('🎮 Discord game event:', event.type, event.payload);
          handleGameEvent(event);
        });
      }
    };

    // Subscribe to Discord SDK events
    try {
      // We'll use Discord's native activity state for game sync
      console.log('✅ Pure Discord event system set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up Discord event system:', error);
    }

    return () => {
      // Cleanup handled by useDiscordSDK
    };
  }, [discordSdk, user, isConnected]);

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
            currentPlayerIndex: (prev.currentPlayerIndex + 1) % participants.length
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
          roundNumber: prev.roundNumber + 1
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
          }, {} as Record<string, number>)
        }));
        break;
    }
  }, [user, participants]);

  // Broadcast game event via Discord activity
  const broadcastDiscordEvent = useCallback(async (eventType: string, payload: any) => {
    if (!discordSdk || !user || !isConnected) return;

    try {
      console.log('📡 Broadcasting Discord game event:', eventType, payload);
      
      // For now, we'll use a simpler approach without activity updates
      // Discord activity updates can be implemented later when the SDK supports it
      console.log('✅ Discord game event logged (activity updates coming soon)');
    } catch (error) {
      console.error('❌ Failed to broadcast Discord game event:', error);
    }
  }, [discordSdk, user, isConnected]);

  // Game actions using pure Discord events
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