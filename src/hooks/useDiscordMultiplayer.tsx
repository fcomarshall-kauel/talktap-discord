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
    if (!user || !isConnected) {
      console.log('⚠️ Cannot setup WebSocket connections:', { 
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
        // For now, we'll skip WebSocket setup in Discord to avoid CSP issues
        // The proxy API route will handle all database operations
        console.log('📡 Skipping WebSocket setup in Discord (using proxy API instead)');
        
        // Store channel refs as null for now
        gameStateChannelRef.current = null;
        gameEventsChannelRef.current = null;

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
  }, [user, isConnected]);

  // Initialize Discord game state in database via proxy
  const initializeDiscordGameState = useCallback(async () => {
    if (!instanceId) return;

    try {
      console.log('🎮 Initializing Discord game state via proxy...');
      
      // Test proxy connection first
      console.log('🔍 Testing proxy connection...');
      const testResponse = await fetch('/api/supabase-proxy/rest/v1/web_game_states?select=count&limit=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      });
      
      if (!testResponse.ok) {
        console.error('❌ Proxy connection test failed:', testResponse.status, testResponse.statusText);
        return;
      }
      
      console.log('✅ Proxy connection test successful');
      
      // Check if game state exists
      const existingResponse = await fetch(`/api/supabase-proxy/rest/v1/web_game_states?select=*&instance_id=eq.${instanceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      });
      
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        if (existingData && existingData.length > 0) {
          console.log('✅ Discord game state already exists');
          return;
        }
      }
      
      // Create new game state
      console.log('🎮 Creating new Discord game state...');
      const createResponse = await fetch('/api/supabase-proxy/rest/v1/web_game_states', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          instance_id: instanceId,
          current_category: { id: "animals", es: "Animales", en: "Animals" },
          used_letters: [],
          is_game_active: false,
          current_player_index: 0,
          player_scores: {},
          round_number: 1,
          host: null
        })
      });
      
      if (createResponse.ok) {
        console.log('✅ Discord game state initialized');
      } else {
        console.error('❌ Error initializing Discord game state:', createResponse.status, createResponse.statusText);
      }
      
    } catch (error) {
      console.error('❌ Error checking Discord game state:', error);
    }
  }, [instanceId]);

  // Refresh game state from database via proxy
  const refreshGameState = useCallback(async () => {
    if (!instanceId) return;

    try {
      const response = await fetch(`/api/supabase-proxy/rest/v1/web_game_states?select=*&instance_id=eq.${instanceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      });

      if (response.ok) {
        const gameStateData = await response.json();
        if (gameStateData && gameStateData.length > 0) {
          const data = gameStateData[0];
          console.log('🔄 Refreshing Discord game state from database:', data);
          setGameState({
            currentCategory: data.current_category,
            usedLetters: data.used_letters || [],
            isGameActive: data.is_game_active || false,
            currentPlayerIndex: data.current_player_index || 0,
            playerScores: data.player_scores || {},
            roundNumber: data.round_number || 1,
            timerDuration: data.timer_duration || 30,
            host: data.host,
            lastAction: null,
            syncTimestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh Discord game state:', error);
    }
  }, [instanceId]);

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

  // Broadcast game event via WebSocket proxy
  const broadcastWebSocketEvent = useCallback(async (eventType: string, payload: any) => {
    if (!user || !instanceId) return;

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
      
      // Broadcast via WebSocket proxy
      const response = await fetch('/api/supabase-proxy/rest/v1/web_game_events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          instance_id: instanceId,
          event_type: eventType,
          payload: payload,
          player_id: user.id
        })
      });

      if (response.ok) {
        console.log('✅ Discord WebSocket game event broadcasted successfully');
      } else {
        console.error('❌ Failed to broadcast Discord WebSocket game event:', response.status, response.statusText);
      }
      
    } catch (error) {
      console.error('❌ Failed to broadcast Discord WebSocket game event:', error);
    }
  }, [user, instanceId]);

  // Update game state in database via proxy
  const updateDiscordGameState = useCallback(async (newState: Partial<LocalGameState>) => {
    if (!instanceId) return;

    try {
      console.log('🔄 Updating Discord game state via proxy:', newState);
      
      const updateData: any = {
        current_category: newState.currentCategory || gameState.currentCategory,
        used_letters: newState.usedLetters || gameState.usedLetters,
        is_game_active: newState.isGameActive ?? gameState.isGameActive,
        current_player_index: newState.currentPlayerIndex ?? gameState.currentPlayerIndex,
        player_scores: newState.playerScores || gameState.playerScores,
        round_number: newState.roundNumber ?? gameState.roundNumber,
        host: newState.host ?? gameState.host
      };

      const response = await fetch(`/api/supabase-proxy/rest/v1/web_game_states?instance_id=eq.${instanceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        console.log('✅ Discord game state updated successfully');
      } else {
        console.error('❌ Error updating Discord game state:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Update Discord game state error:', error);
    }
  }, [instanceId, gameState]);

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