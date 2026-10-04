DROP VIEW IF EXISTS leaderboard;

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
