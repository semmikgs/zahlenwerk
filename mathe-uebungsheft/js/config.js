// Zugangsdaten und Kursparameter.
//
// Der anon-Schlüssel darf öffentlich im Repository stehen – dafür ist er
// gedacht. Den Zugriff regeln die Richtlinien in der Datenbank, nicht der
// Schlüssel. Der service_role-Schlüssel gehört hier NIEMALS hinein.
//
// Zu finden unter: Project Settings → API → Project URL / anon public
//
// Solange der Platzhalter steht, läuft alles im Übungsmodus direkt auf dem
// Gerät – gut zum Ausprobieren, aber ohne Auswertung für die Lehrkraft.

export const CONFIG = {
  supabaseUrl: 'https://xzhxqbyobdlyqkyyjcxc.supabase.co',
  supabaseKey: 'sb_publishable_TlasNLd2Yxq8nxrkgHMnlA_J5-IezYg',

  // Eigenes Schema, damit sich die Schultools in derselben Datenbank
  // nicht ins Gehege kommen. Muss unter Settings → API → Exposed schemas
  // eingetragen sein.
  schema: 'zahlenwerk',

  // Zugangscodes werden intern zu einer Pseudo-Adresse. Diese Domain
  // existiert nicht und wird nie angeschrieben.
  loginDomain: 'zahlenwerk.local',

  aufgabenProLektion: 8,
  punkteProRichtig: 10,

  // Tagesstern: erreicht, wer diese Quote schafft ODER so lange übt.
  sternQuote: 0.75,
  sternZeitMs: 5 * 60 * 1000,

  // Fünf Sterne in einer Kalenderwoche ergeben den Wochenstern.
  // Wochenendtage zählen mit, sind also Joker.
  sterneProWoche: 5,

  // Längste Zeit, die eine einzelne Aufgabe zur Übungszeit beitragen darf.
  // Verhindert, dass ein liegen gelassenes Handy Sterne sammelt.
  maxDauerProAufgabeMs: 90 * 1000,

  // Leitner-Kästen: nach wie vielen Tagen eine Aufgabe wiederkommt.
  wiederholung: [0, 1, 2, 4, 8, 16, 30],
};

export const imUebungsmodus = () =>
  CONFIG.supabaseUrl.startsWith('HIER_') || CONFIG.supabaseKey.startsWith('HIER_');
