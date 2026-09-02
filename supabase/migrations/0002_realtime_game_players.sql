-- The lobby screen subscribes to game_players INSERTs to detect when the
-- other player joins, but 0001_init.sql only added game_events to the
-- Realtime publication. Add game_players too.
alter publication supabase_realtime add table game_players;
