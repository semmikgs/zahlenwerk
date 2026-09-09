import { CONFIG, imUebungsmodus } from './config.js';

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

let sitzung = jsonLies('sitzung', null);

const kopf = (mitToken = true) => {
  const h = { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' };
  if (mitToken && sitzung?.token) h.Authorization = `Bearer ${sitzung.token}`;
  return h;
};

const rest = async (pfad, optionen = {}) => {
  const antwort = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${pfad}`, {
    ...optionen,
    headers: { ...kopf(), ...(optionen.headers || {}) },
  });
  if (!antwort.ok) throw new Error(`${antwort.status}: ${await antwort.text()}`);
  const text = await antwort.text();
  return text ? JSON.parse(text) : null;
};

export const DB = {
  uebungsmodus: imUebungsmodus(),

  nutzer() { return sitzung; },

  async anmelden(kuerzel, passwort) {
    const kuerzelKlein = kuerzel.trim().toLowerCase();

    if (this.uebungsmodus) {
      if (passwort.length < 3) throw new Error('Passwort zu kurz.');
      sitzung = { id: `demo-${kuerzelKlein}`, kuerzel: kuerzelKlein, klasse: 'Übungsmodus', rolle: 'schueler', token: null };
      jsonSchreib('sitzung', sitzung);
      return sitzung;
    }

    const antwort = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: kopf(false),
      body: JSON.stringify({ email: `${kuerzelKlein}@${CONFIG.loginDomain}`, password: passwort }),
    });
    if (!antwort.ok) throw new Error('Kürzel oder Passwort stimmt nicht.');
    const daten = await antwort.json();

    sitzung = { id: daten.user.id, kuerzel: kuerzelKlein, token: daten.access_token, klasse: '', rolle: 'schueler' };
    const profile = await rest(`profil?id=eq.${daten.user.id}&select=kuerzel,klasse,rolle`);
    if (profile?.[0]) Object.assign(sitzung, profile[0]);
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
    if (this.uebungsmodus) {
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
    if (this.uebungsmodus) return jsonLies(`versuche:${sitzung.id}`, []).slice(-grenze);
    return await rest(`versuch?nutzer=eq.${sitzung.id}&select=vorlage,kapitel,tags,richtig,fehler,erstellt&order=erstellt.desc&limit=${grenze}`) || [];
  },

  /* ---------------- Lernstand (Wiederholungsplan) ---------------- */

  async lernstandLaden() {
    if (!sitzung) return {};
    if (this.uebungsmodus) return jsonLies(`lernstand:${sitzung.id}`, {});
    const zeilen = await rest(`lernstand?nutzer=eq.${sitzung.id}&select=vorlage,kapitel,box,faellig`) || [];
    return Object.fromEntries(zeilen.map((z) => [z.vorlage, z]));
  },

  async lernstandSpeichern(eintraege) {
    if (!sitzung || !eintraege.length) return;
    if (this.uebungsmodus) {
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

  /* ---------------- Streak und Punkte ---------------- */

  async zielLaden() {
    if (!sitzung) return { streak: 0, xp: 0, letzter_tag: null };
    if (this.uebungsmodus) return jsonLies(`ziel:${sitzung.id}`, { streak: 0, xp: 0, letzter_tag: null });
    const z = await rest(`tagesziel?nutzer=eq.${sitzung.id}&select=streak,xp,letzter_tag`);
    return z?.[0] || { streak: 0, xp: 0, letzter_tag: null };
  },

  async zielSpeichern(ziel) {
    if (!sitzung) return;
    if (this.uebungsmodus) { jsonSchreib(`ziel:${sitzung.id}`, ziel); return; }
    await rest('tagesziel', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ ...ziel, nutzer: sitzung.id }]),
    });
  },

  /* ---------------- Lehreransicht ---------------- */

  async klasseLaden(klasse) {
    const profile = await rest(`profil?klasse=eq.${encodeURIComponent(klasse)}&rolle=eq.schueler&select=id,kuerzel,klasse&order=kuerzel`) || [];
    const versuche = await rest(`versuch?select=nutzer,kapitel,vorlage,tags,richtig,fehler,erstellt&order=erstellt.desc&limit=8000`) || [];
    const erlaubt = new Set(profile.map((p) => p.id));
    return { profile, versuche: versuche.filter((v) => erlaubt.has(v.nutzer)) };
  },

  async klassenListe() {
    const zeilen = await rest('profil?rolle=eq.schueler&select=klasse') || [];
    return [...new Set(zeilen.map((z) => z.klasse))].sort();
  },
};
