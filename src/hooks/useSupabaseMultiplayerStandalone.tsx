import { useCallback, useEffect, useState } from 'react';
import { supabase, GameEvent, GameState, Participant } from '@/lib/supabase';
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

interface LocalPlayer {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export const useSupabaseMultiplayerStandalone = () => {
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

  // Generate a unique instance ID for testing
  const [instanceId, setInstanceId] = useState<string>('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Initialize with shared instance ID but unique player IDs
  useEffect(() => {
    // Use a fixed instance ID so all tabs join the same game
    const sharedInstanceId = 'test-room-123';
    const newPlayerId = `test-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setInstanceId(sharedInstanceId);
    setCurrentPlayerId(newPlayerId);
    setIsConnected(true);
    
    console.log('🎮 Supabase test initialized:', { instanceId: sharedInstanceId, playerId: newPlayerId });
  }, []);

  // Separate effect for host detection after player ID is set
  useEffect(() => {
    if (!currentPlayerId) return;
    
    const checkHost = () => {
      const existingHost = localStorage.getItem('test-game-host');
      console.log('🎮 Checking host status:', { currentPlayerId, existingHost });
      
      if (!existingHost) {
        // Set this player as host
        localStorage.setItem('test-game-host', currentPlayerId);
        setIsHost(true);
        console.log('🎮 First player - setting as host:', currentPlayerId);
      } else if (existingHost === currentPlayerId) {
        // This player is already the host
        setIsHost(true);
        console.log('🎮 Current player is host:', currentPlayerId);
      } else {
        setIsHost(false);
        console.log('🎮 Joining as participant, existing host:', existingHost);
      }
    };
    
    checkHost();
  }, [currentPlayerId]);

  // Simulate participants for testing
  const participants: LocalPlayer[] = [
    { id: currentPlayerId, username: `Test Player ${currentPlayerId.slice(-4)}`, global_name: `Test Player ${currentPlayerId.slice(-4)}`, avatar: null },
    { id: 'test-player-2', username: 'Test Player 2', global_name: 'Test Player 2', avatar: null },
    { id: 'test-player-3', username: 'Test Player 3', global_name: 'Test Player 3', avatar: null }
  ];

  // Initialize game state in Supabase
  const initializeGameState = useCallback(async () => {
    if (!instanceId || !currentPlayerId || !supabase) return;

    try {
      // Upsert game state
      const { data, error } = await supabase
        .from('game_states')
        .upsert({
          instance_id: instanceId,
          current_category: gameState.currentCategory,
          used_letters: gameState.usedLetters,
          is_game_active: gameState.isGameActive,
          current_player_index: gameState.currentPlayerIndex,
          player_scores: gameState.playerScores,
          round_number: gameState.roundNumber,
          timer_duration: gameState.timerDuration,
          host: isHost ? currentPlayerId : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error initializing game state:', error);
      } else {
        console.log('Game state initialized:', data);
      }
    } catch (error) {
      console.error('Failed to initialize game state:', error);
    }
  }, [instanceId, currentPlayerId, gameState, isHost]);

  // Join as participant
  const joinAsParticipant = useCallback(async () => {
    if (!instanceId || !currentPlayerId || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('participants')
        .upsert({
          instance_id: instanceId,
          user_id: currentPlayerId,
          username: `Test Player ${currentPlayerId.slice(-4)}`,
          global_name: `Test Player ${currentPlayerId.slice(-4)}`,
          avatar: null,
          is_host: isHost
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining as participant:', error);
      } else {
        console.log('Joined as participant:', data);
      }
    } catch (error) {
      console.error('Failed to join as participant:', error);
    }
  }, [instanceId, currentPlayerId, isHost]);

  // Broadcast game event
  const broadcastEvent = useCallback(async (eventType: GameEvent['event_type'], payload: any) => {
    if (!instanceId || !currentPlayerId || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('game_events')
        .insert({
          instance_id: instanceId,
          event_type: eventType,
          payload,
          player_id: currentPlayerId
        })
        .select()
        .single();

      if (error) {
        console.error('Error broadcasting event:', error);
      } else {
        console.log('Event broadcasted:', data);
      }
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }, [instanceId, currentPlayerId]);

  // Update game state
  const updateGameState = useCallback(async (newState: Partial<LocalGameState>) => {
    if (!instanceId || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('game_states')
        .update({
          current_category: newState.currentCategory || gameState.currentCategory,
          used_letters: newState.usedLetters || gameState.usedLetters,
          is_game_active: newState.isGameActive ?? gameState.isGameActive,
          current_player_index: newState.currentPlayerIndex ?? gameState.currentPlayerIndex,
          player_scores: newState.playerScores || gameState.playerScores,
          round_number: newState.roundNumber ?? gameState.roundNumber,
          timer_duration: newState.timerDuration ?? gameState.timerDuration,
          host: newState.host ?? gameState.host
        })
        .eq('instance_id', instanceId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game state:', error);
      } else {
        console.log('Game state updated:', data);
      }
    } catch (error) {
      console.error('Failed to update game state:', error);
    }
  }, [instanceId, gameState]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!instanceId || !currentPlayerId || !supabase) return;

    console.log('Setting up Supabase real-time subscriptions for instance:', instanceId);

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel(`game-events-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `instance_id=eq.${instanceId}`
        },
        (payload) => {
          const event = payload.new as GameEvent;
          console.log('🔄 Real-time game event received:', event);

          // Handle different event types
          switch (event.event_type) {
            case 'LETTER_SELECTED':
              if (event.player_id !== currentPlayerId) {
                setGameState(prev => ({
                  ...prev,
                  usedLetters: [...prev.usedLetters, event.payload.letter],
                  currentPlayerIndex: (prev.currentPlayerIndex + 1) % participants.length
                }));
                // Trigger timer reset
                window.dispatchEvent(new CustomEvent('timerReset'));
              }
              break;

            case 'ROUND_START':
              console.log('🎮 Received ROUND_START event:', event.payload);
              setGameState(prev => ({
                ...prev,
                currentCategory: event.payload.category,
                usedLetters: [],
                isGameActive: true,
                currentPlayerIndex: 0,
                roundNumber: prev.roundNumber + 1
              }));
              // Trigger timer reset for round start
              window.dispatchEvent(new CustomEvent('timerReset'));
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
              window.dispatchEvent(new CustomEvent('timerReset'));
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel(`game-state-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `instance_id=eq.${instanceId}`
        },
        (payload) => {
          const state = payload.new as GameState;
          console.log('🔄 Real-time game state update:', state);
          
          setGameState({
            currentCategory: state.current_category,
            usedLetters: state.used_letters,
            isGameActive: state.is_game_active,
            currentPlayerIndex: state.current_player_index,
            playerScores: state.player_scores,
            roundNumber: state.round_number,
            timerDuration: state.timer_duration,
            host: state.host
          });
        }
      )
      .subscribe();

    // Initialize when connected
    if (isConnected) {
      initializeGameState();
      joinAsParticipant();
    }

    return () => {
      gameEventsChannel.unsubscribe();
      gameStateChannel.unsubscribe();
    };
  }, [instanceId, currentPlayerId, isConnected, participants.length, initializeGameState, joinAsParticipant]);

  // Game actions
  const startNewRound = useCallback(() => {
    console.log('🎮 startNewRound called, isHost:', isHost, 'currentPlayerId:', currentPlayerId);
    if (!isHost) {
      console.log('🚫 Not host, cannot start round');
      return;
    }

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

    console.log('🎮 Starting new round with category:', randomCategory, 'newState:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    updateGameState(newState);
    broadcastEvent('ROUND_START', { category: randomCategory });
  }, [isHost, gameState.roundNumber, updateGameState, broadcastEvent, currentPlayerId]);

  const selectLetter = useCallback(async (letter: string) => {
    if (gameState.usedLetters.includes(letter)) return;

    const currentPlayer = participants[gameState.currentPlayerIndex];
    if (currentPlayer?.id !== currentPlayerId) return;

    console.log('🎯 Supabase letter selection:', letter, 'by player:', currentPlayerId);

    const newState = {
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % participants.length
    };

    setGameState(prev => ({ ...prev, ...newState }));
    updateGameState(newState);
    broadcastEvent('LETTER_SELECTED', { letter });
    broadcastEvent('TIMER_UPDATE', { action: 'reset' });
  }, [gameState, participants, currentPlayerId, updateGameState, broadcastEvent]);

  const resetGame = useCallback(() => {
    if (!isHost) return;

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

    setGameState(prev => ({ ...prev, ...newState }));
    updateGameState(newState);
    broadcastEvent('GAME_RESET', {});
  }, [isHost, participants, updateGameState, broadcastEvent]);

  const getCurrentPlayer = useCallback(() => {
    return participants[gameState.currentPlayerIndex];
  }, [participants, gameState.currentPlayerIndex]);

  const isCurrentPlayer = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer?.id === currentPlayerId;
  }, [getCurrentPlayer, currentPlayerId]);

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
    user: { id: currentPlayerId, username: `Test Player ${currentPlayerId.slice(-4)}`, global_name: `Test Player ${currentPlayerId.slice(-4)}` }
  };
}; 