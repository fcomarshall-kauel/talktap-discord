# Multiplayer Game Development Manual

## Overview
This manual documents the implementation of a real-time multiplayer word game with Supabase WebSocket connections, player management, and advanced UI features.

## Core Features Implemented

### 1. Real-time Multiplayer System
- **Supabase WebSocket Integration**: Real-time player synchronization
- **Player Management**: Join, disconnect, and presence tracking
- **Game State Synchronization**: Shared game state across all players
- **Connection Reliability**: Robust reconnection and health checks

### 2. Advanced Losing System
- **Local Losing State**: Independent of database syncs
- **Persistent Losing History**: X marks that persist across rounds
- **Synced Across Players**: All players see the same losing history
- **Visual Indicators**: Red ❌ marks on player cards (max 3)

### 3. UI/UX Enhancements

#### Timer System
- **Real-time Countdown**: Accurate second-based timer
- **Turn-based Colors**: Different colors for your turn vs others
- **Host vs Non-host**: Different UI for game start
- **Auto-hide Overlay**: 5-second dramatic losing message

#### Player Display
- **Clean Avatars**: Removed online status dots
- **Losing History**: Red ❌ marks on bottom border
- **Host Indicators**: Crown icons for host players
- **Responsive Layout**: Works on mobile and desktop

#### Losing Message System
- **Full-screen Overlay**: Dramatic 5-second overlay
- **Personal Messages**: Different for loser vs survivors
- **Auto-hide**: Disappears after 5 seconds
- **Persistent Messages**: Non-losers see survival message

### 4. Database Management
- **Reset Page**: `/reset` with comprehensive database tools
- **Player Cleanup**: Remove ghost players
- **Game State Reset**: Clear all game data
- **Connection Testing**: Test disconnect functionality

## Technical Solutions

### 1. Hydration Error Fix
**Problem**: Language toggle caused server/client mismatch
**Solution**: 
```typescript
// Client-side rendering with fallback
const [isClient, setIsClient] = useState(false);
useEffect(() => setIsClient(true), []);
if (!isClient) return <FallbackComponent />;
```

### 2. Losing State Persistence
**Problem**: Losing message disappeared on database sync
**Solution**: 
```typescript
// Local state independent of database
const [localLosingPlayer, setLocalLosingPlayer] = useState(null);
const [losingHistory, setLosingHistory] = useState({});
```

### 3. WebSocket Connection Stability
**Problem**: Unreliable connections and flashing status
**Solution**:
```typescript
// Robust reconnection with exponential backoff
realtime: {
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000)
}
```

### 4. Player Disconnection Reliability
**Problem**: Players not marked offline when tabs close
**Solution**:
```typescript
// Multiple event listeners + sendBeacon
navigator.sendBeacon('/api/player-disconnect', blob);
// Backup direct database update
supabase.from('web_players').update({is_online: false})
```

## File Structure

### Core Files
- `pages/game.tsx` - Main game interface
- `pages/reset.tsx` - Database management
- `src/hooks/useWebMultiplayer.tsx` - Core multiplayer logic
- `src/components/GameTimer.tsx` - Timer component
- `src/components/LetterGrid.tsx` - Letter selection
- `src/lib/supabase.ts` - Database configuration

### Key Components
- **GameTimer**: Turn-based colors, host controls
- **LetterGrid**: Turn-based interaction, used letter tracking
- **Player Cards**: Losing history, host indicators
- **Losing Overlay**: Full-screen dramatic message

## Database Schema

### Tables
- `web_players`: Player information and presence
- `web_game_states`: Current game state
- `web_game_events`: Real-time game events

### Key Fields
- `is_online`: Player presence tracking
- `last_seen`: Disconnection detection
- `losing_history`: Synced losing counts (local state)

## State Management

### Local State (Independent of DB)
```typescript
const [localLosingPlayer, setLocalLosingPlayer] = useState(null);
const [losingHistory, setLosingHistory] = useState({});
const [showOverlay, setShowOverlay] = useState(false);
```

### Game State (Synced with DB)
```typescript
interface GameState {
  currentCategory: Category;
  usedLetters: string[];
  isGameActive: boolean;
  currentPlayerIndex: number;
  playerScores: Record<string, number>;
  roundNumber: number;
  timerDuration: number;
}
```

## Event System

### Game Events
- `ROUND_START`: New round initiated
- `ROUND_TIMEOUT`: Timer expired, player lost
- `LETTER_SELECTED`: Letter chosen by player
- `GAME_RESET`: Full game reset
- `PLAYER_DISCONNECT`: Player left game

### Event Broadcasting
```typescript
broadcastEvent('ROUND_TIMEOUT', {
  playerId: losingPlayer.id,
  playerName: losingPlayer.name,
  losingHistory: updatedHistory
});
```

## UI Features

### Timer System
- **Your Turn**: Bright gradient, interactive
- **Not Your Turn**: Gray colors, non-interactive
- **Host**: Can start game, shows play button
- **Non-host**: Shows wait icon, can't start

### Losing System
- **Overlay**: 5-second full-screen message
- **Personal**: "You lost!" vs "Player X lost!"
- **History**: Red ❌ marks (max 3) on player cards
- **Persistence**: Stays until full game reset

### Player Cards
- **Current Player**: Larger, prominent position
- **Other Players**: Grid layout, smaller cards
- **Host Indicators**: Crown icons
- **Losing Marks**: Red ❌ on bottom border

## Connection Management

### WebSocket Health
- **Heartbeat**: 30-second intervals
- **Reconnection**: Exponential backoff
- **Status Tracking**: Connected/Disconnected/Polling
- **Fallback**: Polling mode if WebSocket fails

### Player Presence
- **Multiple Events**: beforeunload, pagehide, visibilitychange
- **sendBeacon**: Reliable disconnect on tab close
- **Backup Updates**: Direct database updates
- **Cleanup**: Aggressive ghost player removal

## Database Management Tools

### Reset Page Features
- **Statistics Dashboard**: Player counts, game states
- **Reset Database**: Clear all data
- **Clean Players**: Remove all players
- **Force Cleanup**: Mark inactive players offline
- **Test Disconnect**: Test disconnect API
- **Check Last Seen**: View player activity times

## Build Configuration

### Supabase Setup
```typescript
realtime: {
  params: { eventsPerSecond: 10 },
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000)
}
```

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Performance Optimizations

### Connection Stability
- **Exponential Backoff**: Smart reconnection delays
- **Health Checks**: Periodic connection verification
- **Status Synchronization**: Accurate UI status display
- **Fallback Polling**: Backup for WebSocket failures

### State Management
- **Local State**: Independent of database syncs
- **Selective Updates**: Only sync necessary data
- **Optimistic Updates**: Immediate UI feedback
- **Cleanup**: Proper event listener removal

## Error Handling

### Common Issues Fixed
1. **Hydration Errors**: Client-side rendering with fallbacks
2. **Connection Flashing**: Status synchronization
3. **Ghost Players**: Aggressive cleanup and reliable disconnects
4. **State Persistence**: Local state for critical features
5. **Build Errors**: Correct Supabase configuration

### Debugging Tools
- **Console Logging**: Detailed connection and game state logs
- **Reset Page**: Database inspection and management
- **Test Functions**: Disconnect and cleanup testing
- **Status Indicators**: Real-time connection status

## Future Considerations

### Scalability
- **Player Limits**: Consider maximum players per game
- **Game Instances**: Multiple concurrent games
- **Performance**: Monitor WebSocket connection limits

### Features to Add
- **Chat System**: Real-time messaging
- **Game History**: Persistent game records
- **Player Statistics**: Win/loss tracking
- **Custom Categories**: User-defined word categories

## Troubleshooting

### Common Problems
1. **Players not disconnecting**: Check sendBeacon and backup updates
2. **Losing history not syncing**: Verify ROUND_TIMEOUT event handling
3. **Connection instability**: Review WebSocket configuration
4. **Build failures**: Check Supabase configuration properties

### Debug Steps
1. Check browser console for connection logs
2. Use reset page to inspect database state
3. Test disconnect functionality
4. Verify environment variables are set

## Conclusion

This multiplayer game system provides a robust, real-time experience with advanced features like persistent losing history, reliable player management, and a polished UI. The combination of local state management and database synchronization ensures both performance and data consistency.

Key achievements:
- ✅ Reliable real-time multiplayer
- ✅ Persistent losing system with visual indicators
- ✅ Robust connection management
- ✅ Comprehensive database tools
- ✅ Polished UI with turn-based interactions
- ✅ Error-free build and deployment 