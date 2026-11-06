-- ============================================================
--  Nachtrag: Rechte für die Serverrolle
--
--  Die Edge Function arbeitet als "service_role". Diese Rolle umgeht zwar die
--  Zugriffsregeln, braucht aber trotzdem die normalen Tabellenrechte – sonst
--  meldet sie "permission denied for table profil".
--
--  Einmal im SQL-Editor ausführen. Wer supabase.sql in der aktuellen Fassung
--  frisch einspielt, braucht diese Datei nicht.
-- ============================================================

grant usage on schema zahlenwerk to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema zahlenwerk to authenticated, service_role;

grant usage, select
  on all sequences in schema zahlenwerk to authenticated, service_role;

-- Auch für Tabellen, die später dazukommen.
alter default privileges in schema zahlenwerk
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema zahlenwerk
  grant usage, select on sequences to authenticated, service_role;

-- Gegenprobe: muss eine Zahl liefern statt einer Fehlermeldung.
select count(*) as profile_sichtbar from zahlenwerk.profil;
