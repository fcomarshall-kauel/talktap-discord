import { useCallback, useEffect, useState } from 'react';
import { supabase, GameEvent, GameState, Participant } from '@/lib/supabase';
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

export const useSupabaseMultiplayer = () => {
  const { user, participants, isHost, instanceId, isConnected } = useDiscordSDK();
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

  // Generate unique player ID for Discord users
  const generatePlayerId = () => {
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substr(2, 9);
    const random2 = Math.random().toString(36).substr(2, 9);
    const random3 = Math.random().toString(36).substr(2, 9);
    const tabId = Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substr(2, 6);
    const browserId = navigator.userAgent.length.toString(36);
    return `discord-${timestamp}-${random1}-${random2}-${random3}-${tabId}-${sessionId}-${browserId}`;
  };

  // Initialize game state in Supabase with improved error handling
  const initializeGameState = useCallback(async () => {
    if (!instanceId || !user || !supabase) return;

    try {
      console.log('🎮 Initializing game state for Discord instance:', instanceId);
      
      // Upsert game state with conflict resolution
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
          host: isHost ? user.id : null
        }, {
          onConflict: 'instance_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error initializing game state:', error);
        console.log('⚠️ Game state initialization failed, but continuing...');
      } else {
        console.log('✅ Game state initialized successfully:', data);
      }
    } catch (error) {
      console.error('Game state initialization error:', error);
      console.log('⚠️ Game state table might not exist, continuing...');
    }
  }, [instanceId, user, gameState, isHost]);

  // Join as participant with improved slot assignment
  const joinAsParticipant = useCallback(async () => {
    if (!instanceId || !user || !supabase) return;

    try {
      console.log('🎮 Discord user joining as participant:', user.username);
      
      // Generate unique player ID for this session
      const playerId = generatePlayerId();
      
      // Get current participants to check for available slots
      const { data: currentPlayers } = await supabase
        .from('participants')
        .select('*')
        .eq('instance_id', instanceId)
        .order('joined_at', { ascending: true });

      console.log('📊 Current Discord participants:', currentPlayers?.map(p => ({
        id: p.user_id.slice(-8),
        name: p.global_name,
        username: p.username
      })));

      // Find available slot (1-6)
      const usedSlotNumbers = new Set<number>(currentPlayers?.map(p => {
        const match = p.global_name.match(/Player (\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter((num): num is number => num !== null) || []);
      
      console.log('🔍 Used slots:', Array.from(usedSlotNumbers).sort((a, b) => a - b));
      
      let availableSlot = 1;
      for (let i = 1; i <= 6; i++) {
        if (!usedSlotNumbers.has(i)) {
          availableSlot = i;
          break;
        }
      }

      const playerName = `Player ${availableSlot}`;
      const uniqueUsername = `discord_player${availableSlot}_${Date.now()}`;

      console.log(`🎮 Discord user joining as ${playerName} (Host: ${isHost})`);

      const { data, error } = await supabase
        .from('participants')
        .upsert({
          instance_id: instanceId,
          user_id: playerId,
          username: uniqueUsername,
          global_name: playerName,
          avatar: user.avatar,
          is_host: isHost
        }, {
          onConflict: 'instance_id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error joining as participant:', error);
        console.log('⚠️ Participant join failed, but continuing...');
      } else {
        console.log('✅ Discord user joined successfully:', data);
      }
    } catch (error) {
      console.error('Failed to join as participant:', error);
      console.log('⚠️ Participant table might not exist, continuing...');
    }
  }, [instanceId, user, isHost]);

  // Broadcast game event with improved error handling
  const broadcastEvent = useCallback(async (eventType: GameEvent['event_type'], payload: any) => {
    if (!instanceId || !user || !supabase) return;

    try {
      console.log('📡 Broadcasting Discord game event:', eventType, payload);
      console.log('🎯 Instance ID:', instanceId, 'User ID:', user.id);
      
      const { data, error } = await supabase
        .from('game_events')
        .insert({
          instance_id: instanceId,
          event_type: eventType,
          payload,
          player_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error broadcasting event:', error);
        console.log('⚠️ Game events table might not exist, skipping broadcast');
      } else {
        console.log('✅ Discord event broadcasted successfully:', data);
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      console.log('⚠️ Game events table might not exist, skipping broadcast');
    }
  }, [instanceId, user]);

  // Update game state with improved error handling
  const updateGameState = useCallback(async (newState: Partial<LocalGameState>) => {
    if (!instanceId || !supabase) return;

    try {
      console.log('🔄 Updating Discord game state:', newState);
      
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
        console.error('❌ Error updating game state:', error);
        console.log('⚠️ Game state table might not exist, skipping update');
      } else {
        console.log('✅ Discord game state updated successfully:', data);
      }
    } catch (error) {
      console.error('Update game state error:', error);
      console.log('⚠️ Game state table might not exist, skipping update');
    }
  }, [instanceId, gameState]);

  // Subscribe to real-time events with improved error handling
  useEffect(() => {
    if (!instanceId || !user || !supabase) {
      console.log('⚠️ Cannot setup Discord subscriptions:', { 
        hasInstanceId: !!instanceId, 
        hasUser: !!user, 
        hasSupabase: !!supabase 
      });
      return;
    }

    console.log('🔗 Setting up Discord Supabase real-time subscriptions for instance:', instanceId);
    console.log('👤 Discord user:', user.username, 'ID:', user.id);

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel(`discord-game-events-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `instance_id=eq.${instanceId}`
        },
        (payload) => {
          try {
            const event = payload.new as GameEvent;
            console.log('🔄 Discord game event received via WebSocket:', event.event_type, event.payload);
            console.log('🎯 Event details:', { 
              instanceId: event.instance_id, 
              playerId: event.player_id, 
              currentUserId: user.id 
            });

            // Handle different event types
            switch (event.event_type) {
              case 'LETTER_SELECTED':
                if (event.player_id !== user.id) {
                  console.log('📝 Letter selected by another player:', event.payload.letter);
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
                console.log('🎮 Round started by host:', event.payload.category);
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
                console.log('🔄 Game reset by host');
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
                // Don't log timer updates to reduce spam
                window.dispatchEvent(new CustomEvent('timerReset'));
                break;
            }
          } catch (error) {
            console.error('Discord game event processing error:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Discord game events subscription: SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ Discord game events subscription failed, table might not exist');
        }
      });

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel(`discord-game-state-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `instance_id=eq.${instanceId}`
        },
        (payload) => {
          try {
            const state = payload.new as GameState;
            console.log('🔄 Discord real-time game state update:', state);
            
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
          } catch (error) {
            console.error('Discord game state update error:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Discord game state subscription:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ Discord game state subscription failed, table might not exist');
        }
      });

    // Subscribe to participant changes
    const participantsChannel = supabase
      .channel(`discord-participants-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `instance_id=eq.${instanceId}`
        },
        async (payload) => {
          // Only log participant changes, not all events
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            console.log('👥 Discord participant change:', payload.eventType);
          }
          
          // Always refresh the complete participants list to maintain order
          const { data: updatedPlayers } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', instanceId)
            .order('joined_at', { ascending: true });

          if (updatedPlayers && updatedPlayers.length > 0) {
            // Only log if there are actual changes
            const currentPlayerCount = participants.length;
            if (updatedPlayers.length !== currentPlayerCount) {
              console.log('📊 Discord participants updated:', updatedPlayers.length, 'players');
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Discord participants subscription: SUBSCRIBED');
        }
      });

    // Initialize when connected
    if (isConnected) {
      console.log('🎮 Discord connected, initializing game state and joining as participant');
      
      // Debug: Check if game events table exists and has data
      const checkGameEvents = async () => {
        try {
          const { data: events, error } = await supabase
            .from('game_events')
            .select('*')
            .eq('instance_id', instanceId)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (error) {
            console.log('⚠️ Game events table check failed:', error);
          } else {
            console.log('📊 Recent game events for this instance:', events?.length || 0);
            if (events && events.length > 0) {
              console.log('📋 Latest events:', events.map(e => ({ 
                type: e.event_type, 
                player: e.player_id?.slice(-8), 
                timestamp: e.created_at 
              })));
            }
          }
        } catch (err) {
          console.log('⚠️ Game events table might not exist');
        }
      };
      
      checkGameEvents();
      initializeGameState();
      joinAsParticipant();
    }

    return () => {
      console.log('🔌 Cleaning up Discord Supabase subscriptions');
      gameEventsChannel.unsubscribe();
      gameStateChannel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  }, [instanceId, user, isConnected, participants.length, initializeGameState, joinAsParticipant]);

  // Game actions with improved logging
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
    updateGameState(newState);
    broadcastEvent('ROUND_START', { category: randomCategory });
  }, [isHost, gameState.roundNumber, updateGameState, broadcastEvent]);

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
    updateGameState(newState);
    broadcastEvent('LETTER_SELECTED', { letter });
    broadcastEvent('TIMER_UPDATE', { action: 'reset' });
  }, [user, gameState, participants, instanceId, updateGameState, broadcastEvent]);

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
    updateGameState(newState);
    broadcastEvent('GAME_RESET', {});
  }, [isHost, participants, updateGameState, broadcastEvent]);

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