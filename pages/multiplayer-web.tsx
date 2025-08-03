import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Crown, User, Clock, Play, Square, Users, Wifi, WifiOff } from "lucide-react";

// Game configuration
const MAX_PLAYERS = 6;
const TURN_TIMER_DURATION = 15; // seconds per turn
const GAME_INSTANCE_ID = 'web-multiplayer-game';

// Test categories
const categories = [
  { id: "animals", es: "Animales", en: "Animals" },
  { id: "colors", es: "Colores", en: "Colors" },
  { id: "food", es: "Comida", en: "Food" },
  { id: "countries", es: "Países", en: "Countries" },
  { id: "professions", es: "Profesiones", en: "Professions" },
  { id: "objects", es: "Objetos", en: "Objects" }
];

// Player interface
interface Player {
  id: string;
  user_id: string; // Add missing user_id property
  username: string;
  global_name: string;
  avatar: string | null;
  is_host: boolean;
  joined_at: string;
  is_online: boolean;
}

// Game state interface
interface GameState {
  currentCategory: any;
  usedLetters: string[];
  isGameActive: boolean;
  currentPlayerIndex: number;
  roundNumber: number;
  timerDuration: number;
  host: string | null;
  // Removed turnStartTime as it doesn't exist in the database schema
}

// Letter grid component
const LetterGrid = ({ usedLetters, onLetterSelect, disabled, timeLeft }: {
  usedLetters: Set<string>;
  onLetterSelect: (letter: string) => void;
  disabled: boolean;
  timeLeft: number;
}) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return (
    <div className="space-y-4">
      {/* Timer */}
      {!disabled && (
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
            timeLeft <= 5 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
          }`}>
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg">{timeLeft}s</span>
          </div>
        </div>
      )}
      
      {/* Letter Grid */}
      <div className="grid grid-cols-6 gap-2 max-w-lg mx-auto">
        {letters.map((letter) => {
          const isUsed = usedLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => !disabled && !isUsed && onLetterSelect(letter)}
              disabled={disabled || isUsed}
              className={`
                aspect-square rounded-lg font-bold text-lg transition-all duration-200
                ${isUsed 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : timeLeft <= 5
                  ? 'bg-red-500 hover:bg-red-600 text-white hover:scale-105 active:scale-95 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 active:scale-95'
                }
              `}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Player card component
const PlayerCard = ({ player, isCurrentTurn, currentPlayer, currentPlayerId }: {
  player: Player;
  isCurrentTurn: boolean;
  currentPlayer?: boolean;
  currentPlayerId: string;
}) => {
  const isYou = player.user_id === currentPlayerId;
  
  return (
    <div className={`
      p-4 rounded-xl border-2 transition-all duration-300
      ${isCurrentTurn 
        ? 'border-green-500 bg-green-50 shadow-lg scale-105' 
        : 'border-gray-200 bg-white'
      }
      ${!player.is_online ? 'opacity-60' : ''}
      ${isYou ? 'ring-2 ring-blue-300' : ''}
    `}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isYou ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'
          }`}>
            <User className="h-5 w-5 text-white" />
          </div>
          {/* Online indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            player.is_online ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{player.global_name}</h3>
            {player.is_host && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
            {isYou && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">You</span>}
          </div>
          <p className="text-xs text-gray-600 truncate">@{player.username} ({player.user_id.slice(-8)})</p>
        </div>
        
        {isCurrentTurn && (
          <div className="text-green-600 animate-pulse">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function MultiplayerWeb() {
  const [gameState, setGameState] = useState<GameState>({
    currentCategory: categories[0],
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    roundNumber: 1,
    timerDuration: TURN_TIMER_DURATION,
    host: null,
    // Removed turnStartTime as it doesn't exist in the database schema
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [timeLeft, setTimeLeft] = useState<number>(TURN_TIMER_DURATION);
  
  // Helper functions (moved up to fix dependency issues)
  const isHost = () => players.find(p => p.user_id === currentPlayerId)?.is_host || false;
  const isCurrentPlayer = () => {
    if (players.length === 0) return false;
    const currentPlayer = players[gameState.currentPlayerIndex];
    return currentPlayer?.user_id === currentPlayerId;
  };
  const getCurrentPlayer = () => players[gameState.currentPlayerIndex];
  
  // Generate truly unique player ID with multiple entropy sources
  const generatePlayerId = () => {
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substr(2, 9);
    const random2 = Math.random().toString(36).substr(2, 9);
    const random3 = Math.random().toString(36).substr(2, 9);
    const tabId = Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substr(2, 6);
    const browserId = navigator.userAgent.length.toString(36);
    return `player-${timestamp}-${random1}-${random2}-${random3}-${tabId}-${sessionId}-${browserId}`;
  };

  // Auto-join game when component mounts
  useEffect(() => {
    const STORAGE_KEY = `multiplayer_player_${GAME_INSTANCE_ID}`;
    const LOCK_KEY = `joining_${GAME_INSTANCE_ID}`;
    
    const joinGame = async () => {
      if (!supabase) return;
      
      // Immediate lock to prevent race conditions
      const isLocked = sessionStorage.getItem(LOCK_KEY);
      if (isLocked === 'true') {
        console.log('🔒 Join already in progress, skipping');
        return;
      }
      
      // Set lock immediately
      sessionStorage.setItem(LOCK_KEY, 'true');
      
      try {
        // Check if this browser tab already has a player
        const existingPlayerId = localStorage.getItem(STORAGE_KEY);
        const sessionJoined = sessionStorage.getItem(`joined_${GAME_INSTANCE_ID}`);
        
        console.log('🔍 Checking existing player:', { existingPlayerId, sessionJoined });
        
        if (sessionJoined === 'true' && existingPlayerId) {
          console.log('⚠️ Already joined in this session, skipping');
          setCurrentPlayerId(existingPlayerId);
          setConnectionStatus('connected');
          // Fetch current players for UI
          const { data: players } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', GAME_INSTANCE_ID)
            .order('joined_at', { ascending: true });
          if (players) {
            setPlayers(players.map(p => ({ ...p, is_online: true })));
          }
          return;
        }
        
        // Generate new player ID for this session
        const playerId = generatePlayerId();
        localStorage.setItem(STORAGE_KEY, playerId);
        setCurrentPlayerId(playerId);
        
        console.log('🎮 Starting fresh join process with ID:', playerId.slice(-8));

        // Get current players
        let { data: existingPlayers, error: fetchError } = await supabase
          .from('participants')
          .select('*')
          .eq('instance_id', GAME_INSTANCE_ID)
          .order('joined_at', { ascending: true });

        console.log('🔍 Existing players query result:', { existingPlayers, fetchError });
        console.log('📊 Raw existing players data:', existingPlayers);
        console.log('🔍 Query details:', {
          instanceId: GAME_INSTANCE_ID,
          queryTime: new Date().toISOString(),
          playerCount: existingPlayers?.length || 0
        });
        
        // If no players found, wait a bit and retry (in case of timing issues)
        if (!existingPlayers || existingPlayers.length === 0) {
          console.log('⚠️ No players found in first query, waiting and retrying...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: retryPlayers, error: retryError } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', GAME_INSTANCE_ID)
            .order('joined_at', { ascending: true });
            
          console.log('🔄 Retry query result:', { retryPlayers, retryError });
          
          if (retryPlayers && retryPlayers.length > 0) {
            console.log('✅ Found players in retry query:', retryPlayers.length);
            existingPlayers = retryPlayers;
          }
        }
        
        const activePlayerCount = existingPlayers?.length || 0;
        console.log('👥 Active player count:', activePlayerCount);

        if (activePlayerCount >= MAX_PLAYERS) {
          setConnectionStatus('full');
          return;
        }

        // Check if this player ID already exists (prevent duplicates)
        const isDuplicate = existingPlayers?.some(p => p.user_id === playerId);
        if (isDuplicate) {
          console.log('⚠️ Player already exists, skipping join');
          setConnectionStatus('connected');
          // Load existing players for UI
          setPlayers(existingPlayers.map(p => ({ ...p, is_online: true })));
          return;
        }

        // Determine if this player is the host
        const isHost = activePlayerCount === 0;

        // Get the most up-to-date list of players to check for available slots
        const { data: currentPlayers } = await supabase
          .from('participants')
          .select('*')
          .eq('instance_id', GAME_INSTANCE_ID)
          .order('joined_at', { ascending: true });

        console.log('🔍 DETAILED PLAYER ANALYSIS:');
        console.log('📊 Current players from database:', currentPlayers?.map(p => ({
          id: p.user_id.slice(-8),
          name: p.global_name,
          username: p.username,
          slot: p.global_name.match(/Player (\d+)/)?.[1] || 'unknown',
          joinedAt: p.joined_at
        })));

        // Find the next available slot number (1-6) using the most current data
        const usedSlotNumbers = new Set<number>(currentPlayers?.map(p => {
          const match = p.global_name.match(/Player (\d+)/);
          return match ? parseInt(match[1]) : null;
        }).filter((num): num is number => num !== null) || []);
        
        console.log('🔍 Current slot usage:', Array.from(usedSlotNumbers).sort((a, b) => a - b));
        console.log('🔍 Available slots analysis:');
        for (let i = 1; i <= MAX_PLAYERS; i++) {
          const isUsed = usedSlotNumbers.has(i);
          console.log(`  Slot ${i}: ${isUsed ? 'USED' : 'AVAILABLE'}`);
        }
        
        let availableSlot = 1;
        for (let i = 1; i <= MAX_PLAYERS; i++) {
          if (!usedSlotNumbers.has(i)) {
            availableSlot = i;
            break;
          }
        }

        console.log(`🎯 Initial slot assignment: ${availableSlot}`);

        // Double-check: If slot 1 is available but we have players, something is wrong
        if (availableSlot === 1 && currentPlayers && currentPlayers.length > 0) {
          console.log('⚠️ WARNING: Slot 1 is available but we have existing players!');
          console.log('📊 Existing players:', currentPlayers.map(p => ({ 
            name: p.global_name, 
            slot: p.global_name.match(/Player (\d+)/)?.[1] || 'unknown' 
          })));
          
          // Recalculate slots more carefully
          const actualUsedSlots = new Set<number>();
          currentPlayers.forEach(p => {
            const match = p.global_name.match(/Player (\d+)/);
            if (match) {
              actualUsedSlots.add(parseInt(match[1]));
            }
          });
          
          console.log('🔍 Recalculated used slots:', Array.from(actualUsedSlots).sort((a, b) => a - b));
          
          // Find first available slot
          for (let i = 1; i <= MAX_PLAYERS; i++) {
            if (!actualUsedSlots.has(i)) {
              availableSlot = i;
              break;
            }
          }
          
          console.log(`🔄 Corrected slot assignment: ${availableSlot}`);
        }

        // Generate unique player name using the available slot
        let playerName = `Player ${availableSlot}`;
        let uniqueUsername = `player${availableSlot}_${Date.now()}`;

        console.log(`🎮 Joining as ${playerName} (Host: ${isHost})`);
        console.log(`📊 Current players before join:`, currentPlayers?.map(p => ({ id: p.user_id.slice(-8), name: p.global_name, username: p.username })));
        console.log(`📝 Will create: ${playerName} with username: ${uniqueUsername}`);
        console.log(`🎯 Slot assignment: Used slots: [${Array.from(usedSlotNumbers).sort((a, b) => a - b).join(', ')}], Available slot: ${availableSlot}`);

        // Final check: Ensure no other player is using this slot
        const slotConflict = currentPlayers?.find(p => {
          const match = p.global_name.match(/Player (\d+)/);
          return match && parseInt(match[1]) === availableSlot;
        });
        
        if (slotConflict) {
          console.log('🚨 SLOT CONFLICT DETECTED!', {
            requestedSlot: availableSlot,
            conflictingPlayer: {
              id: slotConflict.user_id.slice(-8),
              name: slotConflict.global_name,
              username: slotConflict.username
            }
          });
          
          // Find the next truly available slot
          const allUsedSlots = new Set<number>();
          currentPlayers.forEach(p => {
            const match = p.global_name.match(/Player (\d+)/);
            if (match) {
              allUsedSlots.add(parseInt(match[1]));
            }
          });
          
          for (let i = 1; i <= MAX_PLAYERS; i++) {
            if (!allUsedSlots.has(i)) {
              availableSlot = i;
              break;
            }
          }
          
          console.log(`🔄 Resolved slot conflict, using slot ${availableSlot}`);
          playerName = `Player ${availableSlot}`;
          uniqueUsername = `player${availableSlot}_${Date.now()}`;
        }

        // Final validation: Double-check that our slot is truly available
        const finalSlotCheck = currentPlayers?.find(p => {
          const match = p.global_name.match(/Player (\d+)/);
          return match && parseInt(match[1]) === availableSlot;
        });
        
        if (finalSlotCheck) {
          console.log('🚨 FINAL SLOT CONFLICT - ABORTING JOIN!', {
            attemptedSlot: availableSlot,
            conflictingPlayer: {
              id: finalSlotCheck.user_id.slice(-8),
              name: finalSlotCheck.global_name,
              username: finalSlotCheck.username
            }
          });
          
          // Instead of aborting, let's try to find any available slot
          const allSlotsUsed = new Set<number>();
          currentPlayers.forEach(p => {
            const match = p.global_name.match(/Player (\d+)/);
            if (match) {
              allSlotsUsed.add(parseInt(match[1]));
            }
          });
          
          let emergencySlot = 1;
          for (let i = 1; i <= MAX_PLAYERS; i++) {
            if (!allSlotsUsed.has(i)) {
              emergencySlot = i;
              break;
            }
          }
          
          if (emergencySlot !== availableSlot) {
            console.log(`🆘 EMERGENCY SLOT CHANGE: ${availableSlot} → ${emergencySlot}`);
            availableSlot = emergencySlot;
            playerName = `Player ${availableSlot}`;
            uniqueUsername = `player${availableSlot}_${Date.now()}`;
          } else {
            console.log('🚨 NO AVAILABLE SLOTS - GAME IS FULL');
            setConnectionStatus('full');
            return;
          }
        }

        // Nuclear approach: Force check for ANY existing players with similar IDs
        console.log('🔍 Checking for ANY existing players...');
        const { data: allExistingPlayers } = await supabase
          .from('participants')
          .select('*')
          .eq('instance_id', GAME_INSTANCE_ID);

        console.log('📊 ALL existing players in DB:', allExistingPlayers?.map(p => ({
          id: p.user_id.slice(-12),
          name: p.global_name,
          username: p.username
        })));

        // Check if our specific ID exists
        const existingPlayer = allExistingPlayers?.find(p => p.user_id === playerId);
        if (existingPlayer) {
          console.log('⚠️ Player with this ID already exists in DB:', existingPlayer);
          setCurrentPlayerId(playerId);
          setConnectionStatus('connected');
          if (allExistingPlayers) {
            setPlayers(allExistingPlayers.map(p => ({ ...p, is_online: true })));
          }
          return;
        }

        // Database-level lock: Check if another player is trying to join at the same time
        const { data: concurrentPlayers } = await supabase
          .from('participants')
          .select('*')
          .eq('instance_id', GAME_INSTANCE_ID)
          .gte('joined_at', new Date(Date.now() - 5000).toISOString()); // Players joined in last 5 seconds

        if (concurrentPlayers && concurrentPlayers.length > 0) {
          console.log('⚠️ Concurrent players detected, waiting for database to settle...');
          // Wait a bit for any concurrent operations to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Re-check the current state
          const { data: settledPlayers } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', GAME_INSTANCE_ID)
            .order('joined_at', { ascending: true });
            
          if (settledPlayers) {
            // Recalculate slot assignment with settled data
            const settledUsedSlots = new Set<number>(settledPlayers.map(p => {
              const match = p.global_name.match(/Player (\d+)/);
              return match ? parseInt(match[1]) : null;
            }).filter((num): num is number => num !== null));
            
            let newAvailableSlot = 1;
            for (let i = 1; i <= MAX_PLAYERS; i++) {
              if (!settledUsedSlots.has(i)) {
                newAvailableSlot = i;
                break;
              }
            }
            
            if (newAvailableSlot !== availableSlot) {
              console.log(`🔄 Slot changed from ${availableSlot} to ${newAvailableSlot} after settling`);
              availableSlot = newAvailableSlot;
              playerName = `Player ${availableSlot}`;
              uniqueUsername = `player${availableSlot}_${Date.now()}`;
            }
          }
        }

        // Additional safety: Check if we're somehow trying to update an existing player
        if (allExistingPlayers && allExistingPlayers.length > 0) {
          console.log('🔍 Found existing players, ensuring we create a NEW one...');
          console.log('🆔 Our new player ID:', playerId.slice(-12));
          console.log('🆔 Existing player IDs:', allExistingPlayers.map(p => p.user_id.slice(-12)));
        }

        // Create participant with INSERT ONLY (no upsert) - FORCE NEW RECORD
        const participantData = {
          instance_id: GAME_INSTANCE_ID,
          user_id: playerId,
          username: uniqueUsername,
          global_name: playerName,
          is_host: isHost
        };

        console.log(`💾 FORCE INSERTING NEW participant:`, {
          ...participantData,
          user_id: participantData.user_id.slice(-12) // Show last 12 chars for readability
        });
        
        // Double-check: Make sure we're not accidentally updating anything
        console.log('🔒 PRE-INSERT CHECK: About to create record with ID:', playerId.slice(-12));

        const { data: insertedData, error } = await supabase
          .from('participants')
          .insert(participantData)
          .select()
          .single();

        if (error) {
          console.error('❌ FAILED TO INSERT PARTICIPANT:', error);
          console.error('🚨 Error code:', error.code, 'Message:', error.message);
          console.error('🚨 This should NOT happen with our defensive checks!');
          
          // If it's a duplicate key error, something went wrong with our checks
          if (error.code === '23505') {
            console.log('🚨 DUPLICATE KEY ERROR - DATABASE CONSTRAINT VIOLATION!');
            console.log('🚨 This means our player ID generation is not unique enough!');
            
            // Try to get the existing player
            const { data: existingAfterError } = await supabase
              .from('participants')
              .select('*')
              .eq('instance_id', GAME_INSTANCE_ID)
              .eq('user_id', playerId)
              .single();
            
            if (existingAfterError) {
              console.log('🔍 Found existing player after error:', {
                id: existingAfterError.user_id.slice(-12),
                name: existingAfterError.global_name,
                username: existingAfterError.username
              });
            }
          }
          
          setConnectionStatus('error');
          return;
        }

        if (insertedData) {
          console.log(`✅ SUCCESSFULLY INSERTED NEW PLAYER:`, { 
            id: insertedData.user_id.slice(-12), 
            name: insertedData.global_name, 
            username: insertedData.username,
            host: insertedData.is_host,
            joinedAt: insertedData.joined_at
          });
          
          // Verify the insert actually happened
          console.log('🔍 POST-INSERT VERIFICATION: Checking if our player is in DB...');
          const { data: verifyInsert } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', GAME_INSTANCE_ID)
            .eq('user_id', playerId)
            .single();
            
          if (verifyInsert) {
            console.log('✅ VERIFICATION SUCCESS: Our player exists in DB:', {
              id: verifyInsert.user_id.slice(-12),
              name: verifyInsert.global_name
            });
          } else {
            console.log('❌ VERIFICATION FAILED: Our player NOT found in DB!');
          }
        } else {
          console.log('⚠️ No data returned from insert, but no error either');
        }

        console.log(`✅ Joined game as ${playerName} (Host: ${isHost})`);
        
        // Mark as successfully joined
        sessionStorage.setItem(`joined_${GAME_INSTANCE_ID}`, 'true');

        // Initialize game state if this is the first player
        if (isHost) {
          try {
            const { error: gameStateError } = await supabase
              .from('game_states')
              .upsert({
                instance_id: GAME_INSTANCE_ID,
                current_category: gameState.currentCategory,
                used_letters: gameState.usedLetters,
                is_game_active: gameState.isGameActive,
                current_player_index: gameState.currentPlayerIndex,
                player_scores: {},
                round_number: gameState.roundNumber,
                timer_duration: gameState.timerDuration,
                host: playerId
                // Removed turn_start_time as it doesn't exist in the schema
              }, {
                onConflict: 'instance_id'
              });

            if (gameStateError) {
              console.error('Failed to initialize game state:', gameStateError);
              console.log('⚠️ Game state initialization failed, but continuing with player join...');
            } else {
              console.log('✅ Game state initialized');
            }
          } catch (error) {
            console.error('Game state initialization error:', error);
            console.log('⚠️ Game state table might not exist, continuing with player join...');
          }
        }

        // Wait a moment to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 200));

        // Fetch initial participants list with fresh query
        const { data: initialPlayers } = await supabase
          .from('participants')
          .select('*')
          .eq('instance_id', GAME_INSTANCE_ID)
          .order('joined_at', { ascending: true });

        console.log('📊 RAW DATABASE QUERY RESULT AFTER INSERT:', initialPlayers);
        console.log('📊 TOTAL PLAYERS IN DB:', initialPlayers?.length || 0);

        if (initialPlayers) {
          setPlayers(initialPlayers.map(p => ({ ...p, is_online: true })));
          console.log('👥 Initial players loaded:', initialPlayers.length);
          console.log('📋 Final player list in order:', initialPlayers.map((p, index) => ({ 
            slot: index + 1,
            id: p.user_id.slice(-8), 
            name: p.global_name, 
            username: p.username,
            host: p.is_host,
            joinedAt: p.joined_at 
          })));
          
          // Double-check: Count how many distinct players we have
          const uniqueUserIds = new Set(initialPlayers.map(p => p.user_id));
          console.log('🔢 Unique players count:', uniqueUserIds.size);
          
          if (uniqueUserIds.size !== initialPlayers.length) {
            console.log('🚨 DUPLICATE USER IDs DETECTED!');
          }
          
          // Verify our slot assignment was correct
          const ourPlayer = initialPlayers.find(p => p.user_id === playerId);
          if (ourPlayer) {
            const expectedSlot = parseInt(playerName.match(/Player (\d+)/)?.[1] || '0');
            const actualSlot = parseInt(ourPlayer.global_name.match(/Player (\d+)/)?.[1] || '0');
            if (expectedSlot !== actualSlot) {
              console.log(`🚨 SLOT MISMATCH: Expected ${expectedSlot}, got ${actualSlot}`);
            } else {
              console.log(`✅ Slot assignment verified: ${actualSlot}`);
            }
          }
          
          // Cleanup: Remove any duplicate players (same slot, different IDs)
          const slotGroups = new Map<number, any[]>();
          initialPlayers.forEach(p => {
            const match = p.global_name.match(/Player (\d+)/);
            if (match) {
              const slot = parseInt(match[1]);
              if (!slotGroups.has(slot)) {
                slotGroups.set(slot, []);
              }
              slotGroups.get(slot)!.push(p);
            }
          });
          
          // Check for duplicates and remove them
          for (const [slot, players] of slotGroups) {
            if (players.length > 1) {
              console.log(`🚨 DUPLICATE SLOT ${slot} DETECTED:`, players.map(p => ({
                id: p.user_id.slice(-8),
                name: p.global_name,
                joinedAt: p.joined_at
              })));
              
              // Keep the oldest player, remove the rest
              const sortedPlayers = players.sort((a, b) => 
                new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
              );
              
              for (let i = 1; i < sortedPlayers.length; i++) {
                const duplicatePlayer = sortedPlayers[i];
                console.log(`🗑️ Removing duplicate player: ${duplicatePlayer.global_name} (${duplicatePlayer.user_id.slice(-8)})`);
                
                const { error: deleteError } = await supabase
                  .from('participants')
                  .delete()
                  .eq('instance_id', GAME_INSTANCE_ID)
                  .eq('user_id', duplicatePlayer.user_id);
                  
                if (deleteError) {
                  console.error('Failed to remove duplicate player:', deleteError);
                }
              }
            }
          }
        }

        setConnectionStatus('connected');

      } catch (error) {
        console.error('Join game error:', error);
        setConnectionStatus('error');
      } finally {
        // Always release the lock
        sessionStorage.removeItem(LOCK_KEY);
      }
    };

    // Small delay to ensure proper execution order
    const timeoutId = setTimeout(joinGame, 10);
    
    // Cleanup on unmount - mark player as offline and clear timeout
    return () => {
      clearTimeout(timeoutId);
      
      const playerId = localStorage.getItem(STORAGE_KEY);
      if (supabase && playerId) {
        // Use a more reliable cleanup method
        const cleanup = async () => {
          try {
            const { error } = await supabase
              .from('participants')
              .delete()
              .eq('instance_id', GAME_INSTANCE_ID)
              .eq('user_id', playerId);
            
            if (!error) {
              console.log('🚪 Left game successfully');
            }
          } catch (err) {
            console.error('Cleanup error:', err);
          }
        };
        cleanup();
        
        // Clear all storage
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(`joined_${GAME_INSTANCE_ID}`);
        sessionStorage.removeItem(`joining_${GAME_INSTANCE_ID}`);
      }
    };
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (!gameState.isGameActive) {
      setTimeLeft(TURN_TIMER_DURATION);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 0.1);
        
        // Auto-skip turn if time runs out and it's current player's turn
        if (newTime === 0 && isCurrentPlayer()) {
          handleTimeUp();
        }
        
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.isGameActive, isCurrentPlayer]);

  // Reset timer when current player changes
  useEffect(() => {
    if (gameState.isGameActive) {
      setTimeLeft(TURN_TIMER_DURATION);
    }
  }, [gameState.currentPlayerIndex, gameState.isGameActive]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!supabase || !currentPlayerId) return;

    console.log('🔗 Setting up realtime subscriptions...');

    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel(`participants-${GAME_INSTANCE_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `instance_id=eq.${GAME_INSTANCE_ID}`
        },
        async (payload) => {
          console.log('👥 Participant change:', payload);
          console.log('🔍 Change details:', { 
            eventType: payload.eventType, 
            old: payload.old ? { 
              id: (payload.old as any)?.user_id?.slice(-8), 
              name: (payload.old as any)?.global_name 
            } : null,
            new: payload.new ? { 
              id: (payload.new as any)?.user_id?.slice(-8), 
              name: (payload.new as any)?.global_name, 
              username: (payload.new as any)?.username 
            } : null
          });
          
          // Always refresh the complete participants list to maintain order
          const { data: updatedPlayers } = await supabase
            .from('participants')
            .select('*')
            .eq('instance_id', GAME_INSTANCE_ID)
            .order('joined_at', { ascending: true });

          if (updatedPlayers) {
            console.log('🔄 Updated players list:', updatedPlayers.map(p => ({ 
              id: p.user_id.slice(-8), 
              name: p.global_name, 
              username: p.username,
              joinedAt: p.joined_at,
              host: p.is_host 
            })));
            console.log('📊 Total players in updated list:', updatedPlayers.length);
            console.log('🎯 Current player ID:', currentPlayerId.slice(-8));
            
            // Check if our player is in the updated list
            const ourPlayer = updatedPlayers.find(p => p.user_id === currentPlayerId);
            if (ourPlayer) {
              console.log('✅ Our player found in updated list:', {
                id: ourPlayer.user_id.slice(-8),
                name: ourPlayer.global_name,
                slot: ourPlayer.global_name.match(/Player (\d+)/)?.[1]
              });
            } else {
              console.log('❌ Our player NOT found in updated list!');
            }
            
            setPlayers(updatedPlayers.map(p => ({ ...p, is_online: true })));
          } else {
            console.log('⚠️ No updated players returned from query');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Participants subscription:', status);
      });

    // Subscribe to game events
    const gameEventsChannel = supabase
      .channel(`game-events-${GAME_INSTANCE_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `instance_id=eq.${GAME_INSTANCE_ID}`
        },
        (payload) => {
          try {
            const event = payload.new as any;
            console.log('🔄 Game event received:', event);

            switch (event.event_type) {
              case 'LETTER_SELECTED':
                setGameState(prev => ({
                  ...prev,
                  usedLetters: [...prev.usedLetters, event.payload.letter],
                  currentPlayerIndex: (prev.currentPlayerIndex + 1) % players.length,
                  // Removed turnStartTime as it doesn't exist in the schema
                }));
                break;

              case 'ROUND_START':
                setGameState(prev => ({
                  ...prev,
                  currentCategory: event.payload.category,
                  usedLetters: [],
                  isGameActive: true,
                  currentPlayerIndex: 0,
                  roundNumber: prev.roundNumber + 1,
                  // Removed turnStartTime as it doesn't exist in the schema
                }));
                break;

              case 'GAME_RESET':
                setGameState(prev => ({
                  ...prev,
                  usedLetters: [],
                  isGameActive: false,
                  currentPlayerIndex: 0,
                  // Removed turnStartTime as it doesn't exist in the schema
                }));
                break;

              case 'TURN_TIMEOUT':
                setGameState(prev => ({
                  ...prev,
                  currentPlayerIndex: (prev.currentPlayerIndex + 1) % players.length,
                  // Removed turnStartTime as it doesn't exist in the schema
                }));
                break;
            }
          } catch (error) {
            console.error('Game event processing error:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game events subscription:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ Game events subscription failed, table might not exist');
        }
      });

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel(`game-state-${GAME_INSTANCE_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `instance_id=eq.${GAME_INSTANCE_ID}`
        },
        (payload) => {
          try {
            const state = payload.new as any;
            console.log('🔄 Game state update:', state);
            
            setGameState({
              currentCategory: state.current_category,
              usedLetters: state.used_letters,
              isGameActive: state.is_game_active,
              currentPlayerIndex: state.current_player_index,
              roundNumber: state.round_number,
              timerDuration: state.timer_duration,
              host: state.host
              // Removed turn_start_time as it doesn't exist in the schema
            });
          } catch (error) {
            console.error('Game state update error:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game state subscription:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ Game state subscription failed, table might not exist');
        }
      });

    return () => {
      participantsChannel.unsubscribe();
      gameEventsChannel.unsubscribe();
      gameStateChannel.unsubscribe();
    };
  }, [currentPlayerId, players.length]);

  // Broadcast game event
  const broadcastEvent = useCallback(async (eventType: string, payload: any) => {
    if (!supabase || !currentPlayerId) return;

    try {
      const { error } = await supabase
        .from('game_events')
        .insert({
          instance_id: GAME_INSTANCE_ID,
          event_type: eventType,
          payload,
          player_id: currentPlayerId
        });

      if (error) {
        console.error('Failed to broadcast event:', error);
        console.log('⚠️ Game events table might not exist, skipping broadcast');
      } else {
        console.log('✅ Event broadcasted:', eventType);
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      console.log('⚠️ Game events table might not exist, skipping broadcast');
    }
  }, [currentPlayerId]);

  // Update game state in database
  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    if (!supabase) return;

    try {
      const updateData: any = {};
      
      if (newState.currentCategory !== undefined) updateData.current_category = newState.currentCategory;
      if (newState.usedLetters !== undefined) updateData.used_letters = newState.usedLetters;
      if (newState.isGameActive !== undefined) updateData.is_game_active = newState.isGameActive;
      if (newState.currentPlayerIndex !== undefined) updateData.current_player_index = newState.currentPlayerIndex;
      if (newState.roundNumber !== undefined) updateData.round_number = newState.roundNumber;
      if (newState.timerDuration !== undefined) updateData.timer_duration = newState.timerDuration;
      if (newState.host !== undefined) updateData.host = newState.host;
      // Removed turn_start_time as it doesn't exist in the schema

      const { error } = await supabase
        .from('game_states')
        .update(updateData)
        .eq('instance_id', GAME_INSTANCE_ID);

      if (error) {
        console.error('Failed to update game state:', error);
        console.log('⚠️ Game state table might not exist, skipping update');
      }
    } catch (error) {
      console.error('Update game state error:', error);
      console.log('⚠️ Game state table might not exist, skipping update');
    }
  }, []);

  // Game actions
  const startNewRound = useCallback(() => {
    if (!isHost()) return;
    
    const newCategory = categories[Math.floor(Math.random() * categories.length)];
    broadcastEvent('ROUND_START', { category: newCategory });
    updateGameState({
      currentCategory: newCategory,
      usedLetters: [],
      isGameActive: true,
      currentPlayerIndex: 0,
      roundNumber: gameState.roundNumber + 1,
      // Removed turnStartTime as it doesn't exist in the schema
    });
  }, [isHost, broadcastEvent, updateGameState, gameState.roundNumber]);

  const resetGame = useCallback(() => {
    if (!isHost()) return;
    
    broadcastEvent('GAME_RESET', {});
    updateGameState({
      usedLetters: [],
      isGameActive: false,
      currentPlayerIndex: 0,
      // Removed turnStartTime as it doesn't exist in the schema
    });
  }, [isHost, broadcastEvent, updateGameState]);

  const selectLetter = useCallback((letter: string) => {
    if (!isCurrentPlayer() || !gameState.isGameActive) return;
    
    broadcastEvent('LETTER_SELECTED', { letter });
    updateGameState({
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % players.length,
      // Removed turnStartTime as it doesn't exist in the schema
    });
  }, [isCurrentPlayer, gameState, broadcastEvent, updateGameState, players.length]);

  const handleTimeUp = useCallback(() => {
    if (!isCurrentPlayer() || !gameState.isGameActive) return;
    
    console.log('⏰ Time up! Skipping turn...');
    broadcastEvent('TURN_TIMEOUT', { player_id: currentPlayerId });
    updateGameState({
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % players.length,
      // Removed turnStartTime as it doesn't exist in the schema
    });
  }, [isCurrentPlayer, gameState, broadcastEvent, updateGameState, players.length, currentPlayerId]);

  // Render different states
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Joining Game...</h2>
          <p className="text-gray-600">Finding an available slot</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'full') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Debug Controls for Full Game */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-800 mb-3">🔧 Debug Controls</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-4 items-center">
                <Button
                  onClick={async () => {
                    if (!supabase) return;
                    try {
                      const { error } = await supabase
                        .from('participants')
                        .delete()
                        .eq('instance_id', GAME_INSTANCE_ID);
                      if (!error) {
                        // Clear all storage  
                        localStorage.removeItem(`multiplayer_player_${GAME_INSTANCE_ID}`);
                        sessionStorage.removeItem(`joined_${GAME_INSTANCE_ID}`);
                        sessionStorage.removeItem(`joining_${GAME_INSTANCE_ID}`);
                        console.log('🧹 All participants and storage cleared');
                        window.location.reload();
                      } else {
                        console.error('Clear error:', error);
                      }
                    } catch (err) {
                      console.error('Clear failed:', err);
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  🧹 Clear All Players & Reset
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  🔄 Refresh Page
                </Button>
              </div>
              <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                <strong>Issue:</strong> Game shows as full with ghost players. Use "Clear All Players" to reset.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
              <Users className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Full</h2>
              <p className="text-gray-600 mb-4">Maximum {MAX_PLAYERS} players reached</p>
              <p className="text-sm text-gray-500 mb-4">
                If you see this but no players are visible, there are ghost players in the database.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>Try Again</Button>
                <Button 
                  onClick={async () => {
                    if (!supabase) return;
                    const { error } = await supabase.from('participants').delete().eq('instance_id', GAME_INSTANCE_ID);
                    if (!error) {
                      // Clear all storage
                      localStorage.removeItem(`multiplayer_player_${GAME_INSTANCE_ID}`);
                      sessionStorage.removeItem(`joined_${GAME_INSTANCE_ID}`);
                      sessionStorage.removeItem(`joining_${GAME_INSTANCE_ID}`);
                      window.location.reload();
                    }
                  }}
                  variant="destructive"
                >
                  Clear & Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center p-8">
          <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">Failed to join the game</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎮 Web Multiplayer Basta!</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              Connected
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {players.length}/{MAX_PLAYERS} Players
            </div>
            <div className="flex items-center gap-2">
              <span>Round {gameState.roundNumber}</span>
            </div>
          </div>
        </div>

        {/* Debug Controls (Always Visible) */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-3">🔧 Debug Controls</h3>
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 items-center">
                              <Button
                  onClick={async () => {
                    if (!supabase) return;
                    try {
                      const { error } = await supabase
                        .from('participants')
                        .delete()
                        .eq('instance_id', GAME_INSTANCE_ID);
                      if (!error) {
                        setPlayers([]);
                        // Clear all storage
                        localStorage.removeItem(`multiplayer_player_${GAME_INSTANCE_ID}`);
                        sessionStorage.removeItem(`joined_${GAME_INSTANCE_ID}`);
                        sessionStorage.removeItem(`joining_${GAME_INSTANCE_ID}`);
                        console.log('🧹 All participants and storage cleared');
                        window.location.reload();
                      } else {
                        console.error('Clear error:', error);
                      }
                    } catch (err) {
                      console.error('Clear failed:', err);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-red-100 hover:bg-red-200 text-red-800"
                >
                  🧹 Clear All Players
                </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                🔄 Refresh Page
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  const { data: refreshedPlayers } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('instance_id', GAME_INSTANCE_ID)
                    .order('joined_at', { ascending: true });
                  if (refreshedPlayers) {
                    setPlayers(refreshedPlayers.map(p => ({ ...p, is_online: true })));
                    console.log('🔄 Manually refreshed players:', refreshedPlayers.length);
                    console.log('📋 Refreshed player list:', refreshedPlayers.map(p => ({
                      id: p.user_id.slice(-8),
                      name: p.global_name,
                      slot: p.global_name.match(/Player (\d+)/)?.[1],
                      joinedAt: p.joined_at
                    })));
                  }
                }}
                variant="outline"
                size="sm"
              >
                🔄 Refresh Players
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  console.log('🔍 Force checking database state...');
                  const { data: allPlayers } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('instance_id', GAME_INSTANCE_ID)
                    .order('joined_at', { ascending: true });
                  
                  if (allPlayers) {
                    console.log('📊 Database state:', allPlayers.map(p => ({
                      id: p.user_id.slice(-8),
                      name: p.global_name,
                      slot: p.global_name.match(/Player (\d+)/)?.[1],
                      joinedAt: p.joined_at,
                      isHost: p.is_host
                    })));
                    
                    // Check for slot conflicts
                    const slotMap = new Map();
                    allPlayers.forEach(p => {
                      const match = p.global_name.match(/Player (\d+)/);
                      if (match) {
                        const slot = parseInt(match[1]);
                        if (!slotMap.has(slot)) {
                          slotMap.set(slot, []);
                        }
                        slotMap.get(slot).push(p);
                      }
                    });
                    
                    for (const [slot, players] of slotMap) {
                      if (players.length > 1) {
                        console.log(`🚨 SLOT ${slot} CONFLICT:`, players.map(p => ({
                          id: p.user_id.slice(-8),
                          name: p.global_name,
                          joinedAt: p.joined_at
                        })));
                      }
                    }
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-blue-100 hover:bg-blue-200 text-blue-800"
              >
                🔍 Check DB State
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  console.log('🔍 Testing database connection...');
                  
                  // Test basic connection
                  const { data: testData, error: testError } = await supabase
                    .from('participants')
                    .select('count')
                    .limit(1);
                    
                  console.log('🔗 Database connection test:', { testData, testError });
                  
                  // Test specific instance query
                  const { data: instanceData, error: instanceError } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('instance_id', GAME_INSTANCE_ID);
                    
                  console.log('🎯 Instance query test:', { 
                    instanceData, 
                    instanceError,
                    instanceCount: instanceData?.length || 0 
                  });
                }}
                variant="outline"
                size="sm"
                className="bg-green-100 hover:bg-green-200 text-green-800"
              >
                🔗 Test DB Connection
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  console.log('🔍 Checking game_states table schema...');
                  
                  try {
                    // Try to get one row to see the structure
                    const { data: sampleData, error: sampleError } = await supabase
                      .from('game_states')
                      .select('*')
                      .limit(1);
                    
                    console.log('📊 Sample game_states data:', sampleData);
                    console.log('❌ Sample error:', sampleError);
                    
                    if (sampleData && sampleData.length > 0) {
                      const columns = Object.keys(sampleData[0]);
                      console.log('📋 Available columns in game_states:', columns);
                      
                      // Try to insert a minimal record to see what's accepted
                      const { data: insertTest, error: insertError } = await supabase
                        .from('game_states')
                        .insert({
                          instance_id: 'schema-test',
                          current_category: { id: 'test', en: 'Test', es: 'Test' },
                          used_letters: [],
                          is_game_active: false,
                          current_player_index: 0,
                          player_scores: {},
                          round_number: 1,
                          timer_duration: 15,
                          host: 'test-host'
                        })
                        .select();
                      
                      console.log('✅ Insert test result:', insertTest);
                      console.log('❌ Insert test error:', insertError);
                      
                      // Clean up test record
                      if (!insertError) {
                        await supabase
                          .from('game_states')
                          .delete()
                          .eq('instance_id', 'schema-test');
                      }
                    }
                  } catch (error) {
                    console.error('Schema check error:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-purple-100 hover:bg-purple-200 text-purple-800"
              >
                🔍 Check Game States Schema
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  console.log('🔍 Checking current game state...');
                  
                  try {
                    const { data: gameStateData, error: gameStateError } = await supabase
                      .from('game_states')
                      .select('*')
                      .eq('instance_id', GAME_INSTANCE_ID)
                      .single();
                    
                    console.log('📊 Current game state:', gameStateData);
                    console.log('❌ Game state error:', gameStateError);
                    
                    if (gameStateData) {
                      console.log('✅ Game state exists for this instance');
                    } else {
                      console.log('⚠️ No game state found for this instance');
                    }
                  } catch (error) {
                    console.error('Game state check error:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800"
              >
                🔍 Check Current Game State
              </Button>
              <Button
                onClick={async () => {
                  console.log('🔄 Force rejoin process...');
                  // Clear all storage
                  localStorage.removeItem(`multiplayer_player_${GAME_INSTANCE_ID}`);
                  sessionStorage.removeItem(`joined_${GAME_INSTANCE_ID}`);
                  sessionStorage.removeItem(`joining_${GAME_INSTANCE_ID}`);
                  
                  // Remove current player from database
                  if (supabase && currentPlayerId) {
                    const { error } = await supabase
                      .from('participants')
                      .delete()
                      .eq('instance_id', GAME_INSTANCE_ID)
                      .eq('user_id', currentPlayerId);
                    
                    if (!error) {
                      console.log('🗑️ Removed current player from database');
                    }
                  }
                  
                  // Reset state
                  setCurrentPlayerId('');
                  setPlayers([]);
                  setConnectionStatus('connecting');
                  
                  // Reload page to restart join process
                  window.location.reload();
                }}
                variant="outline"
                size="sm"
                className="bg-orange-100 hover:bg-orange-200 text-orange-800"
              >
                🔄 Force Rejoin
              </Button>
              <Button
                onClick={async () => {
                  if (!supabase) return;
                  console.log('🔍 Testing slot assignment logic...');
                  
                  try {
                    const { data: currentPlayers } = await supabase
                      .from('participants')
                      .select('*')
                      .eq('instance_id', GAME_INSTANCE_ID)
                      .order('joined_at', { ascending: true });
                    
                    console.log('📊 Current players for slot test:', currentPlayers?.map(p => ({
                      id: p.user_id.slice(-8),
                      name: p.global_name,
                      slot: p.global_name.match(/Player (\d+)/)?.[1] || 'unknown',
                      joinedAt: p.joined_at
                    })));
                    
                    if (currentPlayers) {
                      const usedSlotNumbers = new Set<number>(currentPlayers.map(p => {
                        const match = p.global_name.match(/Player (\d+)/);
                        return match ? parseInt(match[1]) : null;
                      }).filter((num): num is number => num !== null));
                      
                      console.log('🔍 Used slots:', Array.from(usedSlotNumbers).sort((a, b) => a - b));
                      
                      let availableSlot = 1;
                      for (let i = 1; i <= MAX_PLAYERS; i++) {
                        if (!usedSlotNumbers.has(i)) {
                          availableSlot = i;
                          break;
                        }
                      }
                      
                      console.log(`🎯 Next available slot: ${availableSlot}`);
                      
                      // Check for conflicts
                      const slotConflict = currentPlayers.find(p => {
                        const match = p.global_name.match(/Player (\d+)/);
                        return match && parseInt(match[1]) === availableSlot;
                      });
                      
                      if (slotConflict) {
                        console.log('🚨 SLOT CONFLICT DETECTED:', {
                          slot: availableSlot,
                          conflictingPlayer: {
                            id: slotConflict.user_id.slice(-8),
                            name: slotConflict.global_name
                          }
                        });
                      } else {
                        console.log('✅ No slot conflicts detected');
                      }
                    }
                  } catch (error) {
                    console.error('Slot assignment test error:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
              >
                🔍 Test Slot Assignment
              </Button>
            </div>
            <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
              <div><strong>Status:</strong> {connectionStatus} | <strong>Players in UI:</strong> {players.length} | <strong>Your ID:</strong> {currentPlayerId.slice(-8)}</div>
              <div><strong>Players:</strong> {players.map(p => `${p.global_name}(${p.user_id.slice(-8)}${p.user_id === currentPlayerId ? '-YOU' : ''})`).join(', ')}</div>
              <div><strong>Slots:</strong> {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                const slotNum = i + 1;
                const player = players.find(p => p.global_name.match(new RegExp(`Player ${slotNum}`)));
                return player ? `${slotNum}:${player.user_id.slice(-4)}` : `${slotNum}:empty`;
              }).join(' | ')}</div>
            </div>
          </div>
        </div>

        {/* Players Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {players.map((player, index) => (
              <PlayerCard
                key={player.user_id}
                player={player}
                isCurrentTurn={gameState.isGameActive && index === gameState.currentPlayerIndex}
                currentPlayer={player.user_id === currentPlayerId}
                currentPlayerId={currentPlayerId}
              />
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: MAX_PLAYERS - players.length }, (_, index) => (
              <div key={`empty-${index}`} className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                <div className="flex items-center justify-center h-10">
                  <span className="text-gray-400 text-sm">Waiting...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Turn Indicator */}
        {gameState.isGameActive && currentPlayer && (
          <div className="mb-6 text-center">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${
              isCurrentPlayer() 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}>
              {isCurrentPlayer() ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-bold">🎯 Your Turn!</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">
                    Waiting for {currentPlayer.global_name}...
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost() && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-yellow-200 shadow-sm">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-gray-700">Host Controls</span>
              <div className="flex gap-3">
                <Button
                  onClick={startNewRound}
                  disabled={gameState.isGameActive || players.length < 2}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Round
                </Button>
                <Button
                  onClick={resetGame}
                  disabled={!gameState.isGameActive}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Game
                </Button>
              </div>
            </div>
            {players.length < 2 && (
              <p className="text-sm text-gray-500 mt-2">Need at least 2 players to start</p>
            )}
          </div>
        )}

        {/* Category Display */}
        {gameState.isGameActive && (
          <div className="mb-8 text-center">
            <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Category</h3>
              <p className="text-3xl font-bold text-blue-600">{gameState.currentCategory.en}</p>
            </div>
          </div>
        )}

        {/* Letter Selection */}
        <div className="mb-8">
          <LetterGrid
            usedLetters={new Set(gameState.usedLetters)}
            onLetterSelect={selectLetter}
            disabled={!isCurrentPlayer() || !gameState.isGameActive}
            timeLeft={timeLeft}
          />
        </div>

        {/* Game Stats */}
        {gameState.usedLetters.length > 0 && (
          <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Used Letters</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {gameState.usedLetters.map((letter, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Players */}
        {!gameState.isGameActive && players.length < 2 && (
          <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiting for More Players</h3>
            <p className="text-gray-600 mb-4">Share this URL with friends to join the game!</p>
            <div className="bg-gray-100 p-3 rounded-lg border">
              <code className="text-sm text-gray-700">{window.location.href}</code>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}