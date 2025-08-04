import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/data/categories';

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
}

interface WebMultiplayerReturn {
  players: Player[];
  gameState: GameState;
  currentPlayer: Player | null;
  isHost: boolean;
  isConnected: boolean;
  startNewRound: () => void;
  resetGame: () => void;
  selectLetter: (letter: string) => void;
  getCurrentPlayer: () => Player | null;
  isCurrentPlayer: () => boolean;
}

export const useWebMultiplayer = (): WebMultiplayerReturn => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentCategory: { id: "animals", es: "Animales", en: "Animals" },
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    playerScores: {},
    roundNumber: 1,
    timerDuration: 30,
    host: null,
    lastAction: null
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false); // Track if we're currently joining

  // Generate unique player ID
  const generatePlayerId = useCallback(() => {
    // Generate a truly unique ID for this tab instance
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const browserId = navigator.userAgent.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '');
    const tabId = Math.random().toString(36).substring(2, 10); // Unique per tab
    const playerId = `web-${timestamp}-${randomPart}-${browserId}-${tabId}`;
    
    return playerId;
  }, []);

  // Generate player name based on slot
  const generatePlayerName = useCallback((slotNumber: number) => {
    return `Player ${slotNumber}`;
  }, []);

  // Clean up old offline players
  const cleanupOldPlayers = useCallback(async () => {
    if (!supabase) return;

    try {
      const { error: cleanupError } = await supabase
        .from('web_players')
        .update({ is_online: false })
        .lt('last_seen', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Changed from 2 to 10 minutes
        .eq('is_online', true);

      if (cleanupError) {
        console.error('❌ Error cleaning up old players:', cleanupError);
      } else {
        console.log('✅ Cleaned up old offline players');
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
        console.log('📊 Raw players data:', updatedPlayers);
        setPlayers(updatedPlayers);
        console.log('📊 Players list updated:', updatedPlayers.length, 'players');
      }
    } catch (error) {
      console.error('Failed to refresh players list:', error);
    }
  }, [supabase]);

  // Join as player with slot assignment
  const joinAsPlayer = useCallback(async () => {
    if (!supabase) return;
    
    // Prevent multiple simultaneous joins
    if (currentPlayer || isJoining) {
      console.log('👤 Player already joined or joining in progress, skipping...');
      return;
    }
    
    setIsJoining(true); // Mark that we're starting the join process
    
    try {
      console.log('🎮 Starting player join process...');
      const playerId = generatePlayerId();
      console.log('🆔 Generated player ID:', playerId);
      
      // Check if this player ID already exists
      const { data: existingPlayer } = await supabase
        .from('web_players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors
      
      if (existingPlayer) {
        console.log('👤 Player already exists, updating to online...');
        
        // Update the existing player to be online
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
        
        setCurrentPlayer(updatedPlayer);
        setIsHost(updatedPlayer.is_host);
        await refreshPlayersList();
        return;
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
          console.log(`🔄 Retry ${retryCount}/3 for player join...`);
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
  }, [currentPlayer]);

  // Mark player as offline when leaving
  const markPlayerOffline = useCallback(async () => {
    if (!currentPlayer || !supabase) return;

    try {
      console.log('👋 Marking web player as offline:', currentPlayer.global_name);
      
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
  }, [currentPlayer]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!supabase) {
      return;
    }

    // Subscribe to player changes
    const playersChannel = supabase
      .channel('web-players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'web_players' },
        async (payload) => {
          console.log('📡 Player change detected:', payload.eventType, payload.new);
          await refreshPlayersList(); // Always refresh on any player change
        }
      )
      .subscribe();

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel('web-game-state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'web_game_states', filter: `instance_id=eq.web-multiplayer-game` },
        (payload) => {
          const newState = payload.new as any;
          setGameState({
            currentCategory: newState.current_category,
            usedLetters: newState.used_letters,
            isGameActive: newState.is_game_active,
            currentPlayerIndex: newState.current_player_index,
            playerScores: newState.player_scores,
            roundNumber: newState.round_number,
            timerDuration: newState.timer_duration,
            host: newState.host,
            lastAction: null
          });
        }
      )
      .subscribe();

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel('web-game-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'web_game_events', filter: `instance_id=eq.web-multiplayer-game` },
        (payload) => {
          const event = payload.new as any;
          // Handle game events here
        }
      )
      .subscribe();

    setIsConnected(true);

    setTimeout(async () => {
      await refreshPlayersList(); // First refresh the players list to see current state
      joinAsPlayer(); // Then join as player
    }, 100);

    const lastSeenInterval = setInterval(updateLastSeen, 30000);
    const cleanupInterval = setInterval(cleanupOldPlayers, 5 * 60 * 1000); // Changed from 1 minute to 5 minutes
    
    // Multiple event listeners for tab close
    const handleBeforeUnload = () => { 
      console.log('🚪 Tab closing, marking player offline...');
      markPlayerOffline(); 
    };
    const handlePageHide = () => { 
      console.log('📱 Page hiding, marking player offline...');
      markPlayerOffline(); 
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Page hidden, marking player offline...');
        markPlayerOffline();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      playersChannel.unsubscribe();
      gameStateChannel.unsubscribe();
      gameEventsChannel.unsubscribe();
      clearInterval(lastSeenInterval);
      clearInterval(cleanupInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Don't mark player offline here - let the event listeners handle it
    };
  }, [supabase, joinAsPlayer, updateLastSeen, refreshPlayersList, cleanupOldPlayers, isJoining]);

  // Broadcast game event
  const broadcastEvent = useCallback(async (eventType: string, payload: any) => {
    if (!supabase || !currentPlayer) return;

    try {
      console.log('📡 Broadcasting web game event:', eventType, payload);
      
      const { error } = await supabase
        .from('web_game_events')
        .insert({
          instance_id: 'web-multiplayer-game',
          event_type: eventType,
          payload,
          player_id: currentPlayer.id
        });

      if (error) {
        console.error('❌ Error broadcasting event:', error);
      } else {
        console.log('✅ Web game event broadcasted successfully');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }, [supabase, currentPlayer]);

  // Update game state
  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    if (!supabase) return;

    try {
      console.log('🔄 Updating web game state:', newState);
      
      const { error } = await supabase
        .from('web_game_states')
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
  const startNewRound = useCallback(() => {
    if (!isHost) {
      console.log('⚠️ Non-host web user tried to start round');
      return;
    }

    console.log('🎮 Web host starting new round');
    
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

    console.log('🔄 Web round state:', newState);
    setGameState(prev => ({ ...prev, ...newState }));
    
    updateGameState(newState);
    broadcastEvent('ROUND_START', { category: randomCategory });
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

  return {
    players,
    gameState,
    currentPlayer,
    isHost,
    isConnected,
    startNewRound,
    resetGame,
    selectLetter,
    getCurrentPlayer,
    isCurrentPlayer
  };
}; 