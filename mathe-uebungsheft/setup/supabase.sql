-- ============================================================
--  Zahlenwerk – Datenbank
--  Einmal komplett im SQL-Editor von Supabase ausführen.
--
--  Danach zwingend: Project Settings → API → Exposed schemas
--  um "zahlenwerk" ergänzen. Sonst antwortet die Datenbank nicht.
-- ============================================================

create schema if not exists zahlenwerk;
grant usage on schema zahlenwerk to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 1) Profile
--    Ein Eintrag je Konto. Schüler melden sich mit einem Code an,
--    Lehrkräfte mit E-Mail und Passwort.
--    Klarnamen stehen hier bewusst NICHT – die bleiben auf Papier.
-- ------------------------------------------------------------

create table if not exists zahlenwerk.profil (
  id                 uuid primary key references auth.users on delete cascade,
  code               text unique,                      -- nur Schüler
  klasse             text not null default '',
  rolle              text not null default 'schueler', -- schueler | lehrer
  spitzname          text,                             -- selbst gewählt, Lobby
  spitzname_gesperrt boolean not null default false,   -- von der Lehrkraft gesperrt
  aktiv              boolean not null default true,
  erstellt           timestamptz not null default now()
);
create index if not exists profil_klasse_idx on zahlenwerk.profil (klasse, rolle);

-- ------------------------------------------------------------
-- 2) Einzelne Antworten
--    dauer_ms ist aktive Zeit, in der App auf 90 s je Aufgabe gedeckelt.
-- ------------------------------------------------------------

create table if not exists zahlenwerk.versuch (
  id       bigserial primary key,
  nutzer   uuid not null references auth.users on delete cascade,
  lektion  uuid,
  kapitel  text not null,
  vorlage  text not null,
  tags     text[] not null default '{}',
  richtig  boolean not null,
  fehler   text,
  dauer_ms integer not null default 0,
  erstellt timestamptz not null default now()
);
create index if not exists versuch_nutzer_idx  on zahlenwerk.versuch (nutzer, erstellt desc);
create index if not exists versuch_kapitel_idx on zahlenwerk.versuch (kapitel);
create index if not exists versuch_zeit_idx    on zahlenwerk.versuch (erstellt desc);

-- ------------------------------------------------------------
-- 3) Abgeschlossene Lektionen
-- ------------------------------------------------------------

create table if not exists zahlenwerk.lektion (
  id             uuid primary key,
  nutzer         uuid not null references auth.users on delete cascade,
  tag            date not null default current_date,
  art            text not null default 'tages',  -- tages | kapitel | woche
  kapitel        text,
  aufgaben       integer not null default 0,
  richtig        integer not null default 0,
  aktive_zeit_ms integer not null default 0,
  beendet        timestamptz not null default now()
);
create index if not exists lektion_nutzer_tag_idx on zahlenwerk.lektion (nutzer, tag desc);

-- ------------------------------------------------------------
-- 4) Wiederholungsplan (Leitner)
-- ------------------------------------------------------------

create table if not exists zahlenwerk.lernstand (
  nutzer  uuid not null references auth.users on delete cascade,
  kapitel text not null,
  vorlage text not null,
  box     integer not null default 0,
  faellig date   not null default current_date,
  primary key (nutzer, vorlage)
);
create index if not exists lernstand_faellig_idx on zahlenwerk.lernstand (nutzer, faellig);

-- ------------------------------------------------------------
-- 5) Tagessterne
--    Ein Stern je Tag. Bedingung: 75 % richtig ODER 5 Minuten aktiv.
--    Der Grund wird mitgeschrieben, damit du siehst, wer sich den
--    Stern errechnet und wer ihn aussitzt.
-- ------------------------------------------------------------

create table if not exists zahlenwerk.stern (
  nutzer   uuid not null references auth.users on delete cascade,
  tag      date not null,
  grund    text not null,                 -- quote | zeit
  quote    numeric(4,3) not null default 0,
  zeit_ms  integer not null default 0,
  erstellt timestamptz not null default now(),
  primary key (nutzer, tag)
);

-- ------------------------------------------------------------
-- 6) Wochenaufgabe
--    Textaufgabe auf höherem Niveau, in Schritten zu lösen.
--    schritte: [{ "frage": "...", "loesung": "42", "einheit": "€" }, ...]
-- ------------------------------------------------------------

create table if not exists zahlenwerk.wochenaufgabe (
  id       bigserial primary key,
  klasse   text not null,
  jahr     integer not null,
  kw       integer not null,
  titel    text not null,
  text     text not null,
  schritte jsonb not null default '[]',
  aktiv    boolean not null default true,
  erstellt timestamptz not null default now(),
  unique (klasse, jahr, kw)
);

create table if not exists zahlenwerk.wochenaufgabe_versuch (
  id       bigserial primary key,
  nutzer   uuid not null references auth.users on delete cascade,
  aufgabe  bigint not null references zahlenwerk.wochenaufgabe on delete cascade,
  schritt  integer not null,
  eingabe  text,
  richtig  boolean not null,
  erstellt timestamptz not null default now()
);
create index if not exists wa_versuch_idx on zahlenwerk.wochenaufgabe_versuch (nutzer, aufgabe);

-- ------------------------------------------------------------
-- 7) Kapitelverwaltung
--    Die Inhalte bleiben Dateien im Repo. Hier steht nur,
--    wie ein Kapitel heißt und ob es aktiv oder archiviert ist.
-- ------------------------------------------------------------

create table if not exists zahlenwerk.kapitel (
  id           text primary key,            -- muss zur Datei in kapitel/ passen
  anzeigename  text,
  status       text not null default 'aktiv', -- aktiv | archiv
  reihenfolge  integer not null default 100,
  geaendert    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8) Hilfsfunktion und Auswertungen
-- ------------------------------------------------------------

-- Wird von den Views und von allen Zugriffsregeln benutzt.
create or replace function zahlenwerk.ist_lehrer() returns boolean
language sql stable security definer set search_path = zahlenwerk, public as $$
  select exists (select 1 from zahlenwerk.profil where id = auth.uid() and rolle = 'lehrer');
$$;

-- Wochenübersicht je Schüler
--    Fünf Sterne in einer Kalenderwoche ergeben den Wochenstern.
--    Wochenendtage zählen als Joker, liegen also oben drauf.
-- ------------------------------------------------------------

create or replace view zahlenwerk.wochenbilanz as
select
  p.id                                             as nutzer,
  p.klasse,
  extract(isoyear from s.tag)::int                 as jahr,
  extract(week    from s.tag)::int                 as kw,
  count(*)::int                                    as sterne,
  count(*) filter (where extract(isodow from s.tag) >= 6)::int as joker,
  count(*) >= 5                                    as wochenstern
from zahlenwerk.profil p
join zahlenwerk.stern  s on s.nutzer = p.id
group by p.id, p.klasse, 3, 4;

-- Lobby: aktuelle Kalenderwoche, nach Sternen sortiert.
--
-- Diese View läuft bewusst mit den Rechten ihres Eigentümers und nicht mit
-- denen des Aufrufers. Nur so sehen Schüler einander überhaupt – die
-- Zugriffsregel auf "profil" lässt sonst jeden nur sich selbst sehen.
-- Dafür gibt die View ausschließlich Spitzname und Sterne heraus, und nur
-- innerhalb der eigenen Klasse. Keine Codes, keine Ergebnisse, keine Fehler.
create or replace view zahlenwerk.lobby as
select
  p.id     as nutzer,
  p.klasse,
  coalesce(nullif(p.spitzname, ''), 'Namenlos') as name,
  (p.id = auth.uid())                           as ich,
  coalesce(s.sterne, 0)::int                    as sterne_woche,
  coalesce(s.sterne, 0) >= 5                    as wochenstern,
  coalesce(g.gesamt, 0)::int                    as sterne_gesamt,
  coalesce(wa.geloest, false)                   as wochenaufgabe_geloest
from zahlenwerk.profil p

left join lateral (
  select count(*) as sterne
  from zahlenwerk.stern s
  where s.nutzer = p.id
    and extract(isoyear from s.tag)::int = extract(isoyear from current_date)::int
    and extract(week    from s.tag)::int = extract(week    from current_date)::int
) s on true

left join lateral (
  select count(*) as gesamt from zahlenwerk.stern s2 where s2.nutzer = p.id
) g on true

left join lateral (
  select bool_or(fertig) as geloest
  from (
    select count(distinct wv.schritt) >= jsonb_array_length(w.schritte) as fertig
    from zahlenwerk.wochenaufgabe_versuch wv
    join zahlenwerk.wochenaufgabe w on w.id = wv.aufgabe
    where wv.nutzer = p.id
      and wv.richtig
      and w.jahr = extract(isoyear from current_date)::int
      and w.kw   = extract(week    from current_date)::int
    group by wv.aufgabe, w.schritte
  ) t
) wa on true

where p.rolle = 'schueler'
  and p.aktiv
  -- Nur die eigene Klasse; Lehrkräfte sehen alle.
  and (
    zahlenwerk.ist_lehrer()
    or p.klasse = (select k.klasse from zahlenwerk.profil k where k.id = auth.uid())
  );

-- ------------------------------------------------------------
-- 9) Zugriffsregeln
--    Schüler sehen und schreiben nur ihre eigenen Zeilen.
--    Lehrkräfte lesen alles und dürfen verwalten.
-- ------------------------------------------------------------

alter table zahlenwerk.profil                enable row level security;
alter table zahlenwerk.versuch               enable row level security;
alter table zahlenwerk.lektion               enable row level security;
alter table zahlenwerk.lernstand             enable row level security;
alter table zahlenwerk.stern                 enable row level security;
alter table zahlenwerk.wochenaufgabe         enable row level security;
alter table zahlenwerk.wochenaufgabe_versuch enable row level security;
alter table zahlenwerk.kapitel               enable row level security;

-- Profil
drop policy if exists profil_lesen on zahlenwerk.profil;
create policy profil_lesen on zahlenwerk.profil for select
  using (id = auth.uid() or zahlenwerk.ist_lehrer());

-- Schüler dürfen nur ihren Spitznamen ändern, und nur wenn er nicht gesperrt ist.
drop policy if exists profil_spitzname on zahlenwerk.profil;
create policy profil_spitzname on zahlenwerk.profil for update
  using (id = auth.uid() and not spitzname_gesperrt)
  with check (id = auth.uid() and not spitzname_gesperrt);

drop policy if exists profil_lehrer_pflegen on zahlenwerk.profil;
create policy profil_lehrer_pflegen on zahlenwerk.profil for update
  using (zahlenwerk.ist_lehrer()) with check (zahlenwerk.ist_lehrer());

-- Versuche
drop policy if exists versuch_lesen on zahlenwerk.versuch;
create policy versuch_lesen on zahlenwerk.versuch for select
  using (nutzer = auth.uid() or zahlenwerk.ist_lehrer());

drop policy if exists versuch_schreiben on zahlenwerk.versuch;
create policy versuch_schreiben on zahlenwerk.versuch for insert
  with check (nutzer = auth.uid());

-- Lektionen
drop policy if exists lektion_lesen on zahlenwerk.lektion;
create policy lektion_lesen on zahlenwerk.lektion for select
  using (nutzer = auth.uid() or zahlenwerk.ist_lehrer());

drop policy if exists lektion_schreiben on zahlenwerk.lektion;
create policy lektion_schreiben on zahlenwerk.lektion for insert
  with check (nutzer = auth.uid());

-- Lernstand
drop policy if exists lernstand_lesen on zahlenwerk.lernstand;
create policy lernstand_lesen on zahlenwerk.lernstand for select
  using (nutzer = auth.uid() or zahlenwerk.ist_lehrer());

drop policy if exists lernstand_pflegen on zahlenwerk.lernstand;
create policy lernstand_pflegen on zahlenwerk.lernstand for all
  using (nutzer = auth.uid()) with check (nutzer = auth.uid());

-- Sterne
drop policy if exists stern_lesen on zahlenwerk.stern;
create policy stern_lesen on zahlenwerk.stern for select
  using (nutzer = auth.uid() or zahlenwerk.ist_lehrer());

drop policy if exists stern_pflegen on zahlenwerk.stern;
create policy stern_pflegen on zahlenwerk.stern for all
  using (nutzer = auth.uid()) with check (nutzer = auth.uid());

-- Wochenaufgabe: alle lesen, nur Lehrkräfte schreiben
drop policy if exists wa_lesen on zahlenwerk.wochenaufgabe;
create policy wa_lesen on zahlenwerk.wochenaufgabe for select
  using (auth.uid() is not null);

drop policy if exists wa_pflegen on zahlenwerk.wochenaufgabe;
create policy wa_pflegen on zahlenwerk.wochenaufgabe for all
  using (zahlenwerk.ist_lehrer()) with check (zahlenwerk.ist_lehrer());

drop policy if exists wav_lesen on zahlenwerk.wochenaufgabe_versuch;
create policy wav_lesen on zahlenwerk.wochenaufgabe_versuch for select
  using (nutzer = auth.uid() or zahlenwerk.ist_lehrer());

drop policy if exists wav_schreiben on zahlenwerk.wochenaufgabe_versuch;
create policy wav_schreiben on zahlenwerk.wochenaufgabe_versuch for insert
  with check (nutzer = auth.uid());

-- Kapitel: alle lesen, nur Lehrkräfte schreiben
drop policy if exists kapitel_lesen on zahlenwerk.kapitel;
create policy kapitel_lesen on zahlenwerk.kapitel for select using (true);

drop policy if exists kapitel_pflegen on zahlenwerk.kapitel;
create policy kapitel_pflegen on zahlenwerk.kapitel for all
  using (zahlenwerk.ist_lehrer()) with check (zahlenwerk.ist_lehrer());

-- ------------------------------------------------------------
-- 10) Rechte für die Schnittstelle
-- ------------------------------------------------------------

grant select, insert, update, delete on all tables    in schema zahlenwerk to authenticated;
grant usage,  select                 on all sequences in schema zahlenwerk to authenticated;
grant select                         on zahlenwerk.lobby, zahlenwerk.wochenbilanz to authenticated;

-- Die Wochenbilanz folgt den normalen Zugriffsregeln.
alter view zahlenwerk.wochenbilanz set (security_invoker = on);

-- Die Lobby nicht: sie muss klassenweit lesen dürfen und filtert selbst.
-- Ihre Spalten enthalten deshalb nur Spitzname und Sterne.
alter view zahlenwerk.lobby set (security_invoker = off);

-- ------------------------------------------------------------
-- 11) Dein eigenes Lehrerkonto
--     Lege dich unter Authentication → Users mit deiner
--     dienstlichen E-Mail an und trage dich dann hier ein:
-- ------------------------------------------------------------

-- insert into zahlenwerk.profil (id, rolle, klasse)
-- select id, 'lehrer', '' from auth.users where email = 'deine@schule.de'
-- on conflict (id) do update set rolle = 'lehrer';
