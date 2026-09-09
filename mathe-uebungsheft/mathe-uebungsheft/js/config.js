// Hier trägst du deine Supabase-Zugangsdaten ein.
// Solange die Platzhalter stehen bleiben, läuft alles im Übungsmodus
// direkt auf dem Gerät – gut zum Ausprobieren, aber ohne Auswertung für dich.

export const CONFIG = {
  supabaseUrl: 'HIER_SUPABASE_URL',
  supabaseKey: 'HIER_SUPABASE_ANON_KEY',

  // Kürzel werden intern zu einer Pseudo-Adresse. Diese Domain existiert nicht
  // und wird nie angeschrieben – sie ist nur ein technischer Platzhalter.
  loginDomain: 'uebungsheft.local',

  aufgabenProLektion: 8,
  punkteProRichtig: 10,

  // Leitner-Kästen: nach wie vielen Tagen eine Aufgabe wiederkommt.
  wiederholung: [0, 1, 2, 4, 8, 16, 30],
};

export const imUebungsmodus = () => CONFIG.supabaseUrl.startsWith('HIER_');
