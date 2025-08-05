import { useCallback, useEffect, useState, useRef } from 'react';
import { useDiscordSDK } from './useDiscordSDK';
import { Category } from '@/data/categories';
import { supabase } from '@/lib/supabase';

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

  // WebSocket state management
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [wsIsConnected, setWsIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Refs for WebSocket management
  const lastSyncRef = useRef<number>(Date.now());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  const participantsRef = useRef<any[]>([]);
  const gameStateChannelRef = useRef<any>(null);
  const gameEventsChannelRef = useRef<any>(null);

  // Enhanced participant management with stability improvements
  useEffect(() => {
    if (!discordSdk || !user || !isConnected) {
      console.log('⚠️ Cannot setup Discord events:', { 
        hasDiscordSdk: !!discordSdk, 
        hasUser: !!user, 
        isConnected 
      });
      return;
    }

    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      console.log('⚠️ Discord events already initialized, skipping...');
      return;
    }
    hasInitializedRef.current = true;

    console.log('🎮 Setting up enhanced Discord event system for gameplay');

    // Subscribe to Discord SDK events
    try {
      // Listen for activity instance updates
      discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (data) => {
        console.log('👥 Discord participants update in game:', data);
        // This will trigger participant sync automatically
      });
      
      console.log('✅ Enhanced Discord event system set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up Discord event system:', error);
    }

    return () => {
      hasInitializedRef.current = false;
    };
  }, [discordSdk, user, isConnected]);

  // WebSocket setup for game events
  useEffect(() => {
    if (!supabase || !user || !isConnected) {
      console.log('⚠️ Cannot setup WebSocket connections:', { 
        hasSupabase: !!supabase, 
        hasUser: !!user, 
        isConnected 
      });
      return;
    }

    console.log('🔗 Setting up WebSocket connections for Discord game events...');
    setWsConnectionStatus('connecting');
    setWsIsConnected(false);

    let gameStateChannel: any = null;
    let gameEventsChannel: any = null;

    const setupWebSocketSubscriptions = async () => {
      try {
        // Subscribe to game state changes via WebSocket
        gameStateChannel = supabase
          .channel('discord-game-state', {
            config: {
              broadcast: {
                self: true,
              },
            },
          })
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'web_game_states' },
            async (payload) => {
              console.log('📡 Discord game state change detected:', payload.eventType, payload.new);
              await refreshGameState();
            }
          )
          .subscribe((status) => {
            console.log('📡 Discord game state channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Discord game state WebSocket connected');
            }
          });

        // Subscribe to game events via WebSocket
        gameEventsChannel = supabase
          .channel('discord-game-events', {
            config: {
              broadcast: {
                self: true,
              },
            },
          })
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'web_game_events' },
            async (payload) => {
              console.log('📡 Discord game event detected:', payload.eventType, payload.new);
              handleWebSocketGameEvent(payload.new);
            }
          )
          .subscribe((status) => {
            console.log('📡 Discord game events channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Discord game events WebSocket connected');
            }
          });

        // Store channel refs
        gameStateChannelRef.current = gameStateChannel;
        gameEventsChannelRef.current = gameEventsChannel;

        setWsConnectionStatus('connected');
        setWsIsConnected(true);
        setIsReconnecting(false);

        console.log('✅ Discord WebSocket connections setup complete');

        // Initialize game state if it doesn't exist
        await initializeDiscordGameState();

      } catch (error) {
        console.error('❌ Failed to setup Discord WebSocket connections:', error);
        setWsConnectionStatus('disconnected');
        setWsIsConnected(false);
      }
    };

    setupWebSocketSubscriptions();

    return () => {
      if (gameStateChannel) gameStateChannel.unsubscribe();
      if (gameEventsChannel) gameEventsChannel.unsubscribe();
    };
  }, [supabase, user, isConnected]);

  // Initialize Discord game state in database
  const initializeDiscordGameState = useCallback(async () => {
    if (!supabase || !instanceId) return;

    try {
      console.log('🎮 Initializing Discord game state...');
      
      const { data: existingGameState } = await supabase
        .from('web_game_states')
        .select('*')
        .eq('instance_id', instanceId)
        .maybeSingle();
      
      if (!existingGameState) {
        console.log('🎮 Creating new Discord game state...');
        const { error: initError } = await supabase
          .from('web_game_states')
          .insert({
            instance_id: instanceId,
            current_category: { id: "animals", es: "Animales", en: "Animals" },
            used_letters: [],
            is_game_active: false,
            current_player_index: 0,
            player_scores: {},
            round_number: 1,
            host: null
          });
        
        if (initError) {
          console.error('❌ Error initializing Discord game state:', initError);
        } else {
          console.log('✅ Discord game state initialized');
        }
      } else {
        console.log('✅ Discord game state already exists');
      }
    } catch (error) {
      console.error('❌ Error checking Discord game state:', error);
    }
  }, [supabase, instanceId]);

  // Refresh game state from database
  const refreshGameState = useCallback(async () => {
    if (!supabase || !instanceId) return;

    try {
      const { data: gameStateData } = await supabase
        .from('web_game_states')
        .select('*')
        .eq('instance_id', instanceId)
        .single();

      if (gameStateData) {
        console.log('🔄 Refreshing Discord game state from database:', gameStateData);
        setGameState({
          currentCategory: gameStateData.current_category,
          usedLetters: gameStateData.used_letters || [],
          isGameActive: gameStateData.is_game_active || false,
          currentPlayerIndex: gameStateData.current_player_index || 0,
          playerScores: gameStateData.player_scores || {},
          roundNumber: gameStateData.round_number || 1,
          timerDuration: gameStateData.timer_duration || 30,
          host: gameStateData.host,
          lastAction: null,
          syncTimestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('❌ Failed to refresh Discord game state:', error);
    }
  }, [supabase, instanceId]);

  // Handle WebSocket game events
  const handleWebSocketGameEvent = useCallback((eventData: any) => {
    if (!eventData || eventData.player_id === user?.id) return;

    console.log('🎮 Processing Discord WebSocket game event:', eventData.event_type, eventData.payload);
    
    switch (eventData.event_type) {
      case 'LETTER_SELECTED':
        console.log('📝 Letter selected by another player via WebSocket:', eventData.payload.letter);
        setGameState(prev => ({
          ...prev,
          usedLetters: [...prev.usedLetters, eventData.payload.letter],
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % participantsRef.current.length,
          lastAction: {
            type: 'LETTER_SELECTED',
            playerId: eventData.player_id,
            timestamp: Date.now(),
            payload: eventData.payload
          }
        }));
        window.dispatchEvent(new CustomEvent('timerReset'));
        break;

      case 'ROUND_START':
        console.log('🎮 Round started by host via WebSocket:', eventData.payload.category);
        setGameState(prev => ({
          ...prev,
          currentCategory: eventData.payload.category,
          usedLetters: [],
          isGameActive: true,
          currentPlayerIndex: 0,
          roundNumber: prev.roundNumber + 1,
          lastAction: {
            type: 'ROUND_START',
            playerId: eventData.player_id,
            timestamp: Date.now(),
            payload: eventData.payload
          }
        }));
        break;

      case 'GAME_RESET':
        console.log('🔄 Game reset by host via WebSocket');
        setGameState(prev => ({
          ...prev,
          usedLetters: [],
          isGameActive: false,
          currentPlayerIndex: 0,
          roundNumber: 1,
          playerScores: participantsRef.current.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>),
          lastAction: {
            type: 'GAME_RESET',
            playerId: eventData.player_id,
            timestamp: Date.now(),
            payload: eventData.payload
          }
        }));
        break;
    }
  }, [user]);

  // Enhanced participant management
  useEffect(() => {
    if (participants && participants.length > 0) {
      participantsRef.current = participants;
      console.log('👥 Discord participants updated:', participants.length, 'players');
      participants.forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.global_name || p.username} (${p.id})`);
      });
    }
  }, [participants]);

  // Broadcast game event via WebSocket
  const broadcastWebSocketEvent = useCallback(async (eventType: string, payload: any) => {
    if (!supabase || !user || !instanceId) return;

    try {
      console.log('📡 Broadcasting Discord WebSocket game event:', eventType, payload);
      
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
      
      // Broadcast via WebSocket
      await supabase
        .from('web_game_events')
        .insert({
          instance_id: instanceId,
          event_type: eventType,
          payload: payload,
          player_id: user.id
        });

      console.log('✅ Discord WebSocket game event broadcasted successfully');
      
    } catch (error) {
      console.error('❌ Failed to broadcast Discord WebSocket game event:', error);
    }
  }, [supabase, user, instanceId]);

  // Update game state in database
  const updateDiscordGameState = useCallback(async (newState: Partial<LocalGameState>) => {
    if (!supabase || !instanceId) return;

    try {
      console.log('🔄 Updating Discord game state:', newState);
      
      const updateData: any = {
        current_category: newState.currentCategory || gameState.currentCategory,
        used_letters: newState.usedLetters || gameState.usedLetters,
        is_game_active: newState.isGameActive ?? gameState.isGameActive,
        current_player_index: newState.currentPlayerIndex ?? gameState.currentPlayerIndex,
        player_scores: newState.playerScores || gameState.playerScores,
        round_number: newState.roundNumber ?? gameState.roundNumber,
        host: newState.host ?? gameState.host
      };

      const { error } = await supabase
        .from('web_game_states')
        .update(updateData)
        .eq('instance_id', instanceId);

      if (error) {
        console.error('❌ Error updating Discord game state:', error);
      } else {
        console.log('✅ Discord game state updated successfully');
      }
    } catch (error) {
      console.error('❌ Update Discord game state error:', error);
    }
  }, [supabase, instanceId, gameState]);

  // Enhanced game actions with WebSocket integration
  const startNewRound = useCallback(async () => {
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
      { id: "colors", es: "Colores", en: "Colors" },
      { id: "sports", es: "Deportes", en: "Sports" }
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
    
    // Update database and broadcast via WebSocket
    await updateDiscordGameState(newState);
    await broadcastWebSocketEvent('ROUND_START', { category: randomCategory });
  }, [isHost, gameState.roundNumber, updateDiscordGameState, broadcastWebSocketEvent]);

  const selectLetter = useCallback(async (letter: string) => {
    if (!user || gameState.usedLetters.includes(letter)) {
      console.log('⚠️ Discord user cannot select letter:', letter, 'Reason: Already used or no user');
      return;
    }

    const currentPlayer = participantsRef.current[gameState.currentPlayerIndex];
    if (currentPlayer?.id !== user.id) {
      console.log('⚠️ Discord user tried to select letter out of turn:', letter);
      return;
    }

    console.log('🎯 Discord user selecting letter:', letter, 'for instance:', instanceId, 'user:', user.id);

    const newState = {
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % participantsRef.current.length
    };

    console.log('🔄 Discord letter selection state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    // Update database and broadcast via WebSocket
    await updateDiscordGameState(newState);
    await broadcastWebSocketEvent('LETTER_SELECTED', { letter });
  }, [user, gameState, instanceId, updateDiscordGameState, broadcastWebSocketEvent]);

  const resetGame = useCallback(async () => {
    if (!isHost) {
      console.log('⚠️ Non-host Discord user tried to reset game');
      return;
    }

    console.log('🔄 Discord host resetting game');
    
    const resetScores = participantsRef.current.reduce((acc, p) => {
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
    
    // Update database and broadcast via WebSocket
    await updateDiscordGameState(newState);
    await broadcastWebSocketEvent('GAME_RESET', {});
  }, [isHost, updateDiscordGameState, broadcastWebSocketEvent]);

  const getCurrentPlayer = useCallback(() => {
    return participantsRef.current[gameState.currentPlayerIndex];
  }, [gameState.currentPlayerIndex]);

  const isCurrentPlayer = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer?.id === user?.id;
  }, [getCurrentPlayer, user?.id]);

  // Enhanced manual sync function
  const syncWithDiscordActivity = useCallback(async () => {
    if (!discordSdk || !isConnected) return;
    
    try {
      console.log('🔄 Manual sync with Discord activity...');
      await refreshGameState();
      console.log('✅ Manual sync completed');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
    }
  }, [discordSdk, isConnected, refreshGameState]);

  return {
    gameState,
    startNewRound,
    resetGame,
    selectLetter,
    getCurrentPlayer,
    isCurrentPlayer,
    syncWithDiscordActivity,
    participants: participantsRef.current,
    isHost,
    isConnected: isConnected && wsIsConnected,
    user,
    wsConnectionStatus
  };
}; 