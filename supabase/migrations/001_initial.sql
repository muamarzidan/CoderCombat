CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_username_lower ON profiles (LOWER(username));

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id TEXT NOT NULL,
  player_a_id UUID NOT NULL REFERENCES auth.users (id),
  player_b_id UUID REFERENCES auth.users (id),
  winner_id UUID REFERENCES auth.users (id),
  hp_a INT DEFAULT 100,
  hp_b INT DEFAULT 100,
  reason TEXT CHECK (reason IN ('normal', 'disconnect')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  p.id,
  p.username,
  m.module_id,
  COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) as wins,
  COUNT(m.id) as total_matches
FROM profiles p
LEFT JOIN matches m ON (m.player_a_id = p.id OR m.player_b_id = p.id)
GROUP BY p.id, p.username, m.module_id;

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can only update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone"
  ON matches FOR SELECT USING (true);

CREATE POLICY "Matches can only be inserted by system"
  ON matches FOR INSERT WITH CHECK (
    auth.uid() = player_a_id OR auth.uid() = player_b_id
  );

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (username TEXT, wins BIGINT, duels BIGINT) AS $$
  SELECT p.username,
         COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) AS wins,
         COUNT(m.id) AS duels
  FROM profiles p
  JOIN matches m ON (m.player_a_id = p.id OR m.player_b_id = p.id)
  GROUP BY p.id, p.username
  ORDER BY wins DESC, duels DESC, p.username ASC
$$ LANGUAGE SQL STABLE;
