# 🎮 Web Multiplayer Basta! Game

A real-time web multiplayer version of your Discord game using Supabase Realtime WebSockets.

## 🚀 **How to Play**

### **Quick Start**
1. Visit: `http://localhost:3000/multiplayer-web`
2. Share the URL with friends (up to 6 players total)
3. First player becomes the host 👑
4. Host starts the round when ready
5. Take turns selecting letters within 15 seconds
6. Miss your turn? Get auto-skipped!

### **Game Flow**
```
Player 1 joins → becomes Host 👑
Player 2 joins → sees Player 1 is host
Player 3-6 join → all see real-time updates
Host clicks "Start Round" → everyone sees game start
Player 1 selects letter → turn goes to Player 2
Player 2 selects letter → turn goes to Player 3
... continue until timer runs out
```

## ✨ **Key Features**

### **🔄 Auto-Join System**
- **Automatic player detection** - just open the URL!
- **Dynamic host assignment** - first player becomes host
- **Real-time player list** - see who joins/leaves instantly
- **Maximum 6 players** - shows "Game Full" when limit reached

### **⏰ Turn-Based Timer**
- **15 seconds per turn** - visible countdown timer
- **Auto-skip on timeout** - no waiting for inactive players
- **Visual urgency** - letters turn red when time is low
- **Turn synchronization** - all players see the same timer

### **👥 Player Management**
- **Visual player cards** - see all connected players
- **Online status indicators** - green = online, gray = offline
- **Current turn highlighting** - active player gets green border
- **Host privileges** - only host can start/stop rounds

### **🎯 Real-time Synchronization**
- **Instant updates** - ~50-100ms latency via WebSockets
- **Letter selection sync** - all players see moves instantly
- **Game state persistence** - refreshing page maintains state
- **Turn coordination** - perfect turn-based flow

## 🔧 **Technical Implementation**

### **Database Schema Updates**
Run this migration for existing databases:
```sql
-- Add timer support
ALTER TABLE game_states ADD COLUMN turn_start_time BIGINT;

-- Add timeout event type
ALTER TABLE game_events DROP CONSTRAINT game_events_event_type_check;
ALTER TABLE game_events ADD CONSTRAINT game_events_event_type_check 
    CHECK (event_type IN ('LETTER_SELECTED', 'ROUND_START', 'GAME_RESET', 'TIMER_UPDATE', 'PLAYER_JOIN', 'PLAYER_LEAVE', 'TURN_TIMEOUT'));
```

### **Key Components**

#### **Auto-Join Logic**
```typescript
// Generates unique player ID and joins game automatically
const joinGame = async () => {
  const playerId = generatePlayerId();
  const isHost = activePlayerCount === 0; // First player = host
  
  await supabase.from('participants').insert({
    instance_id: GAME_INSTANCE_ID,
    user_id: playerId,
    username: `player${playerNumber}`,
    global_name: `Player ${playerNumber}`,
    is_host: isHost
  });
};
```

#### **Timer System**
```typescript
// Real-time countdown with auto-skip
useEffect(() => {
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameState.turnStartTime!) / 1000);
    const remaining = Math.max(0, TURN_TIMER_DURATION - elapsed);
    setTimeLeft(remaining);

    if (remaining === 0 && isCurrentPlayer()) {
      handleTimeUp(); // Auto-skip turn
    }
  }, 100);
}, [gameState.turnStartTime]);
```

#### **Turn Management**
```typescript
// Cycles through players automatically
const selectLetter = (letter: string) => {
  broadcastEvent('LETTER_SELECTED', { letter });
  updateGameState({
    usedLetters: [...gameState.usedLetters, letter],
    currentPlayerIndex: (currentPlayerIndex + 1) % players.length,
    turnStartTime: Date.now() // Reset timer
  });
};
```

### **Real-time Subscriptions**
- **`participants` table** - Player join/leave events
- **`game_events` table** - Letter selections, timeouts
- **`game_states` table** - Overall game state changes

## 🎯 **Game States**

| State | Description | Available Actions |
|-------|-------------|-------------------|
| **Waiting** | < 2 players connected | Join game, wait for others |
| **Ready** | 2+ players, game stopped | Host can start round |
| **Active** | Game in progress | Current player selects letter |
| **Turn Timeout** | Player missed their turn | Auto-advance to next player |
| **Full** | 6 players connected | Show "Game Full" message |

## 🔄 **Event Types**

- **`LETTER_SELECTED`** - Player chose a letter
- **`ROUND_START`** - Host started new round
- **`GAME_RESET`** - Host stopped the game
- **`TURN_TIMEOUT`** - Player's time ran out

## 🎨 **UI Features**

### **Player Cards**
- 🟢 **Green border** = current turn
- 👑 **Crown icon** = host
- 🔴 **Red dot** = online status
- 💙 **"You" badge** = current player

### **Timer Display**
- ⏰ **Blue background** = normal time
- 🔴 **Red background** = < 5 seconds left
- 💥 **Pulsing animation** = urgent

### **Letter Grid**
- 🔵 **Blue letters** = available
- ⚪ **Gray letters** = already used
- 🔴 **Red letters** = urgent (< 5 seconds)
- ✋ **Disabled** = not your turn

## 🚀 **Performance**

- **WebSocket connections** for real-time updates
- **Database-level filtering** for efficient queries
- **Optimistic UI updates** for responsive feeling
- **Auto-cleanup** when players leave

## 🔐 **Security**

- **Row Level Security** policies on all tables
- **Instance-based isolation** between games
- **Player validation** before game actions
- **Host privilege checking** for game controls

## 🧪 **Testing**

1. **Open multiple browser tabs** to simulate different players
2. **Test auto-join** - each tab becomes a different player
3. **Verify timer sync** - all tabs show same countdown
4. **Test timeout handling** - let timer run out
5. **Check host controls** - only first player can start/stop

## 🌐 **Production Deployment**

Ready for production! This uses the same Supabase Realtime infrastructure as your Discord game, so it scales automatically and handles network issues gracefully.

Perfect for sharing with friends or as a standalone web game! 🎉