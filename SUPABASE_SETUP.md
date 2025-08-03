# Supabase Real-time Multiplayer Setup

## 🚀 Overview

This implementation uses Supabase Realtime to provide true real-time multiplayer functionality with WebSocket connections instead of polling.

## 📋 Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the contents of `supabase-schema.sql`

### 4. Enable Realtime

1. Go to Database → Replication
2. Enable real-time for all tables:
   - `game_events`
   - `game_states` 
   - `participants`

## 🎯 Benefits

- **True real-time**: WebSocket connections (~50-100ms latency)
- **No polling**: Eliminates constant HTTP requests
- **Automatic reconnection**: Handles network issues gracefully
- **Built-in presence**: Track who's online
- **Better performance**: Lower server load

## 🔄 Migration from Polling

The new `useSupabaseMultiplayer` hook replaces `useMultiplayerGame` and provides:

- ✅ **Same API**: Drop-in replacement
- ✅ **Better performance**: Real-time updates
- ✅ **Lower latency**: ~50-100ms instead of 300ms
- ✅ **More reliable**: WebSocket connections

## 🧪 Testing

1. Set up Supabase project
2. Configure environment variables
3. Run the database schema
4. Test multiplayer functionality

The game should now have much faster, more responsive real-time updates! 