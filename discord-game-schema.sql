-- Discord Game State Table
CREATE TABLE IF NOT EXISTS discord_game_states (
  id SERIAL PRIMARY KEY,
  instance_id TEXT UNIQUE NOT NULL,
  current_category JSONB NOT NULL,
  used_letters TEXT[] DEFAULT '{}',
  is_game_active BOOLEAN DEFAULT false,
  current_player_index INTEGER DEFAULT 0,
  player_scores JSONB DEFAULT '{}',
  round_number INTEGER DEFAULT 1,
  timer_duration INTEGER DEFAULT 30,
  host TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Game Events Table
CREATE TABLE IF NOT EXISTS discord_game_events (
  id SERIAL PRIMARY KEY,
  instance_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  player_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discord_game_states_instance_id ON discord_game_states(instance_id);
CREATE INDEX IF NOT EXISTS idx_discord_game_events_instance_id ON discord_game_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_discord_game_events_created_at ON discord_game_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE discord_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_game_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_game_states
CREATE POLICY "Allow public read access to discord game states" ON discord_game_states
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to discord game states" ON discord_game_states
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to discord game states" ON discord_game_states
  FOR UPDATE USING (true);

-- RLS Policies for discord_game_events
CREATE POLICY "Allow public read access to discord game events" ON discord_game_events
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to discord game events" ON discord_game_events
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_discord_game_states_updated_at
  BEFORE UPDATE ON discord_game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 