-- Web Multiplayer Schema
-- This schema is specifically for the web version of the multiplayer game

-- Web Players Table
CREATE TABLE IF NOT EXISTS web_players (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    global_name TEXT NOT NULL,
    avatar TEXT,
    is_host BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
);

-- Web Game States Table
CREATE TABLE IF NOT EXISTS web_game_states (
    instance_id TEXT PRIMARY KEY,
    current_category JSONB NOT NULL,
    used_letters TEXT[] DEFAULT '{}',
    is_game_active BOOLEAN DEFAULT FALSE,
    current_player_index INTEGER DEFAULT 0,
    player_scores JSONB DEFAULT '{}',
    round_number INTEGER DEFAULT 1,
    timer_duration INTEGER DEFAULT 30,
    host TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Web Game Events Table
CREATE TABLE IF NOT EXISTS web_game_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    player_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_web_players_online ON web_players(is_online);
CREATE INDEX IF NOT EXISTS idx_web_players_joined_at ON web_players(joined_at);
CREATE INDEX IF NOT EXISTS idx_web_game_events_instance_id ON web_game_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_web_game_events_created_at ON web_game_events(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE web_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_game_events ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on web_players" ON web_players FOR ALL USING (true);
CREATE POLICY "Allow all operations on web_game_states" ON web_game_states FOR ALL USING (true);
CREATE POLICY "Allow all operations on web_game_events" ON web_game_events FOR ALL USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_web_game_states_updated_at 
    BEFORE UPDATE ON web_game_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old offline players (optional)
CREATE OR REPLACE FUNCTION cleanup_old_players()
RETURNS void AS $$
BEGIN
    -- Mark players as offline if they haven't been seen in 5 minutes
    UPDATE web_players 
    SET is_online = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' 
    AND is_online = true;
END;
$$ LANGUAGE plpgsql;

-- You can call this function periodically or set up a cron job
-- SELECT cleanup_old_players(); 