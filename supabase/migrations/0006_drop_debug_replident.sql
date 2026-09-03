-- Cleanup: debug_replident() was a one-off diagnostic used to confirm
-- REPLICA IDENTITY FULL was actually set on game_events while tracking down
-- why Realtime's DELETE payloads only ever carry the primary key. No longer
-- needed — the client works around that limitation by treating any DELETE
-- notification as "resync the whole log" instead of reading payload.old.
drop function if exists debug_replident(text);
