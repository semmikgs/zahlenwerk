-- ============================================================
--  Nachtrag: Lauf (Streak) in der Rangliste
--
--  Ein Lauf zählt die Tage am Stück, an denen ein Schüler seinen Stern
--  geholt hat. Weil das Ziel fünfmal pro Woche lautet, brechen Samstag und
--  Sonntag den Lauf nicht – nur ein Werktag ohne Stern tut das. Der heutige
--  Tag bricht ebenfalls nichts, er läuft ja noch.
--
--  Einmal im SQL-Editor ausführen. Wer supabase.sql in der aktuellen Fassung
--  frisch einspielt, braucht diese Datei nicht.
-- ============================================================

-- Eine neue Spalte lässt sich nicht in eine bestehende View schieben,
-- deshalb wird sie neu angelegt. Daten gehen dabei keine verloren.
drop view if exists zahlenwerk.lobby;

create view zahlenwerk.lobby as
select
  p.id     as nutzer,
  p.klasse,
  coalesce(nullif(p.spitzname, ''), 'Namenlos') as name,
  (p.id = auth.uid())                           as ich,
  coalesce(w.sterne, 0)::int                    as sterne_woche,
  coalesce(w.sterne, 0) >= 5                    as wochenstern,
  coalesce(g.gesamt, 0)::int                    as sterne_gesamt,
  coalesce(lf.lauf, 0)::int                     as lauf,
  coalesce(wa.geloest, false)                   as wochenaufgabe_geloest
from zahlenwerk.profil p

left join lateral (
  select count(*) as sterne
  from zahlenwerk.stern s
  where s.nutzer = p.id
    and extract(isoyear from s.tag)::int = extract(isoyear from current_date)::int
    and extract(week    from s.tag)::int = extract(week    from current_date)::int
) w on true

left join lateral (
  select count(*) as gesamt from zahlenwerk.stern s2 where s2.nutzer = p.id
) g on true

-- Lauf: alle Sterne seit dem letzten Werktag ohne Stern.
left join lateral (
  select count(*) as lauf
  from zahlenwerk.stern s3
  where s3.nutzer = p.id
    and s3.tag > coalesce((
      select max(g2.tag::date)
      from generate_series((current_date - 180)::timestamp,
                           (current_date - 1)::timestamp,
                           interval '1 day') as g2(tag)
      where extract(isodow from g2.tag) < 6          -- nur Werktage brechen
        and not exists (
          select 1 from zahlenwerk.stern s4
          where s4.nutzer = p.id and s4.tag = g2.tag::date)
    ), (current_date - 181)::date)
) lf on true

left join lateral (
  select bool_or(fertig) as geloest
  from (
    select count(distinct wv.schritt) >= jsonb_array_length(w2.schritte) as fertig
    from zahlenwerk.wochenaufgabe_versuch wv
    join zahlenwerk.wochenaufgabe w2 on w2.id = wv.aufgabe
    where wv.nutzer = p.id
      and wv.richtig
      and w2.jahr = extract(isoyear from current_date)::int
      and w2.kw   = extract(week    from current_date)::int
    group by wv.aufgabe, w2.schritte
  ) t
) wa on true

where p.rolle = 'schueler'
  and p.aktiv
  and (
    zahlenwerk.ist_lehrer()
    or p.klasse = (select k.klasse from zahlenwerk.profil k where k.id = auth.uid())
  );

alter view zahlenwerk.lobby set (security_invoker = off);
grant select on zahlenwerk.lobby to authenticated, service_role;

-- Gegenprobe: muss eine Tabelle liefern statt einer Fehlermeldung.
select name, lauf, sterne_gesamt from zahlenwerk.lobby order by lauf desc limit 5;
