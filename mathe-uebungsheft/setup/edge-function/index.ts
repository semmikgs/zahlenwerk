// ============================================================
//  Zahlenwerk – Schülerverwaltung
//
//  Diese Funktion legt Schülerkonten an und gibt die Zugangscodes
//  zurück. Sie läuft auf dem Supabase-Server, weil dafür der
//  service_role-Schlüssel nötig ist – der darf niemals in das
//  öffentliche Repository.
//
//  Namen werden NICHT gespeichert. Sie dienen nur dazu, die
//  zurückgegebenen Codes den richtigen Streifen zuzuordnen.
//
//  Einrichtung: siehe ANLEITUNG.md in diesem Ordner.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL')!;

/* Supabase stellt den geheimen Schlüssel je nach Projektalter unter zwei
   Namen bereit: klassisch als SUPABASE_SERVICE_ROLE_KEY, in neueren Projekten
   als Liste unter SUPABASE_SECRET_KEYS. Beide werden akzeptiert.

   Wichtig ist, dass es wirklich ein geheimer Schlüssel ist. Ein versehentlich
   eingesetzter öffentlicher Schlüssel würde den Zugriffsregeln unterliegen und
   nichts finden – das sähe dann aus wie fehlende Lehrerrechte. */
function schluesselKandidaten(): { quelle: string; wert: string }[] {
  const gefunden: { quelle: string; wert: string }[] = [];

  const klassisch = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (klassisch) gefunden.push({ quelle: 'SUPABASE_SERVICE_ROLE_KEY', wert: klassisch });

  const liste = Deno.env.get('SUPABASE_SECRET_KEYS') ?? '';
  if (liste) {
    let werte: string[] = [];
    try {
      const gelesen = JSON.parse(liste);
      if (Array.isArray(gelesen)) {
        werte = gelesen.map((e) =>
          typeof e === 'string' ? e : (e?.api_key ?? e?.key ?? e?.secret ?? ''));
      } else if (typeof gelesen === 'string') {
        werte = [gelesen];
      }
    } catch {
      werte = liste.split(',');
    }
    for (const w of werte) {
      const sauber = String(w).trim();
      if (sauber) gefunden.push({ quelle: 'SUPABASE_SECRET_KEYS', wert: sauber });
    }
  }

  // Ein öffentlicher Schlüssel taugt hier nicht und würde nur Verwirrung stiften.
  return gefunden.filter((k) => !k.wert.startsWith('sb_publishable_'));
}

const KANDIDATEN = schluesselKandidaten();
const SERVICE_KEY = KANDIDATEN[0]?.wert ?? '';

// Zeichen, die sich auf Papier nicht verwechseln lassen.
// Kein O/0, kein I/l/1, kein S/5, kein Z/2, kein B/8.
const ZEICHEN = 'ACDEFGHJKMNPQRTUVWXY34679';
const CODE_LAENGE = 8;
const DOMAIN = 'zahlenwerk.local';

const cors = {
  'Access-Control-Allow-Origin': '*',
  // apikey und x-client-info schickt der Browser mit. Fehlen sie hier,
  // lehnt er die Vorabanfrage ab und meldet nur "Failed to fetch".
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info, accept-profile, content-profile',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const antwort = (daten: unknown, status = 200) =>
  new Response(JSON.stringify(daten), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function neuerCode(): string {
  const zufall = new Uint32Array(CODE_LAENGE);
  crypto.getRandomValues(zufall);
  return [...zufall].map((z) => ZEICHEN[z % ZEICHEN.length]).join('');
}

async function behandle(anfrage: Request): Promise<Response> {
  if (anfrage.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (!SERVICE_KEY) {
    return antwort({
      fehler: 'Der Funktion steht kein geheimer Schlüssel zur Verfügung. '
            + 'Prüfe unter Edge Functions → Secrets, ob SUPABASE_SERVICE_ROLE_KEY '
            + 'oder SUPABASE_SECRET_KEYS gesetzt ist.',
    }, 500);
  }

  const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

  // --- Aufrufer prüfen: nur Lehrkräfte dürfen hier etwas tun ---
  const token = anfrage.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return antwort({ fehler: 'Nicht angemeldet.' }, 401);

  const { data: wer, error: werFehler } = await admin.auth.getUser(token);
  if (werFehler || !wer?.user) {
    return antwort({
      fehler: `Die Anmeldung konnte nicht geprüft werden: ${werFehler?.message ?? 'kein Nutzer zum Token'}`,
    }, 401);
  }

  const { data: profil, error: profilFehler } = await admin
    .schema('zahlenwerk').from('profil')
    .select('rolle, klasse').eq('id', wer.user.id).maybeSingle();

  // Hier trennen sich drei Fälle, die vorher alle gleich aussahen.
  if (profilFehler) {
    return antwort({
      fehler: `Das Profil ließ sich nicht lesen: ${profilFehler.message}`,
      hinweis: 'Deutet auf einen Schlüssel ohne volle Rechte oder ein nicht freigegebenes Schema hin.',
      schluesselQuelle: KANDIDATEN[0]?.quelle ?? 'unbekannt',
    }, 500);
  }

  if (!profil) {
    return antwort({
      fehler: 'Zu diesem Konto ist in zahlenwerk.profil kein Eintrag hinterlegt.',
      nutzer: wer.user.id,
      hinweis: 'Trage das Konto per SQL als Lehrkraft ein.',
    }, 403);
  }

  if (profil.rolle !== 'lehrer') {
    return antwort({
      fehler: `Dieser Zugang ist als "${profil.rolle}" eingetragen, nicht als Lehrkraft.`,
      nutzer: wer.user.id,
    }, 403);
  }

  let koerper: Record<string, unknown>;
  try {
    koerper = await anfrage.json();
  } catch {
    return antwort({ fehler: 'Keine gültigen Daten empfangen.' }, 400);
  }

  const aktion = String(koerper.aktion ?? 'anlegen');

  // ----------------------------------------------------------
  //  anlegen: Namensliste rein, Codes raus
  // ----------------------------------------------------------
  if (aktion === 'anlegen') {
    const klasse = String(koerper.klasse ?? '').trim();
    const namen = Array.isArray(koerper.namen) ? koerper.namen : [];

    if (!klasse) return antwort({ fehler: 'Es fehlt die Klasse.' }, 400);
    if (!namen.length) return antwort({ fehler: 'Es fehlen die Namen.' }, 400);
    if (namen.length > 40) return antwort({ fehler: 'Höchstens 40 auf einmal.' }, 400);

    const ergebnis: { name: string; code: string; fehler?: string }[] = [];

    for (const roh of namen) {
      const name = String(roh).trim();
      if (!name) continue;

      let angelegt = false;
      // Bei einer Code-Kollision bis zu dreimal neu würfeln.
      for (let versuch = 0; versuch < 3 && !angelegt; versuch++) {
        const code = neuerCode();
        const { data: konto, error } = await admin.auth.admin.createUser({
          email: `${code.toLowerCase()}@${DOMAIN}`,
          password: code,
          email_confirm: true,
        });

        if (error) continue;

        const { error: profilFehler } = await admin
          .schema('zahlenwerk').from('profil')
          .insert({ id: konto.user.id, code, klasse, rolle: 'schueler' });

        if (profilFehler) {
          await admin.auth.admin.deleteUser(konto.user.id);
          continue;
        }

        ergebnis.push({ name, code });
        angelegt = true;
      }

      if (!angelegt) ergebnis.push({ name, code: '', fehler: 'Konnte nicht angelegt werden.' });
    }

    return antwort({ klasse, schueler: ergebnis });
  }

  // ----------------------------------------------------------
  //  code_neu: neuer Code bei verlorenem Streifen,
  //            Lernstand und Sterne bleiben erhalten
  // ----------------------------------------------------------
  if (aktion === 'code_neu') {
    const id = String(koerper.id ?? '');
    if (!id) return antwort({ fehler: 'Es fehlt das Konto.' }, 400);

    const code = neuerCode();
    const { error } = await admin.auth.admin.updateUserById(id, {
      email: `${code.toLowerCase()}@${DOMAIN}`,
      password: code,
      email_confirm: true,
    });
    if (error) return antwort({ fehler: error.message }, 400);

    await admin.schema('zahlenwerk').from('profil').update({ code }).eq('id', id);
    return antwort({ id, code });
  }

  // ----------------------------------------------------------
  //  entfernen: Konto löschen, mitsamt allen Daten
  // ----------------------------------------------------------
  if (aktion === 'entfernen') {
    const id = String(koerper.id ?? '');
    if (!id) return antwort({ fehler: 'Es fehlt das Konto.' }, 400);

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return antwort({ fehler: error.message }, 400);
    return antwort({ id, entfernt: true });
  }

  return antwort({ fehler: `Unbekannte Aktion: ${aktion}` }, 400);
}

Deno.serve(behandle);
