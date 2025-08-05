import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, getRandomCategory } from '@/data/categories';

interface Player {
  id: string;
  username: string;
  global_name: string;
  avatar?: string;
  is_host: boolean;
  joined_at: string;
  last_seen: string;
  is_online: boolean;
}

interface GameState {
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
  losingPlayer: {
    id: string;
    name: string;
  } | null;
}

interface WebMultiplayerReturn {
  players: Player[];
  gameState: GameState;
  currentPlayer: Player | null;
  isHost: boolean;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'polling';
  startNewRound: () => void;
  resetGame: () => void;
  selectLetter: (letter: string) => void;
  handleTimerTimeout: () => Promise<void>;
  getCurrentPlayer: () => Player | null;
  isCurrentPlayer: () => boolean;
  showLeaveWarning: boolean;
  handleConfirmLeave: () => Promise<void>;
  handleCancelLeave: () => void;
  setShowLeaveWarning: (show: boolean) => void;
  changePlayerName: (newName: string) => Promise<boolean>;
  localLosingPlayer: {id: string, name: string} | null;
  losingHistory: Record<string, number>;
}

export const useWebMultiplayer = (): WebMultiplayerReturn => {
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Debug players state changes
  useEffect(() => {
    console.log('🔄 Players state updated:', players.length, 'players');
    players.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.global_name} (${player.id}) - online: ${player.is_online}`);
    });
  }, [players]);
  const [gameState, setGameState] = useState<GameState>({
    currentCategory: { id: "animals", es: "animales", en: "animals" }, // Always use default for SSR
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    playerScores: {},
    roundNumber: 1,
    timerDuration: 30,
    host: null,
    lastAction: null,
    losingPlayer: null
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false); // Track if we're currently joining
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'polling'>('connecting');
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [localLosingPlayer, setLocalLosingPlayer] = useState<{id: string, name: string} | null>(null);
  const [losingHistory, setLosingHistory] = useState<Record<string, number>>({});
  const [isIntentionalUntrack, setIsIntentionalUntrack] = useState(false);
  const hasJoinedRef = useRef(false); // Track if we've already joined to prevent duplicates in Strict Mode
  const hasInitializedRef = useRef(false); // Track if we've already initialized
  const hasUpdatedCategoryRef = useRef(false); // Track if we've updated the category
  const playersChannelRef = useRef<any>(null); // Store players channel for presence tracking

  // Update to random category after hydration is complete
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasUpdatedCategoryRef.current) {
      hasUpdatedCategoryRef.current = true;
      setGameState(prev => ({
        ...prev,
        currentCategory: getRandomCategory()
      }));
    }
  }, []); // Only run once after mount


  // Generate unique player ID
  const generatePlayerId = useCallback(() => {
    // Try to get existing player ID from sessionStorage first
    if (typeof window !== 'undefined') {
      const existingId = sessionStorage.getItem('web-multiplayer-player-id');
      if (existingId) {
        console.log('🆔 Reusing existing player ID');
        return existingId;
      }
    }

    // Generate a new stable player ID with unique tab identifier
    const timestamp = Date.now();
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const screenInfo = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '';
    const timezone = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    const language = typeof window !== 'undefined' ? navigator.language : '';
    const tabId = Math.random().toString(36).substring(2, 10); // Unique per tab
    
    // Create a fingerprint with tab-specific ID
    const fingerprint = `${userAgent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}-${screenInfo.replace(/[^a-zA-Z0-9]/g, '')}-${timezone.replace(/[^a-zA-Z0-9]/g, '')}-${language.replace(/[^a-zA-Z0-9]/g, '')}-${tabId}`;
    
    const playerId = `web-${timestamp}-${fingerprint}`;
    
    // Store the ID in sessionStorage for persistence across refreshes (but not across tabs)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('web-multiplayer-player-id', playerId);
    }
    
    console.log('🆔 Generated new player ID for tab');
    return playerId;
  }, []);

  // Generate player name based on slot
  const generatePlayerName = useCallback((slotNumber: number) => {
    return `Player ${slotNumber}`;
  }, []);

  // Clean up old offline players
  const cleanupOldPlayers = useCallback(async () => {
    if (!supabase) return;
    
    // Don't run cleanup if we're still connecting or don't have a current player
    if (!currentPlayer || connectionStatus === 'connecting') {
      console.log('🧹 Skipping cleanup - still connecting or no current player');
      return;
    }

    try {
      console.log('🧹 Running cleanup check...');
      
      // First, let's see what players are currently online
      const { data: onlinePlayers } = await supabase
        .from('web_players')
        .select('*')
        .eq('is_online', true);
      
      console.log('🧹 Current online players before cleanup:', onlinePlayers?.length || 0);
      if (onlinePlayers) {
        onlinePlayers.forEach(player => {
          const lastSeenAge = Date.now() - new Date(player.last_seen).getTime();
          console.log(`🧹 ${player.global_name}: last_seen ${Math.round(lastSeenAge / 1000)}s ago`);
        });
      }
      
      // Mark players as offline if they haven't been seen in 120 seconds (much less aggressive)
      const { error: cleanupError } = await supabase
        .from('web_players')
        .update({ is_online: false })
        .lt('last_seen', new Date(Date.now() - 120 * 1000).toISOString()) // 120 seconds (2 minutes)
        .eq('is_online', true);

      if (cleanupError) {
        console.error('❌ Error cleaning up old players:', cleanupError);
      } else {
        console.log('✅ Cleaned up old offline players (120s timeout)');
      }
    } catch (error) {
      console.error('Failed to cleanup old players:', error);
    }
  }, [supabase]);

  // Refresh players list
  const refreshPlayersList = useCallback(async () => {
    if (!supabase) return;

    try {
      // Get all online players (don't filter by time for newly joined players)
      const { data: updatedPlayers } = await supabase
        .from('web_players')
        .select('*')
        .eq('is_online', true)
        .order('joined_at', { ascending: true });

      if (updatedPlayers) {
        console.log('📊 Fetched players from DB:', updatedPlayers.length);
        console.log('📊 Player details from DB:', updatedPlayers.map(p => ({ id: p.id, name: p.global_name, online: p.is_online, last_seen: p.last_seen })));
        setPlayers(updatedPlayers);
        console.log('📊 Players state set with:', updatedPlayers.length, 'players');
        
        // Check if current player is in the list
        if (currentPlayer) {
          const currentPlayerInList = updatedPlayers.find(p => p.id === currentPlayer.id);
          if (currentPlayerInList) {
            console.log('✅ Current player found in players list');
          } else {
            console.log('⚠️ Current player NOT found in players list');
          }
        }
      } else {
        console.log('📊 No players found in database');
      }
    } catch (error) {
      console.error('Failed to refresh players list:', error);
    }
  }, [supabase]);

  // Join as player with slot assignment
  const joinAsPlayer = useCallback(async () => {
    if (!supabase) return;
    
    // Generate player ID first
    const playerId = generatePlayerId();
    console.log('🆔 Generated player ID:', playerId);
    
    // Check if this player ID already exists in the database
    const { data: existingPlayer } = await supabase
      .from('web_players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();
    
    if (existingPlayer) {
      console.log('👤 Player exists, reconnecting...');
      console.log('👤 Existing player status:', { 
        id: existingPlayer.id, 
        name: existingPlayer.global_name, 
        is_online: existingPlayer.is_online,
        last_seen: existingPlayer.last_seen 
      });
      
      // Check if the player is currently online
      if (existingPlayer.is_online) {
        console.log('⚠️ Player already online (refresh detected)');
        // For refreshes, we should update the last_seen but not change is_online
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('web_players')
          .update({
            last_seen: new Date().toISOString()
          })
          .eq('id', playerId)
          .select()
          .single();
          
        if (updateError) {
          console.error('❌ Error updating existing player:', updateError);
          return;
        }
        
        console.log('✅ Updated existing online player');
        setCurrentPlayer(updatedPlayer);
        setIsHost(updatedPlayer.is_host);
        await refreshPlayersList();
        return;
      } else {
        // Player exists but is offline, reconnect them
        console.log('🔄 Reconnecting offline player...');
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('web_players')
          .update({
            is_online: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', playerId)
          .select()
          .single();
          
        if (updateError) {
          console.error('❌ Error updating existing player:', updateError);
          return;
        }
        
        console.log('✅ Successfully reconnected offline player');
        setCurrentPlayer(updatedPlayer);
        setIsHost(updatedPlayer.is_host);
        await refreshPlayersList();
        
        // Force immediate presence tracking for reconnected player
        if (playersChannelRef.current) {
          const presenceData = {
            user: updatedPlayer.id,
            online_at: new Date().toISOString(),
          };
          
          playersChannelRef.current.track(presenceData).then((trackStatus) => {
            console.log('👤 Presence tracking after reconnection:', trackStatus);
          }).catch((error) => {
            console.error('❌ Failed to track presence after reconnection:', error);
          });
        }
        
        // Additional refresh after reconnection to ensure other players see the update
        setTimeout(async () => {
          console.log('🔄 Additional refresh after reconnection');
          await refreshPlayersList();
        }, 1000);
        
        return;
      }
    }
    
    console.log('🆕 Creating new player...');
    
    // Prevent multiple simultaneous joins (including Strict Mode double-invocation)
    if (currentPlayer || isJoining || hasJoinedRef.current) {
      console.log('👤 Player already joined or joining in progress, skipping...');
      return;
    }
    
    // If we have an existing player ID but no current player, force reconnection
    if (playerId && !currentPlayer) {
      console.log('🔄 Force reconnection for existing player ID');
      hasJoinedRef.current = false; // Reset to allow reconnection
    }
    
    hasJoinedRef.current = true; // Mark that we've started the join process
    setIsJoining(true); // Mark that we're starting the join process
    
    try {
      console.log('🎮 Starting player join process...');
      
      // Store the player ID in sessionStorage to prevent duplicates
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('web-multiplayer-player-id', playerId);
      }
      
      // Additional check: see if we already have a player with this ID in the database
      const { data: duplicateCheck } = await supabase
        .from('web_players')
        .select('*')
        .eq('id', playerId);
      
      if (duplicateCheck && duplicateCheck.length > 0) {
        console.log('⚠️ Player ID already exists in database, skipping join...');
        return;
      }
      
      console.log('🆕 Creating new player...');
      
      // Add a small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      // Get fresh list of existing players to avoid race conditions
      const { data: existingPlayers } = await supabase
        .from('web_players')
        .select('*')
        .eq('is_online', true)
        .order('joined_at', { ascending: true });

      console.log('📊 Existing players count:', existingPlayers?.length || 0);

      // Find used slot numbers from existing online players
      const usedSlotNumbers = new Set<number>();
      if (existingPlayers) {
        existingPlayers.forEach(player => {
          const match = player.global_name.match(/Player (\d+)/);
          if (match) {
            usedSlotNumbers.add(parseInt(match[1]));
          }
        });
      }

      console.log('🔍 Used slots:', Array.from(usedSlotNumbers).sort((a, b) => a - b));

      // Find next available slot (start from 1, go up to 6)
      let availableSlot = 1;
      for (let i = 1; i <= 6; i++) {
        if (!usedSlotNumbers.has(i)) {
          availableSlot = i;
          break;
        }
      }

      // If all slots 1-6 are taken, find the next available slot number
      if (availableSlot > 6) {
        availableSlot = existingPlayers ? existingPlayers.length + 1 : 1;
      }

      const playerName = generatePlayerName(availableSlot);
      const uniqueUsername = `web_player${availableSlot}_${Date.now()}`;

      console.log(`🎮 Joining as ${playerName} (Slot: ${availableSlot})`);

      const isFirstPlayer = !existingPlayers || existingPlayers.length === 0;
      const isHostPlayer = isFirstPlayer;

      // Try to create the player, but handle potential conflicts
      let retryCount = 0;
      let newPlayer = null;
      
      while (retryCount < 3 && !newPlayer) {
        try {
          const { data: createdPlayer, error } = await supabase
            .from('web_players')
            .upsert({
              id: playerId,
              username: uniqueUsername,
              global_name: playerName,
              is_host: isHostPlayer,
              joined_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              is_online: true
            }, {
              onConflict: 'id'
            })
            .select()
            .single();

          if (error) {
            console.error('❌ Error joining as player:', error);
            return;
          }

          newPlayer = createdPlayer;
          console.log('✅ Player joined successfully:', newPlayer);
        } catch (error) {
          retryCount++;
          console.log(`�� Retry ${retryCount}/3 for player join...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!newPlayer) {
        console.error('❌ Failed to join after 3 retries');
        return;
      }

      // Verify the player was created with the correct slot
      if (newPlayer.global_name !== playerName) {
        console.error('❌ Slot assignment mismatch:', newPlayer.global_name, 'vs', playerName);
        return;
      }

      setCurrentPlayer(newPlayer);
      setIsHost(isHostPlayer);
      await refreshPlayersList(); // Crucial for UI update

      // Additional refresh after a short delay to ensure all clients see the update
      setTimeout(async () => {
        await refreshPlayersList();
      }, 500);

      if (isHostPlayer) {
        const { error: gameStateError } = await supabase
          .from('web_game_states')
          .upsert({
            instance_id: 'web-multiplayer-game',
            current_category: gameState.currentCategory,
            used_letters: gameState.usedLetters,
            is_game_active: gameState.isGameActive,
            current_player_index: gameState.currentPlayerIndex,
            round_number: gameState.roundNumber,
            host: playerId
          }, {
            onConflict: 'instance_id'
          });
        if (gameStateError) {
          console.error('❌ Error initializing game state:', gameStateError);
        }
      }
    } catch (error) {
      console.error('Failed to join as player:', error);
    } finally {
      setIsJoining(false); // Reset the joining flag
    }
  }, [generatePlayerId, generatePlayerName, gameState, refreshPlayersList, currentPlayer, isJoining]);

  // Update player's last seen timestamp
  const updateLastSeen = useCallback(async () => {
    if (!currentPlayer || !supabase) return;

    try {
      await supabase
        .from('web_players')
        .update({
          last_seen: new Date().toISOString()
        })
        .eq('id', currentPlayer.id);
    } catch (error) {
      console.error('Failed to update last seen:', error);
    }
  }, [currentPlayer, supabase]);

  // Check if current player is still marked as online (heartbeat check)
  const checkPlayerStatus = useCallback(async () => {
    if (!currentPlayer || !supabase) return;

    try {
      const { data: playerStatus } = await supabase
        .from('web_players')
        .select('is_online, last_seen')
        .eq('id', currentPlayer.id)
        .single();

      if (playerStatus && !playerStatus.is_online) {
        console.log('⚠️ Player was marked offline by another process, reconnecting...');
        // Reconnect the player
        await supabase
          .from('web_players')
          .update({
            is_online: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', currentPlayer.id);
      }
    } catch (error) {
      console.error('Failed to check player status:', error);
    }
  }, [currentPlayer, supabase]);

  // Broadcast player disconnect immediately
  const broadcastPlayerDisconnect = useCallback(async () => {
    if (!supabase || !currentPlayer) return;

    try {
      console.log('📡 Broadcasting player disconnect...');
      await supabase
        .from('web_game_events')
        .insert({
          instance_id: 'web-multiplayer-game',
          event_type: 'PLAYER_DISCONNECT',
          payload: {
            player_id: currentPlayer.id,
            player_name: currentPlayer.global_name,
            timestamp: new Date().toISOString()
          },
          player_id: currentPlayer.id
        });
    } catch (error) {
      console.error('Failed to broadcast disconnect:', error);
    }
  }, [supabase, currentPlayer]);

  // Reliable disconnect using sendBeacon
  const reliableDisconnect = useCallback(async () => {
    if (!currentPlayer) {
      console.log('❌ No current player for disconnect');
      return;
    }

    console.log('🚪 Reliable disconnect triggered for:', currentPlayer.global_name);
    console.log('🚪 Current player ID:', currentPlayer.id);
    console.log('🚪 Navigator sendBeacon available:', typeof navigator !== 'undefined' && navigator.sendBeacon);
    
    // Use sendBeacon for reliable disconnect on tab close
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const disconnectData = {
        player_id: currentPlayer.id,
        player_name: currentPlayer.global_name,
        action: 'disconnect',
        timestamp: new Date().toISOString()
      };
      
      console.log('📡 SendBeacon data:', disconnectData);
      
      const blob = new Blob([JSON.stringify(disconnectData)], { type: 'application/json' });
      const success = navigator.sendBeacon('/api/player-disconnect', blob);
      
      console.log('📡 SendBeacon result:', success ? 'SUCCESS' : 'FAILED');
      console.log('📡 SendBeacon URL:', '/api/player-disconnect');
      
      // If sendBeacon fails, try fetch as fallback
      if (!success) {
        console.log('📡 SendBeacon failed, trying fetch as fallback...');
        try {
          const response = await fetch('/api/player-disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(disconnectData)
          });
          console.log('📡 Fetch fallback result:', response.ok ? 'SUCCESS' : 'FAILED');
        } catch (error) {
          console.error('📡 Fetch fallback error:', error);
        }
      }
    } else {
      console.log('❌ SendBeacon not available');
    }
    
    // Also try to mark offline directly as backup
    if (supabase) {
      console.log('🔄 Attempting backup: direct database update...');
      supabase
        .from('web_players')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', currentPlayer.id)
        .then((result) => {
          if (result.error) {
            console.error('❌ Backup: Failed to mark player offline:', result.error);
          } else {
            console.log('✅ Backup: Player marked offline directly');
          }
        });
    } else {
      console.log('❌ Supabase not available for backup');
    }
  }, [currentPlayer, supabase]);

  // Mark player as offline when leaving
  const markPlayerOffline = useCallback(async () => {
    if (!currentPlayer || !supabase) return;

    try {
      console.log('👋 Marking web player as offline:', currentPlayer.global_name);
      
      // Broadcast disconnect event immediately
      await broadcastPlayerDisconnect();
      
      // Mark as offline in database
      await supabase
        .from('web_players')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', currentPlayer.id);

      console.log('✅ Web player marked as offline');
    } catch (error) {
      console.error('Failed to mark player offline:', error);
    }
  }, [currentPlayer, broadcastPlayerDisconnect]);

  // Track presence when player is ready
  useEffect(() => {
    if (currentPlayer && playersChannelRef.current && isConnected) {
      console.log('👤 Setting up presence tracking for:', currentPlayer.global_name);
      
      const trackPresence = async () => {
        // Add a small delay to ensure channel is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if we already have a presence entry for this player
        if (playersChannelRef.current) {
          const presenceState = playersChannelRef.current.presenceState();
          const existingPresence = Object.values(presenceState).flat().find((p: any) => p.user === currentPlayer.id);
          
          if (existingPresence) {
            console.log('👤 Found existing presence for player, skipping track');
            return;
          }
        }
        
        // Use the same presence key that was used when creating the channel
        const existingPlayerId = typeof window !== 'undefined' ? sessionStorage.getItem('web-multiplayer-player-id') : null;
        const presenceKey = existingPlayerId || currentPlayer?.id || `user-${Date.now()}`;
        
        console.log('🔑 Tracking presence with key:', presenceKey);
        
        const presenceData = {
          user: currentPlayer.id,
          online_at: new Date().toISOString(),
        };
        
        try {
          const trackStatus = await playersChannelRef.current.track(presenceData);
          console.log('👤 Presence tracking status:', trackStatus);
          console.log('👤 Tracking presence for:', currentPlayer.global_name);
          console.log('👤 Presence data sent:', JSON.stringify(presenceData, null, 2));
          
          // Test presence state after tracking
          setTimeout(() => {
            const presenceState = playersChannelRef.current.presenceState();
            console.log('👤 Presence state after tracking:', presenceState);
          }, 1000);
        } catch (error) {
          console.error('❌ Failed to track presence:', error);
        }
      };
      
      trackPresence();
    }
  }, [currentPlayer, isConnected]);

      // Set up real-time subscriptions
    useEffect(() => {
      if (!supabase) {
        return;
      }

      // Prevent multiple initializations
      if (hasInitializedRef.current) {
        console.log('⚠️ Already initialized, skipping...');
        return;
      }
      hasInitializedRef.current = true;

      let playersChannel: any = null;
      let gameStateChannel: any = null;
      let gameEventsChannel: any = null;
      let fallbackInterval: NodeJS.Timeout | null = null;


      


    const setupSubscriptions = async () => {
      // Prevent multiple simultaneous setup attempts
      if (isReconnecting) {
        console.log('⚠️ Already reconnecting, skipping setup...');
        return;
      }
      
      try {
        console.log('🔗 Setting up reliable WebSocket connections...');
        setConnectionStatus('connecting');
        setIsConnected(false);
        
        // Get the player ID from sessionStorage or generate a stable one
        const existingPlayerId = typeof window !== 'undefined' ? sessionStorage.getItem('web-multiplayer-player-id') : null;
        const presenceKey = existingPlayerId || currentPlayer?.id || `user-${Date.now()}`;
        
        console.log('🔑 Using presence key:', presenceKey);
        console.log('🔑 Current player ID:', currentPlayer?.id);
        console.log('🔑 Session storage ID:', existingPlayerId);
        
        // Subscribe to player changes with Presence for reliable online/offline tracking
        playersChannel = supabase
          .channel('web-players', {
            config: {
              presence: {
                key: presenceKey, // Use stable key from sessionStorage or current player
              },
              broadcast: {
                self: true,
              },
            },
          });
        
        // Store channel in ref for presence tracking
        playersChannelRef.current = playersChannel;
        
        playersChannel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'web_players' },
            async (payload) => {
              console.log('📡 Player change detected:', payload.eventType, payload.new);
              await refreshPlayersList(); // Always refresh on any player change
            }
          )
          .on('presence', { event: 'sync' }, () => {
            const newState = playersChannel.presenceState();
            console.log('👥 sync', newState);
            
            // If we're connected but status shows disconnected, fix it immediately
            if (connectionStatus !== 'connected' || !isConnected) {
              console.log('🔧 Fixing connection status after presence sync');
              setConnectionStatus('connected');
              setIsConnected(true);
            }
            // Clear any reconnecting flags since we're stable
            if (isReconnecting) {
              console.log('🔧 Clearing reconnecting flag - connection is stable');
              setIsReconnecting(false);
            }
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('👋 join', key, newPresences);
            // Refresh players list when someone joins
            refreshPlayersList();
            
            // Additional refresh after a delay to ensure all clients see the update
            setTimeout(() => {
              console.log('🔄 Additional refresh after join event');
              refreshPlayersList();
            }, 1000);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('👋 leave', key, leftPresences);
            // Refresh players list when someone leaves
            refreshPlayersList();
            
            // Also mark the player as offline in the database
            if (leftPresences && leftPresences.length > 0) {
              leftPresences.forEach(async (presence: any) => {
                if (presence.user) {
                  // Check if the player is actually online in the database before marking them offline
                  const { data: playerData } = await supabase
                    .from('web_players')
                    .select('is_online, last_seen')
                    .eq('id', presence.user)
                    .single();
                  
                  if (playerData && playerData.is_online) {
                    // Check if this is a recent activity (within last 10 seconds) - shorter window for refresh detection
                    const lastSeenAge = Date.now() - new Date(playerData.last_seen).getTime();
                    const isRecentActivity = lastSeenAge < 10000; // 10 seconds
                    
                    if (isRecentActivity) {
                      console.log('🔄 Ignoring leave event for recently active player (likely refresh):', presence.user);
                      return;
                    }
                  }
                  
                  // Don't mark the current player offline if they're reconnecting
                  if (currentPlayer && presence.user === currentPlayer.id) {
                    console.log('🔄 Ignoring leave event for current player (reconnecting):', presence.user);
                    return;
                  }
                  
                  console.log('🔄 Marking player offline due to presence leave:', presence.user);
                  supabase
                    .from('web_players')
                    .update({
                      is_online: false,
                      last_seen: new Date().toISOString()
                    })
                    .eq('id', presence.user)
                    .then((result) => {
                      if (result.error) {
                        console.error('❌ Failed to mark player offline:', result.error);
                      } else {
                        console.log('✅ Player marked offline due to presence leave');
                      }
                    });
                }
              });
            }
          })
          .subscribe((status) => {
            console.log('📡 Players channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Players WebSocket connected');
              setConnectionStatus('connected');
              setIsConnected(true); // Also update isConnected state
              setIsReconnecting(false); // Clear reconnecting flag when connected
              console.log('🔄 Connection status updated: connected');
              
              // Presence tracking is handled in a separate useEffect
              console.log('✅ WebSocket connected, presence tracking will be set up when player is ready');
            } else if (status === 'SUBSCRIBING' as any) {
              console.log('📡 Players channel status: subscribing');
              setConnectionStatus('connecting');
              setIsConnected(false);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.log('⚠️ Players WebSocket status:', status);
              
              // Only attempt reconnection if we were previously connected and not already reconnecting
              if (!isReconnecting && connectionStatus === 'connected') {
                console.log('🔄 Reconnecting due to connection loss...');
                setConnectionStatus('disconnected');
                setIsConnected(false);
                setIsReconnecting(true);
                
                // Use a shorter retry delay for faster recovery
                const retryDelay = 2000; // 2 seconds instead of 5-30 seconds
                
                setTimeout(() => {
                  console.log(`🔄 Retrying WebSocket connection in ${retryDelay}ms...`);
                  if (playersChannel) {
                    playersChannel.unsubscribe();
                    setupSubscriptions();
                  }
                  setIsReconnecting(false);
                }, retryDelay);
              } else if (!isReconnecting && connectionStatus !== 'connected') {
                // If we weren't connected, this might be initial setup - don't retry immediately
                console.log('📡 Initial connection setup in progress...');
                // Don't trigger immediate retry for initial setup
              }
            }
          });

        // Subscribe to game state changes
        gameStateChannel = supabase
          .channel('web-game-state', {
            config: {
              broadcast: {
                self: true,
              },
            },
          })
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'web_game_states', filter: `instance_id=eq.web-multiplayer-game` },
            (payload) => {
              const newState = payload.new as any;
              console.log('📡 Game state update received:', newState);
              console.log('📡 Previous game state:', gameState);
              
              setGameState(prev => ({
                currentCategory: newState.current_category,
                usedLetters: newState.used_letters,
                isGameActive: newState.is_game_active,
                currentPlayerIndex: newState.current_player_index,
                playerScores: newState.player_scores,
                roundNumber: newState.round_number,
                timerDuration: newState.timer_duration,
                host: newState.host,
                lastAction: null,
                // Don't sync losing player from DB - keep it local only
                losingPlayer: prev.losingPlayer
              }));
              
              console.log('📡 New game state set:', {
                currentCategory: newState.current_category,
                isGameActive: newState.is_game_active,
                roundNumber: newState.round_number
              });
            }
          )
          .subscribe((status) => {
            console.log('📡 Game state channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Game state WebSocket connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.log('📡 Game state channel status:', status);
              // Don't trigger immediate retry - let the players channel handle reconnection
            }
          });

        // Subscribe to game events
        gameEventsChannel = supabase
          .channel('web-game-events', {
            config: {
              broadcast: {
                self: true,
              },
            },
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'web_game_events', filter: `instance_id=eq.web-multiplayer-game` },
            (payload) => {
              const event = payload.new as any;
              console.log('📡 Game event received:', event.event_type);
              
              // Handle different event types
              if (event.event_type === 'PLAYER_DISCONNECT') {
                console.log('👋 Player disconnected:', event.payload.player_name);
                // Immediately refresh players list when someone disconnects
                refreshPlayersList();
              } else if (event.event_type === 'ROUND_TIMEOUT') {
                console.log('⏰ Round timeout event received:', event.payload);
                // Sync losing history from other players
                if (event.payload.losingHistory) {
                  setLosingHistory(event.payload.losingHistory);
                }
                // Set local losing player if not already set
                if (!localLosingPlayer && event.payload.playerId) {
                  const losingPlayer = players.find(p => p.id === event.payload.playerId);
                  if (losingPlayer) {
                    setLocalLosingPlayer({
                      id: losingPlayer.id,
                      name: losingPlayer.global_name
                    });
                  }
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Game events channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Game events WebSocket connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.log('📡 Game events channel status:', status);
              // Don't trigger immediate retry - let the players channel handle reconnection
            }
          });

        setIsConnected(true);
        console.log('✅ All WebSocket connections setup complete');
      } catch (error) {
        console.error('❌ Error setting up subscriptions:', error);
        console.log('🔄 Falling back to polling mode...');
        setupFallbackPolling();
      }
    };

    const setupFallbackPolling = () => {
      console.log('🔄 Setting up fallback polling...');
      setIsConnected(true); // Still mark as connected for polling
      setConnectionStatus('polling');
      // Poll every 3 seconds as fallback
      fallbackInterval = setInterval(async () => {
        await refreshPlayersList();
      }, 3000);
    };

    const checkConnectionHealth = () => {
      if (playersChannel && playersChannel.subscribe) {
        const status = playersChannel.subscribe.status;
        console.log('🔍 Connection health check:', status);
        
        // Only trigger reconnection if we're actually disconnected
        if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && connectionStatus === 'connected') {
          console.log('🔄 Reconnecting due to health check failure...');
          setupSubscriptions();
        } else if (status === 'SUBSCRIBED' && connectionStatus !== 'connected') {
          // If we're connected but status shows disconnected, fix it
          console.log('✅ Fixing connection status - actually connected');
          setConnectionStatus('connected');
          setIsConnected(true);
        }
      }
      
      // Also check if we're still connected after 30 seconds
      if (connectionStatus === 'connected') {
        console.log('✅ Connection health check passed');
      }
    };

    // Add a small delay to prevent race conditions during initial setup
    setTimeout(() => {
      setupSubscriptions();
    }, 100);

    setTimeout(async () => {
      await refreshPlayersList(); // First refresh the players list to see current state
      // Add a small delay to ensure localStorage is available
      await new Promise(resolve => setTimeout(resolve, 100));
      joinAsPlayer(); // Then join as player
      
      // Initialize game state if it doesn't exist
      try {
        const { data: existingGameState } = await supabase
          .from('web_game_states')
          .select('*')
          .eq('instance_id', 'web-multiplayer-game')
          .maybeSingle();
        
        if (!existingGameState) {
          console.log('🎮 Initializing game state...');
                                    const { error: initError } = await supabase
                .from('web_game_states')
                .insert({
                  instance_id: 'web-multiplayer-game',
                  current_category: getRandomCategory(),
                  used_letters: [],
                  is_game_active: false,
                  current_player_index: 0,
                  player_scores: {},
                  round_number: 0,
                  host: null
                });
          
          if (initError) {
            console.error('❌ Error initializing game state:', initError);
          } else {
            console.log('✅ Game state initialized');
          }
        } else {
          console.log('✅ Game state already exists');
        }
      } catch (error) {
        console.error('❌ Error checking game state:', error);
      }
    }, 100);

    const lastSeenInterval = setInterval(updateLastSeen, 15000); // Update every 15 seconds instead of 30
    const cleanupInterval = setInterval(cleanupOldPlayers, 60 * 1000); // Run every 60 seconds instead of 30
    const healthCheckInterval = setInterval(checkConnectionHealth, 120000); // Check every 2 minutes (much less frequent)
    const heartbeatInterval = setInterval(checkPlayerStatus, 15000); // Check player status every 15 seconds
    
    // Periodic players list refresh to ensure sync
    const playersRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic players list refresh');
      refreshPlayersList();
    }, 10000); // Refresh every 10 seconds
    
    // Add connection status verification
    const connectionStatusInterval = setInterval(() => {
      if (playersChannel && playersChannel.subscribe) {
        const status = playersChannel.subscribe.status;
        if (status === 'SUBSCRIBED' && (connectionStatus !== 'connected' || !isConnected)) {
          console.log('🔧 Fixing connection status - WebSocket is actually connected');
          setConnectionStatus('connected');
          setIsConnected(true);
        } else if (status === 'CLOSED' && connectionStatus === 'connected') {
          console.log('🔧 Fixing connection status - WebSocket is actually disconnected');
          setConnectionStatus('disconnected');
          setIsConnected(false);
        }
      }
      
      // Only force connection status if stuck on connecting for more than 30 seconds
      if (connectionStatus === 'connecting' && !isConnected) {
        console.log('🔧 Checking if stuck on connecting...');
        // Check if we can actually connect by trying a simple operation
        if (supabase) {
          supabase.from('web_players').select('count').limit(1).then((result) => {
            if (result.error) {
              console.log('🔧 Database connection failed, keeping disconnected status');
              // Don't force status change - let the WebSocket handle it
            } else {
              console.log('🔧 Database connection works, but waiting for WebSocket to connect');
              // Don't force status change - let the WebSocket handle it
            }
          });
        }
      }
    }, 30000); // Check every 30 seconds (much less frequent to prevent interference)
    
    // Multiple event listeners for tab close
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { 
      console.log('🚪 BEFOREUNLOAD: Tab closing, marking player offline...');
      console.log('🚪 BEFOREUNLOAD: Current player:', currentPlayer?.global_name);
      console.log('🚪 BEFOREUNLOAD: Event triggered at:', new Date().toISOString());
      
      // Untrack from presence immediately
      if (playersChannelRef.current) {
        playersChannelRef.current.untrack().catch(console.error);
      }
      
      // Show confirmation dialog to give time for disconnect
      if (currentPlayer) {
        const message = `Are you sure you want to leave? Player "${currentPlayer.global_name}" will be disconnected.`;
        event.preventDefault();
        event.returnValue = message;
        
        // Send disconnect message immediately
        reliableDisconnect().catch(console.error);
        markPlayerOffline();
        
        // Clear sessionStorage when tab is actually closed
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('web-multiplayer-player-id');
        }
        
        return message;
      }
    };
    const handlePageHide = () => { 
      console.log('📱 PAGEHIDE: Page hiding, marking player offline...');
      console.log('📱 PAGEHIDE: Current player:', currentPlayer?.global_name);
      console.log('📱 PAGEHIDE: Event triggered at:', new Date().toISOString());
      
      // Untrack from presence immediately
      if (playersChannelRef.current) {
        playersChannelRef.current.untrack().catch(console.error);
      }
      
      reliableDisconnect().catch(console.error);
      markPlayerOffline(); 
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ VISIBILITYCHANGE: Page hidden, marking player offline...');
        console.log('👁️ VISIBILITYCHANGE: Current player:', currentPlayer?.global_name);
        console.log('👁️ VISIBILITYCHANGE: Event triggered at:', new Date().toISOString());
        
        // Untrack from presence immediately
        if (playersChannelRef.current) {
          playersChannelRef.current.untrack().catch(console.error);
        }
        
        reliableDisconnect().catch(console.error);
        markPlayerOffline();
      }
    };
    const handleUnload = () => {
      console.log('🚪 UNLOAD: Tab unload, marking player offline...');
      console.log('🚪 UNLOAD: Current player:', currentPlayer?.global_name);
      console.log('🚪 UNLOAD: Event triggered at:', new Date().toISOString());
      
      // Untrack from presence immediately
      if (playersChannelRef.current) {
        playersChannelRef.current.untrack().catch(console.error);
      }
      
      reliableDisconnect().catch(console.error);
      markPlayerOffline();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (playersChannel) playersChannel.unsubscribe();
      if (gameStateChannel) gameStateChannel.unsubscribe();
      if (gameEventsChannel) gameEventsChannel.unsubscribe();
      if (fallbackInterval) clearInterval(fallbackInterval);
      clearInterval(lastSeenInterval);
      clearInterval(cleanupInterval);
      clearInterval(healthCheckInterval); // Clear the new health check interval
      clearInterval(heartbeatInterval); // Clear the heartbeat interval
      clearInterval(connectionStatusInterval); // Clear the connection status interval
      clearInterval(playersRefreshInterval); // Clear the players refresh interval
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Reset the join ref for next mount
      hasJoinedRef.current = false;
      // Mark player offline on cleanup
      if (currentPlayer) {
        markPlayerOffline();
      }
      // Don't mark player offline here - let the event listeners handle it
    };
  }, [supabase, joinAsPlayer, updateLastSeen, refreshPlayersList, cleanupOldPlayers, checkPlayerStatus, isJoining]);

  // Broadcast game event
  const broadcastEvent = useCallback(async (eventType: string, payload: any) => {
    if (!supabase || !currentPlayer) return;

    try {
      await supabase
        .from('web_game_events')
        .insert({
          instance_id: 'web-multiplayer-game',
          event_type: eventType,
          payload: payload,
          player_id: currentPlayer.id
        });
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }, [supabase, currentPlayer]);

  // Update game state
  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    if (!supabase) return;

    try {
      console.log('🔄 Updating web game state:', newState);
      
      const updateData: any = {
        current_category: newState.currentCategory || gameState.currentCategory,
        used_letters: newState.usedLetters || gameState.usedLetters,
        is_game_active: newState.isGameActive ?? gameState.isGameActive,
        current_player_index: newState.currentPlayerIndex ?? gameState.currentPlayerIndex,
        player_scores: newState.playerScores || gameState.playerScores,
        round_number: newState.roundNumber ?? gameState.roundNumber,
        host: newState.host ?? gameState.host
      };

      // Only include timer_duration if the column exists
      if (newState.timerDuration !== undefined || gameState.timerDuration !== undefined) {
        updateData.timer_duration = newState.timerDuration ?? gameState.timerDuration;
      }

      const { error } = await supabase
        .from('web_game_states')
        .update(updateData)
        .eq('instance_id', 'web-multiplayer-game');

      if (error) {
        console.error('❌ Error updating game state:', error);
      } else {
        console.log('✅ Web game state updated successfully');
      }
    } catch (error) {
      console.error('Update game state error:', error);
    }
  }, [supabase, gameState]);

  // Game actions
  const startNewRound = useCallback(async () => {
    if (!isHost) {
      console.log('⚠️ Non-host web user tried to start round');
      return;
    }

    console.log('🎮 Web host starting new round');
    console.log('🎮 Current game state before start:', gameState);
    
    const randomCategory = getRandomCategory();

    const newState = {
      currentCategory: randomCategory,
      usedLetters: [],
      isGameActive: true,
      currentPlayerIndex: 0,
      roundNumber: gameState.roundNumber + 1
    };

    console.log('🔄 Web round state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    setLocalLosingPlayer(null); // Clear local losing player on new round
    // Don't clear losing history - let it persist across rounds
    
    console.log('🔄 Updating game state in database...');
    await updateGameState(newState);
    console.log('🔄 Broadcasting ROUND_START event...');
    await broadcastEvent('ROUND_START', { category: randomCategory });
    console.log('✅ Round start complete');
  }, [isHost, gameState.roundNumber, updateGameState, broadcastEvent]);

  const selectLetter = useCallback(async (letter: string) => {
    if (!currentPlayer || gameState.usedLetters.includes(letter)) {
      console.log('⚠️ Web user cannot select letter:', letter);
      return;
    }

    const currentPlayerInGame = players[gameState.currentPlayerIndex];
    if (currentPlayerInGame?.id !== currentPlayer.id) {
      console.log('⚠️ Web user tried to select letter out of turn:', letter);
      return;
    }

    console.log('🎯 Web user selecting letter:', letter);

    const newState = {
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % players.length
    };

    console.log('🔄 Web letter selection state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    updateGameState(newState);
    broadcastEvent('LETTER_SELECTED', { letter });
  }, [currentPlayer, gameState, players, updateGameState, broadcastEvent]);

  const handleTimerTimeout = useCallback(async () => {
    // Check if the current user is the player whose turn it is
    const currentPlayerInGame = players[gameState.currentPlayerIndex];
    if (currentPlayerInGame?.id !== currentPlayer?.id) {
      console.log('⚠️ Not your turn - cannot end round on timeout');
      return;
    }

    console.log('⏰ Timer timeout - ending round');
    
    const losingPlayer = {
      id: currentPlayerInGame.id,
      name: currentPlayerInGame.global_name
    };
    
    const newState = {
      isGameActive: false,
      currentPlayerIndex: 0
    };

    console.log('🔄 Ending round due to timeout - losing player:', losingPlayer.name);
    setGameState(prev => ({ ...prev, ...newState }));
    setLocalLosingPlayer(losingPlayer); // Set local losing player
    
    // Update losing history
    setLosingHistory(prev => ({
      ...prev,
      [losingPlayer.id]: (prev[losingPlayer.id] || 0) + 1
    }));
    
    updateGameState(newState);
    broadcastEvent('ROUND_TIMEOUT', { 
      playerId: losingPlayer.id,
      playerName: losingPlayer.name,
      losingHistory: {
        ...losingHistory,
        [losingPlayer.id]: (losingHistory[losingPlayer.id] || 0) + 1
      }
    });
      }, [currentPlayer, gameState.currentPlayerIndex, players, updateGameState, broadcastEvent, losingHistory]);

  const resetGame = useCallback(() => {
    if (!isHost) {
      console.log('⚠️ Non-host web user tried to reset game');
      return;
    }

    console.log('🔄 Web host resetting game');
    
    const resetScores = players.reduce((acc, p) => {
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

    console.log('🔄 Web reset state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    setLocalLosingPlayer(null); // Clear local losing player on reset
    setLosingHistory({}); // Clear losing history only on full game reset
    
    updateGameState(newState);
    broadcastEvent('GAME_RESET', {});
  }, [isHost, players, updateGameState, broadcastEvent]);

  const getCurrentPlayer = useCallback(() => {
    return players[gameState.currentPlayerIndex] || null;
  }, [players, gameState.currentPlayerIndex]);

  const isCurrentPlayer = useCallback(() => {
    const currentPlayerInGame = getCurrentPlayer();
    return currentPlayerInGame?.id === currentPlayer?.id;
  }, [getCurrentPlayer, currentPlayer]);

  const handleConfirmLeave = async () => {
    if (currentPlayer) {
      console.log('🚪 User confirmed leaving, sending disconnect...');
      await reliableDisconnect();
      await markPlayerOffline();
      setShowLeaveWarning(false);
      // Close the tab/window
      window.close();
    }
  };

  const handleCancelLeave = () => {
    console.log('🚪 User cancelled leaving');
    setShowLeaveWarning(false);
  };

  const setShowLeaveWarningState = (show: boolean) => {
    setShowLeaveWarning(show);
  };

  // Change player name
  const changePlayerName = useCallback(async (newName: string) => {
    if (!supabase || !currentPlayer || !newName.trim()) return;

    try {
      console.log('🔄 Changing player name from', currentPlayer.global_name, 'to', newName);
      
      const { error } = await supabase
        .from('web_players')
        .update({ 
          global_name: newName.trim(),
          username: newName.trim().toLowerCase().replace(/\s+/g, '_')
        })
        .eq('id', currentPlayer.id);

      if (error) {
        console.error('❌ Error changing player name:', error);
        return false;
      } else {
        console.log('✅ Player name changed successfully');
        // Update local state
        setCurrentPlayer(prev => prev ? { ...prev, global_name: newName.trim() } : null);
        return true;
      }
    } catch (error) {
      console.error('Failed to change player name:', error);
      return false;
    }
  }, [supabase, currentPlayer]);

  return {
    players,
    gameState,
    currentPlayer,
    isHost,
    isConnected,
    connectionStatus,
    startNewRound,
    resetGame,
    selectLetter,
    handleTimerTimeout,
    getCurrentPlayer,
    isCurrentPlayer,
    showLeaveWarning,
    handleConfirmLeave,
    handleCancelLeave,
    setShowLeaveWarning: setShowLeaveWarningState,
    changePlayerName,
    localLosingPlayer,
    losingHistory
  };
}; 