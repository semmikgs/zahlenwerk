-- Datenbank für das Übungsheft.
-- Einmal komplett im SQL-Editor von Supabase ausführen.

-- 1) Tabellen ---------------------------------------------------------

create table if not exists profil (
  id      uuid primary key references auth.users on delete cascade,
  kuerzel text not null unique,
  klasse  text not null default '',
  rolle   text not null default 'schueler'
);

create table if not exists versuch (
  id       bigserial primary key,
  nutzer   uuid not null references auth.users on delete cascade,
  kapitel  text not null,
  vorlage  text not null,
  tags     text[] not null default '{}',
  richtig  boolean not null,
  fehler   text,
  erstellt timestamptz not null default now()
);
create index if not exists versuch_nutzer_idx on versuch (nutzer, erstellt desc);

create table if not exists lernstand (
  nutzer  uuid not null references auth.users on delete cascade,
  kapitel text not null,
  vorlage text not null,
  box     int  not null default 0,
  faellig date not null default current_date,
  primary key (nutzer, vorlage)
);

create table if not exists tagesziel (
  nutzer      uuid primary key references auth.users on delete cascade,
  streak      int  not null default 0,
  xp          int  not null default 0,
  letzter_tag date
);

-- 2) Zugriffsregeln ---------------------------------------------------
-- Grundsatz: Schüler sehen und schreiben nur ihre eigenen Zeilen.
-- Lehrkräfte dürfen alles lesen.

alter table profil    enable row level security;
alter table versuch   enable row level security;
alter table lernstand enable row level security;
alter table tagesziel enable row level security;

create or replace function ist_lehrer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profil where id = auth.uid() and rolle = 'lehrer');
$$;

drop policy if exists profil_lesen on profil;
create policy profil_lesen on profil for select
  using (id = auth.uid() or ist_lehrer());

drop policy if exists versuch_lesen on versuch;
create policy versuch_lesen on versuch for select
  using (nutzer = auth.uid() or ist_lehrer());

drop policy if exists versuch_schreiben on versuch;
create policy versuch_schreiben on versuch for insert
  with check (nutzer = auth.uid());

drop policy if exists lernstand_alles on lernstand;
create policy lernstand_alles on lernstand for all
  using (nutzer = auth.uid() or ist_lehrer())
  with check (nutzer = auth.uid());

drop policy if exists tagesziel_alles on tagesziel;
create policy tagesziel_alles on tagesziel for all
  using (nutzer = auth.uid() or ist_lehrer())
  with check (nutzer = auth.uid());


-- 3) Schülerkonten anlegen -------------------------------------------
-- Konten selbst legst du unter Authentication > Users an
-- (oder per CSV-Import). Als E-Mail nimmst du:
--     kuerzel@uebungsheft.local        z. B. 9a-14@uebungsheft.local
-- Danach hier die Zuordnung zur Klasse eintragen:

-- insert into profil (id, kuerzel, klasse, rolle)
-- select id, split_part(email, '@', 1), '9a', 'schueler'
-- from auth.users
-- where email like '9a-%@uebungsheft.local'
-- on conflict (id) do update set klasse = excluded.klasse;

-- Dein eigenes Konto danach zur Lehrkraft machen:
-- update profil set rolle = 'lehrer' where kuerzel = 'lehrer';
