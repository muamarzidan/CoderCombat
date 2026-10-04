DROP FUNCTION IF EXISTS get_leaderboard();

CREATE OR REPLACE FUNCTION get_leaderboard(p_module_id TEXT DEFAULT NULL)
RETURNS TABLE (username TEXT, wins BIGINT, losses BIGINT, duels BIGINT) AS $$
  SELECT p.username,
         COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) AS wins,
         COUNT(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> p.id THEN 1 END) AS losses,
         COUNT(m.id) AS duels
  FROM profiles p
  JOIN matches m ON (m.player_a_id = p.id OR m.player_b_id = p.id)
  WHERE m.reason IS DISTINCT FROM 'bot'
    AND m.reason IS DISTINCT FROM 'room'
    AND (p_module_id IS NULL OR m.module_id = p_module_id)
  GROUP BY p.id, p.username
  ORDER BY wins DESC,
           (COUNT(CASE WHEN m.winner_id = p.id THEN 1 END))::numeric / NULLIF(COUNT(m.id), 0) DESC,
           p.username ASC
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT) TO anon, authenticated;
