-- Fix web_game_states table schema
-- Run this in your Supabase SQL editor

-- Add missing columns to web_game_states
ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS host TEXT;
ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS player_scores JSONB DEFAULT '{}';
ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 60;
ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE web_game_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'web_game_states' 
ORDER BY ordinal_position; 