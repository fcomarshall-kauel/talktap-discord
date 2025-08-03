-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create game_events table
CREATE TABLE game_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('LETTER_SELECTED', 'ROUND_START', 'GAME_RESET', 'TIMER_UPDATE', 'PLAYER_JOIN', 'PLAYER_LEAVE', 'TURN_TIMEOUT')),
  payload JSONB DEFAULT '{}',
  player_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_states table
CREATE TABLE game_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id TEXT UNIQUE NOT NULL,
  current_category JSONB DEFAULT '{}',
  used_letters TEXT[] DEFAULT '{}',
  is_game_active BOOLEAN DEFAULT FALSE,
  current_player_index INTEGER DEFAULT 0,
  player_scores JSONB DEFAULT '{}',
  round_number INTEGER DEFAULT 1,
  timer_duration INTEGER DEFAULT 30,
  host TEXT,
  turn_start_time BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar TEXT,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_game_events_instance_id ON game_events(instance_id);
CREATE INDEX idx_game_events_created_at ON game_events(created_at);
CREATE INDEX idx_game_states_instance_id ON game_states(instance_id);
CREATE INDEX idx_participants_instance_id ON participants(instance_id);

-- Enable Row Level Security
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow public read access to game_events" ON game_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to game_events" ON game_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to game_states" ON game_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to game_states" ON game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to game_states" ON game_states FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to participants" ON participants FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to participants" ON participants FOR DELETE USING (true);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE participants; 