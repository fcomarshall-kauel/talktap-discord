import { useCallback, useEffect, useState } from 'react';
import { Category, getRandomCategory } from '@/data/categories';

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

interface GameEvent {
  type: 'LETTER_SELECTED' | 'ROUND_START' | 'GAME_RESET' | 'TIMER_UPDATE';
  payload: any;
  timestamp: number;
  playerId: string;
}

export const useLocalMultiplayer = () => {
  const [gameState, setGameState] = useState<LocalGameState>({
    currentCategory: { id: "animals", es: "animales", en: "animals" }, // Always use default for SSR
    usedLetters: [],
    isGameActive: false,
    currentPlayerIndex: 0,
    playerScores: {},
    roundNumber: 1,
    timerDuration: 30,
    host: null
  });

  // Simulate multiple players
  const [players, setPlayers] = useState<LocalPlayer[]>([
    { id: 'player-1', username: 'Player 1', global_name: 'Player 1', avatar: null },
    { id: 'player-2', username: 'Player 2', global_name: 'Player 2', avatar: null },
    { id: 'player-3', username: 'Player 3', global_name: 'Player 3', avatar: null }
  ]);

  const [currentPlayerId, setCurrentPlayerId] = useState<string>('player-1');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Update to random category after hydration is complete
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGameState(prev => ({
        ...prev,
        currentCategory: getRandomCategory()
      }));
    }
  }, []); // Only run once after mount



  // Generate a unique player ID for this browser tab
  useEffect(() => {
    // Clear old game data for fresh start
    localStorage.removeItem('localGameEvents');
    
    // Always generate a new unique ID for each tab
    const newPlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentPlayerId(newPlayerId);
    console.log('🎮 Generated new player ID:', newPlayerId);
  }, []);

  // Simulate real-time events using localStorage and window events
  const broadcastEvent = useCallback((eventType: GameEvent['type'], payload: any) => {
    const event: GameEvent = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      playerId: currentPlayerId
    };

    // Store event in localStorage
    const events = JSON.parse(localStorage.getItem('localGameEvents') || '[]');
    events.push(event);
    localStorage.setItem('localGameEvents', JSON.stringify(events));

    // Broadcast to other tabs
    window.dispatchEvent(new CustomEvent('localGameEvent', { detail: event }));
    
    console.log('🔄 Local event broadcasted:', event);
  }, [currentPlayerId]);

  // Listen for events from other tabs
  useEffect(() => {
    const handleLocalEvent = (event: CustomEvent) => {
      const gameEvent = event.detail as GameEvent;
      if (gameEvent.playerId !== currentPlayerId) {
        console.log('🔄 Local event received:', gameEvent);
        
        switch (gameEvent.type) {
          case 'LETTER_SELECTED':
            setGameState(prev => ({
              ...prev,
              usedLetters: [...prev.usedLetters, gameEvent.payload.letter],
              currentPlayerIndex: (prev.currentPlayerIndex + 1) % players.length
            }));
            window.dispatchEvent(new CustomEvent('timerReset'));
            break;

          case 'ROUND_START':
            setGameState(prev => ({
              ...prev,
              currentCategory: gameEvent.payload.category,
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
              playerScores: players.reduce((acc, p) => {
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
    };

    window.addEventListener('localGameEvent', handleLocalEvent);
    return () => window.removeEventListener('localGameEvent', handleLocalEvent);
  }, [currentPlayerId, players.length]);

  // Game actions
  const startNewRound = useCallback(() => {
    if (!isHost) return;

    const randomCategory = getRandomCategory();

    const newState = {
      currentCategory: randomCategory,
      usedLetters: [],
      isGameActive: true,
      currentPlayerIndex: 0,
      roundNumber: gameState.roundNumber + 1
    };

    setGameState(prev => ({ ...prev, ...newState }));
    broadcastEvent('ROUND_START', { category: randomCategory });
  }, [isHost, gameState.roundNumber, broadcastEvent]);

  const selectLetter = useCallback(async (letter: string) => {
    if (gameState.usedLetters.includes(letter)) return;

    const currentPlayer = players[gameState.currentPlayerIndex];
    if (currentPlayer?.id !== currentPlayerId) return;

    console.log('🎯 Local letter selection:', letter, 'by player:', currentPlayerId);

    const newState = {
      usedLetters: [...gameState.usedLetters, letter],
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % players.length
    };

    setGameState(prev => ({ ...prev, ...newState }));
    broadcastEvent('LETTER_SELECTED', { letter });
    broadcastEvent('TIMER_UPDATE', { action: 'reset' });
  }, [gameState, players, currentPlayerId, broadcastEvent]);

  const resetGame = useCallback(() => {
    if (!isHost) return;

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

    setGameState(prev => ({ ...prev, ...newState }));
    broadcastEvent('GAME_RESET', {});
  }, [isHost, players, broadcastEvent]);

  const getCurrentPlayer = useCallback(() => {
    return players[gameState.currentPlayerIndex];
  }, [players, gameState.currentPlayerIndex]);

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
    participants: players,
    isHost,
    isConnected,
    user: { id: currentPlayerId, username: `Player ${currentPlayerId.split('-')[1]}`, global_name: `Player ${currentPlayerId.split('-')[1]}` }
  };
}; 