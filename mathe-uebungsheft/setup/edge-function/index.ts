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
   Namen bereit: klassisch als SUPABASE_SERVICE_ROLE_KEY, in neueren
   Projekten als Liste unter SUPABASE_SECRET_KEYS. Beide werden akzeptiert. */
function geheimerSchluessel(): string {
  const klassisch = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (klassisch) return klassisch;

  const liste = Deno.env.get('SUPABASE_SECRET_KEYS') ?? '';
  try {
    const gelesen = JSON.parse(liste);
    if (Array.isArray(gelesen) && gelesen.length) {
      const erster = gelesen[0];
      return typeof erster === 'string' ? erster : (erster.api_key ?? erster.key ?? '');
    }
  } catch {
    // Keine JSON-Liste, dann durch Komma getrennt.
  }
  return liste.split(',')[0].trim();
}

const SERVICE_KEY = geheimerSchluessel();

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
    return antwort({ fehler: 'Der geheime Schlüssel steht der Funktion nicht zur Verfügung.' }, 500);
  }

  const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

  // --- Aufrufer prüfen: nur Lehrkräfte dürfen hier etwas tun ---
  const token = anfrage.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return antwort({ fehler: 'Nicht angemeldet.' }, 401);

  const { data: wer } = await admin.auth.getUser(token);
  if (!wer?.user) return antwort({ fehler: 'Anmeldung abgelaufen.' }, 401);

  const { data: profil } = await admin
    .schema('zahlenwerk').from('profil')
    .select('rolle').eq('id', wer.user.id).maybeSingle();

  if (profil?.rolle !== 'lehrer') {
    return antwort({ fehler: 'Dieser Zugang hat keine Lehrerrechte.' }, 403);
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
