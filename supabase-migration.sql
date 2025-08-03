-- Migration script for existing databases
-- Run this in your Supabase SQL Editor if you already have tables

-- Add turn_start_time column to game_states table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_states' 
        AND column_name = 'turn_start_time'
    ) THEN
        ALTER TABLE game_states ADD COLUMN turn_start_time BIGINT;
    END IF;
END $$;

-- Update event_type check constraint to include TURN_TIMEOUT
ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_event_type_check;
ALTER TABLE game_events ADD CONSTRAINT game_events_event_type_check 
    CHECK (event_type IN ('LETTER_SELECTED', 'ROUND_START', 'GAME_RESET', 'TIMER_UPDATE', 'PLAYER_JOIN', 'PLAYER_LEAVE', 'TURN_TIMEOUT'));

-- Add unique constraint to prevent duplicate players per instance
-- (This might already exist from the schema, but adding it to be safe)
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_instance_user_unique;
ALTER TABLE participants ADD CONSTRAINT participants_instance_user_unique 
    UNIQUE (instance_id, user_id);