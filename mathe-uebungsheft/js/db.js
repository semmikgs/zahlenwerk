import { CONFIG, imUebungsmodus } from './config.js?v=12';

/* Kleiner Speicher-Helfer: nutzt localStorage, wenn erlaubt, sonst den
   Arbeitsspeicher. So läuft die Seite auch in strengen Browsern. */
const notfall = new Map();
export const speicher = {
  lies(schluessel) {
    try { const w = localStorage.getItem(schluessel); if (w !== null) return w; } catch {}
    return notfall.has(schluessel) ? notfall.get(schluessel) : null;
  },
  schreib(schluessel, wert) {
    try { localStorage.setItem(schluessel, wert); } catch {}
    notfall.set(schluessel, wert);
  },
  loesche(schluessel) {
    try { localStorage.removeItem(schluessel); } catch {}
    notfall.delete(schluessel);
  },
};

const jsonLies = (k, standard) => {
  const w = speicher.lies(k);
  if (!w) return standard;
  try { return JSON.parse(w); } catch { return standard; }
};
const jsonSchreib = (k, w) => speicher.schreib(k, JSON.stringify(w));

/* ---------------- Sitzung ---------------- */

const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Eine gespeicherte Sitzung kann aus einer älteren Fassung stammen – etwa aus
   der Zeit, als noch kein Supabase hinterlegt war und die Kennung "demo-..."
   lautete. Gegen die Datenbank gehalten ergibt so eine Kennung nur Fehler.
   Deshalb wird beim Start geprüft, ob die Sitzung überhaupt brauchbar ist. */
function sitzungPruefen(gespeichert) {
  if (!gespeichert) return null;
  if (gespeichert.gast) return gespeichert;            // bleibt ohnehin lokal
  if (imUebungsmodus()) return gespeichert;            // keine Datenbank im Spiel
  const brauchbar = UUID_MUSTER.test(String(gespeichert.id || '')) && !!gespeichert.token;
  if (!brauchbar) {
    speicher.loesche('sitzung');
    return null;
  }
  return gespeichert;
}

let sitzung = sitzungPruefen(jsonLies('sitzung', null));

const heute = () => new Date().toISOString().slice(0, 10);

/* Kalenderwoche nach ISO 8601 – dieselbe Zählung wie in der Datenbank. */
export function kalenderwoche(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const jahresbeginn = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil(((d - jahresbeginn) / 86400000 + 1) / 7);
  return { jahr: d.getUTCFullYear(), kw };
}

/* Alle Anfragen gehen in das eigene Schema, damit sich die Schultools
   in derselben Supabase-Instanz nicht ins Gehege kommen. */
const kopf = (schreibend = false, mitToken = true) => {
  const h = {
    apikey: CONFIG.supabaseKey,
    'Content-Type': 'application/json',
    'Accept-Profile': CONFIG.schema,
  };
  if (schreibend) h['Content-Profile'] = CONFIG.schema;
  if (mitToken && sitzung?.token) h.Authorization = `Bearer ${sitzung.token}`;
  return h;
};

/* Zugangstoken laufen nach einer Stunde ab. Dann einmal still erneuern,
   damit niemand mitten in einer Lektion herausfliegt. */
async function tokenErneuern() {
  if (!sitzung?.refresh) return false;
  const antwort = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sitzung.refresh }),
  });
  if (!antwort.ok) return false;
  const daten = await antwort.json();
  sitzung.token = daten.access_token;
  sitzung.refresh = daten.refresh_token;
  jsonSchreib('sitzung', sitzung);
  return true;
}

const rest = async (pfad, optionen = {}, zweiterVersuch = false) => {
  const schreibend = !!optionen.method && optionen.method !== 'GET';
  const antwort = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${pfad}`, {
    ...optionen,
    // Ohne das liefert der Browser nach einer Änderung gern den alten Stand
    // aus seinem Zwischenspeicher – und es sieht aus, als sei nichts passiert.
    cache: 'no-store',
    headers: { ...kopf(schreibend), ...(optionen.headers || {}) },
  });

  if (antwort.status === 401 && !zweiterVersuch && await tokenErneuern()) {
    return rest(pfad, optionen, true);
  }
  if (!antwort.ok) throw new Error(`${antwort.status}: ${await antwort.text()}`);

  const text = await antwort.text();
  return text ? JSON.parse(text) : null;
};

/* Aufruf der Edge Function, die Schülerkonten verwaltet. */
const funktion = async (name, koerper) => {
  const antwort = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: CONFIG.supabaseKey,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sitzung?.token || ''}`,
    },
    body: JSON.stringify(koerper),
  });
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) {
    const zusatz = daten.hinweis ? ` ${daten.hinweis}` : '';
    throw new Error((daten.fehler || `Fehler ${antwort.status}`) + zusatz);
  }
  return daten;
};

async function tokenHolen(email, passwort) {
  const antwort = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwort }),
  });
  if (!antwort.ok) return null;
  return await antwort.json();
}

export const DB = {
  uebungsmodus: imUebungsmodus(),

  nutzer() { return sitzung; },

  /* true, wenn nur auf diesem Gerät gespeichert wird: entweder weil noch keine
     Supabase-Zugangsdaten hinterlegt sind, oder weil ohne Anmeldung geübt wird. */
  nurLokal() { return this.uebungsmodus || sitzung?.gast === true; },

  /* Üben ohne Konto. Der Stand bleibt auf diesem Gerät und in diesem Browser. */
  alsGast() {
    sitzung = { id: 'gast', name: 'Gast', klasse: '', rolle: 'gast', token: null, gast: true };
    jsonSchreib('sitzung', sitzung);
    return sitzung;
  },

  /* --- Schüler: Anmeldung allein über den Zugangscode --- */
  async mitCode(eingabe) {
    const code = String(eingabe).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 6) throw new Error('Der Code ist zu kurz.');

    if (this.uebungsmodus) {
      sitzung = { id: `demo-${code}`, code, name: code, klasse: 'Übungsmodus', rolle: 'schueler', token: null };
      jsonSchreib('sitzung', sitzung);
      return sitzung;
    }

    const daten = await tokenHolen(`${code.toLowerCase()}@${CONFIG.loginDomain}`, code);
    if (!daten) throw new Error('Diesen Code kennt das Übungsheft nicht.');

    sitzung = {
      id: daten.user.id, code, token: daten.access_token,
      refresh: daten.refresh_token, klasse: '', rolle: 'schueler', spitzname: null,
    };
    const profil = await rest(`profil?id=eq.${daten.user.id}&select=code,klasse,rolle,spitzname,spitzname_gesperrt`);
    if (profil?.[0]) Object.assign(sitzung, profil[0]);
    sitzung.name = sitzung.spitzname || code;
    jsonSchreib('sitzung', sitzung);
    return sitzung;
  },

  /* --- Lehrkraft: Anmeldung mit E-Mail und Passwort --- */
  async alsLehrkraft(email, passwort) {
    const daten = await tokenHolen(email.trim().toLowerCase(), passwort);
    if (!daten) throw new Error('E-Mail oder Passwort stimmt nicht.');

    sitzung = {
      id: daten.user.id, name: email, token: daten.access_token,
      refresh: daten.refresh_token, rolle: 'schueler', klasse: '',
    };
    const profil = await rest(`profil?id=eq.${daten.user.id}&select=rolle,klasse`);
    if (profil?.[0]) Object.assign(sitzung, profil[0]);

    if (sitzung.rolle !== 'lehrer') {
      this.abmelden();
      throw new Error('Dieser Zugang hat keine Lehrerrechte.');
    }
    jsonSchreib('sitzung', sitzung);
    return sitzung;
  },

  abmelden() {
    sitzung = null;
    speicher.loesche('sitzung');
  },

  /* ---------------- Versuche ---------------- */

  async versucheSpeichern(zeilen) {
    if (!sitzung) return;
    if (this.nurLokal()) {
      const alle = jsonLies(`versuche:${sitzung.id}`, []);
      alle.push(...zeilen.map((z) => ({ ...z, erstellt: new Date().toISOString() })));
      jsonSchreib(`versuche:${sitzung.id}`, alle.slice(-2000));
      return;
    }
    await rest('versuch', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(zeilen.map((z) => ({ ...z, nutzer: sitzung.id }))),
    });
  },

  async versucheLaden(grenze = 600) {
    if (!sitzung) return [];
    if (this.nurLokal()) return jsonLies(`versuche:${sitzung.id}`, []).slice(-grenze);
    return await rest(`versuch?nutzer=eq.${sitzung.id}&select=vorlage,kapitel,tags,richtig,fehler,dauer_ms,erstellt&order=erstellt.desc&limit=${grenze}`) || [];
  },

  /* ---------------- Lektionen ---------------- */

  async lektionSpeichern(lektion) {
    if (!sitzung) return;
    if (this.nurLokal()) {
      const alle = jsonLies(`lektionen:${sitzung.id}`, []);
      alle.push(lektion);
      jsonSchreib(`lektionen:${sitzung.id}`, alle.slice(-400));
      return;
    }
    await rest('lektion', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ ...lektion, nutzer: sitzung.id }]),
    });
  },

  /* ---------------- Lernstand (Wiederholungsplan) ---------------- */

  async lernstandLaden() {
    if (!sitzung) return {};
    if (this.nurLokal()) return jsonLies(`lernstand:${sitzung.id}`, {});
    const zeilen = await rest(`lernstand?nutzer=eq.${sitzung.id}&select=vorlage,kapitel,box,faellig`) || [];
    return Object.fromEntries(zeilen.map((z) => [z.vorlage, z]));
  },

  async lernstandSpeichern(eintraege) {
    if (!sitzung || !eintraege.length) return;
    if (this.nurLokal()) {
      const stand = jsonLies(`lernstand:${sitzung.id}`, {});
      for (const e of eintraege) stand[e.vorlage] = e;
      jsonSchreib(`lernstand:${sitzung.id}`, stand);
      return;
    }
    await rest('lernstand', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(eintraege.map((e) => ({ ...e, nutzer: sitzung.id }))),
    });
  },

  /* ---------------- Sterne ---------------- */

  async sterneLaden(tage = 90) {
    if (!sitzung) return [];
    if (this.nurLokal()) return jsonLies(`sterne:${sitzung.id}`, []);
    const ab = new Date(Date.now() - tage * 864e5).toISOString().slice(0, 10);
    return await rest(`stern?nutzer=eq.${sitzung.id}&tag=gte.${ab}&select=tag,grund,quote,zeit_ms&order=tag.desc`) || [];
  },

  async sternSetzen(stern) {
    if (!sitzung) return;
    const zeile = { ...stern, tag: stern.tag || heute() };
    if (this.nurLokal()) {
      const alle = jsonLies(`sterne:${sitzung.id}`, []).filter((s) => s.tag !== zeile.tag);
      alle.unshift(zeile);
      jsonSchreib(`sterne:${sitzung.id}`, alle.slice(0, 400));
      return;
    }
    await rest('stern', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ ...zeile, nutzer: sitzung.id }]),
    });
  },

  /* ---------------- Lobby ---------------- */

  async lobbyLaden() {
    if (!sitzung || this.nurLokal()) return [];
    const klasse = sitzung.klasse ? `&klasse=eq.${encodeURIComponent(sitzung.klasse)}` : '';
    return await rest(`lobby?select=*${klasse}&order=sterne_woche.desc&limit=60`) || [];
  },

  async spitznameSetzen(name) {
    if (!sitzung) return;

    if (this.nurLokal()) {
      sitzung.spitzname = name;
      sitzung.name = name || sitzung.code;
      jsonSchreib('sitzung', sitzung);
      return;
    }

    // Mit "return=representation" kommt die geschriebene Zeile zurück. Bleibt
    // sie leer, hat eine Zugriffsregel den Schreibvorgang verworfen – ohne das
    // sähe ein gesperrter Name aus wie ein erfolgreiches Speichern.
    const zeilen = await rest(`profil?id=eq.${sitzung.id}&select=spitzname,spitzname_gesperrt`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ spitzname: name }),
    });

    if (!zeilen?.length) {
      throw new Error('Der Name wurde nicht gespeichert. Vermutlich hat deine Lehrkraft ihn gesperrt.');
    }

    sitzung.spitzname = zeilen[0].spitzname;
    sitzung.spitzname_gesperrt = zeilen[0].spitzname_gesperrt;
    sitzung.name = sitzung.spitzname || sitzung.code;
    jsonSchreib('sitzung', sitzung);
  },

  /* ---------------- Wochenaufgabe ---------------- */

  async wochenaufgabeLaden(klasse = sitzung?.klasse) {
    if (!sitzung || this.nurLokal()) return null;
    const { jahr, kw } = kalenderwoche();
    // Klassenvergleich ohne Rücksicht auf Groß- und Kleinschreibung: sonst
    // findet ein Schüler aus "9a" nichts, was die Lehrkraft für "9A" anlegte.
    const zeilen = await rest(
      `wochenaufgabe?klasse=ilike.${encodeURIComponent((klasse || '').trim())}`
      + `&jahr=eq.${jahr}&kw=eq.${kw}&aktiv=is.true&select=*`);
    return zeilen?.[0] || null;
  },

  /* Welche Schritte hat dieser Schüler schon richtig? */
  async wochenaufgabeStand(aufgabe) {
    if (!sitzung || this.nurLokal()) return [];
    return await rest(`wochenaufgabe_versuch?nutzer=eq.${sitzung.id}&aufgabe=eq.${aufgabe}&select=schritt,richtig&order=erstellt`) || [];
  },

  async wochenaufgabeSchritt(aufgabe, schritt, eingabe, richtig) {
    if (!sitzung || this.nurLokal()) return;
    await rest('wochenaufgabe_versuch', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ nutzer: sitzung.id, aufgabe, schritt, eingabe, richtig }]),
    });
  },

  async wochenaufgabeSpeichern(aufgabe) {
    return await rest('wochenaufgabe', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([aufgabe]),
    });
  },

  /* Wie viele Schüler haben eine Wochenaufgabe vollständig gelöst?
     Gezählt werden nur die, die jeden Schritt richtig hatten. */
  async wochenaufgabeBilanz(ids) {
    if (!ids?.length) return {};
    const zeilen = await rest(
      `wochenaufgabe_versuch?aufgabe=in.(${ids.join(',')})&richtig=is.true&select=aufgabe,nutzer,schritt`) || [];
    const aufgaben = await rest(
      `wochenaufgabe?id=in.(${ids.join(',')})&select=id,schritte`) || [];
    const noetig = Object.fromEntries(aufgaben.map((a) => [a.id, (a.schritte || []).length]));

    const proNutzer = new Map();
    for (const z of zeilen) {
      const schluessel = `${z.aufgabe}|${z.nutzer}`;
      if (!proNutzer.has(schluessel)) proNutzer.set(schluessel, new Set());
      proNutzer.get(schluessel).add(z.schritt);
    }

    const bilanz = {};
    for (const [schluessel, schritte] of proNutzer) {
      const aufgabe = Number(schluessel.split('|')[0]);
      if (noetig[aufgabe] && schritte.size >= noetig[aufgabe]) {
        bilanz[aufgabe] = (bilanz[aufgabe] || 0) + 1;
      }
    }
    return bilanz;
  },

  async wochenaufgabenListe(klasse) {
    return await rest(`wochenaufgabe?klasse=eq.${encodeURIComponent(klasse)}&select=*&order=jahr.desc,kw.desc&limit=40`) || [];
  },

  /* ---------------- Kapitelverwaltung ---------------- */

  async kapitelstatusLaden() {
    if (this.uebungsmodus) return {};
    try {
      const zeilen = await rest('kapitel?select=id,anzeigename,status,reihenfolge') || [];
      return Object.fromEntries(zeilen.map((z) => [z.id, z]));
    } catch {
      return {};
    }
  },

  async kapitelSpeichern(eintraege) {
    if (!eintraege.length) return;
    await rest('kapitel', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(eintraege),
    });
  },

  /* ---------------- Schülerverwaltung (nur Lehrkraft) ---------------- */

  async schuelerAnlegen(klasse, namen) {
    return await funktion('schueler', { aktion: 'anlegen', klasse, namen });
  },

  async codeErneuern(id) {
    return await funktion('schueler', { aktion: 'code_neu', id });
  },

  async schuelerEntfernen(id) {
    return await funktion('schueler', { aktion: 'entfernen', id });
  },

  async spitznameSperren(id, gesperrt, neuerName = null) {
    const feld = { spitzname_gesperrt: gesperrt };
    if (neuerName !== null) feld.spitzname = neuerName;
    await rest(`profil?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(feld),
    });
  },

  /* ---------------- Lehreransicht ---------------- */

  async klassenListe() {
    const zeilen = await rest('profil?rolle=eq.schueler&select=klasse') || [];
    return [...new Set(zeilen.map((z) => z.klasse).filter(Boolean))].sort();
  },

  async klasseLaden(klasse) {
    const profile = await rest(`profil?klasse=eq.${encodeURIComponent(klasse)}&rolle=eq.schueler&select=id,code,klasse,spitzname,spitzname_gesperrt,aktiv,erstellt&order=code`) || [];
    if (!profile.length) return { profile, versuche: [], lektionen: [], sterne: [] };

    const ids = profile.map((p) => p.id);
    const filter = `nutzer=in.(${ids.join(',')})`;

    const [versuche, lektionen, sterne] = await Promise.all([
      rest(`versuch?${filter}&select=nutzer,kapitel,vorlage,tags,richtig,fehler,dauer_ms,erstellt&order=erstellt.desc&limit=20000`),
      rest(`lektion?${filter}&select=nutzer,tag,art,kapitel,aufgaben,richtig,aktive_zeit_ms,beendet&order=tag.desc&limit=4000`),
      rest(`stern?${filter}&select=nutzer,tag,grund,quote,zeit_ms&order=tag.desc&limit=4000`),
    ]);

    return {
      profile,
      versuche: versuche || [],
      lektionen: lektionen || [],
      sterne: sterne || [],
    };
  },
};

export { heute };
