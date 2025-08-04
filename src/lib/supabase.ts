import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        heartbeatIntervalMs: 30000, // 30 seconds
        reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000), // Exponential backoff
      },
      auth: {
        persistSession: false, // Don't persist auth for this app
      },
      global: {
        headers: {
          'X-Client-Info': 'web-multiplayer-game'
        }
      }
    })
  : null

// Database types for TypeScript
export interface GameEvent {
  id: string
  instance_id: string
  event_type: 'LETTER_SELECTED' | 'ROUND_START' | 'GAME_RESET' | 'TIMER_UPDATE' | 'PLAYER_JOIN' | 'PLAYER_LEAVE'
  payload: any
  player_id: string
  created_at: string
}

export interface GameState {
  id: string
  instance_id: string
  current_category: any
  used_letters: string[]
  is_game_active: boolean
  current_player_index: number
  player_scores: Record<string, number>
  round_number: number
  timer_duration: number
  host: string | null
  updated_at: string
}

export interface Participant {
  id: string
  instance_id: string
  user_id: string
  username: string
  global_name: string | null
  avatar: string | null
  is_host: boolean
  joined_at: string
} 