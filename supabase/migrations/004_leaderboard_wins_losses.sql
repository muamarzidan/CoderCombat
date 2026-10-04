DROP FUNCTION IF EXISTS get_leaderboard();

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (username TEXT, wins BIGINT, losses BIGINT, duels BIGINT) AS $$
  SELECT p.username,
         COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) AS wins,
         COUNT(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> p.id THEN 1 END) AS losses,
         COUNT(m.id) AS duels
  FROM profiles p
  JOIN matches m ON (m.player_a_id = p.id OR m.player_b_id = p.id)
  WHERE m.reason IS DISTINCT FROM 'bot'
  GROUP BY p.id, p.username
  ORDER BY wins DESC,
           (COUNT(CASE WHEN m.winner_id = p.id THEN 1 END))::numeric / NULLIF(COUNT(m.id), 0) DESC,
           p.username ASC
$$ LANGUAGE SQL STABLE;
