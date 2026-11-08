import { DB, kalenderwoche } from './db.js?v=8';
import { ladeKapitelliste, ladeKapitel, auswertungNachTag, haeufigsteFehler } from './engine.js?v=8';

const $ = (id) => document.getElementById(id);
const zeige = (name) =>
  document.querySelectorAll('.ansicht').forEach((a) => a.classList.toggle('sichtbar', a.id === `ansicht-${name}`));

const gross = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const prozent = (x) => `${Math.round(x * 100)} %`;
/* Quotenstufe: unter 55 % schwach, ab 80 % stark, dazwischen mittel.
   Wenig Daten gelten als mittel, damit drei Zufallstreffer kein Urteil ergeben. */
const quotenstufe = (quote, anzahl) => {
  if (anzahl < 3) return 'mittel';
  if (quote >= 0.8) return 'stark';
  if (quote >= 0.55) return 'mittel';
  return 'schwach';
};

const balken = (quote, anzahl) => {
  const s = quotenstufe(quote, anzahl);
  return `<span class="messbalken ${s}"><i style="width:${Math.round(quote * 100)}%"></i></span>`;
};

const zeit = (ms) => {
  if (!ms) return '–';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

const datum = (wert) => (wert ? new Date(wert).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '–');

const heuteStr = () => new Date().toISOString().slice(0, 10);
const vorTagen = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/* ---------------- Zustand ---------------- */

const zustand = {
  tagNamen: {},
  fehlerNamen: {},
  kapitelTitel: {},
  kapitelListe: [],
  klasse: '',
  daten: null,
  offenerSchueler: null,
  letzteCodes: [],
};

/* ---------------- Start ---------------- */

(async () => {
  try {
    const eintraege = await ladeKapitelliste();
    zustand.kapitelListe = await Promise.all(eintraege.map(ladeKapitel));
    for (const k of zustand.kapitelListe) {
      Object.assign(zustand.tagNamen, k.tagNamen || {});
      Object.assign(zustand.fehlerNamen, k.fehlerNamen || {});
      zustand.kapitelTitel[k.id] = k.titel;
    }
  } catch (fehler) {
    console.warn('Kapitel nicht ladbar:', fehler);
  }

  if (DB.uebungsmodus) {
    $('login-hinweis').textContent =
      'Es sind noch keine Supabase-Zugangsdaten hinterlegt. Trage sie in js/config.js ein, '
      + 'dann funktioniert der Lehrerbereich.';
  }

  if (DB.nutzer()?.rolle === 'lehrer') starten();
  else zeige('login');
})();

$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = e.target.querySelector('button');
  knopf.disabled = true;
  $('login-fehler').hidden = true;
  try {
    await DB.alsLehrkraft($('in-email').value, $('in-passwort').value);
    $('in-passwort').value = '';
    await starten();
  } catch (fehler) {
    $('login-fehler').textContent = fehler.message;
    $('login-fehler').hidden = false;
  } finally {
    knopf.disabled = false;
  }
});

$('knopf-abmelden').addEventListener('click', () => { DB.abmelden(); zeige('login'); });
$('knopf-neu').addEventListener('click', () => laden(zustand.klasse));
$('klasse-wahl').addEventListener('change', (e) => laden(e.target.value));

async function starten() {
  zeige('arbeit');
  const { jahr, kw } = kalenderwoche();
  $('wa-jahr').value = jahr;
  $('wa-kw').value = kw;
  schrittFeldDazu(); schrittFeldDazu();

  const klassen = await DB.klassenListe();
  $('klasse-wahl').innerHTML = klassen.length
    ? klassen.map((k) => `<option>${k}</option>`).join('')
    : '<option value="">Noch keine Klasse</option>';

  await kapitelpflegeZeichnen();
  if (klassen.length) await laden(klassen[0]);
  else blattWechseln('zugaenge');
}

/* ---------------- Reiter ---------------- */

function blattWechseln(name) {
  document.querySelectorAll('.blatt').forEach((b) => { b.hidden = b.id !== `blatt-${name}`; });
  document.querySelectorAll('#reiter button').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.blatt === name));
  });
}
$('reiter').addEventListener('click', (e) => {
  const knopf = e.target.closest('button[data-blatt]');
  if (knopf) blattWechseln(knopf.dataset.blatt);
});

/* ---------------- Daten laden ---------------- */

async function laden(klasse) {
  if (!klasse) return;
  zustand.klasse = klasse;
  $('in-klasse').value = klasse;
  if (!$('wa-klasse').value.trim()) $('wa-klasse').value = klasse;
  zustand.daten = await DB.klasseLaden(klasse);
  ueberblickZeichnen();
  schuelerZeichnen();
  await wochenaufgabenZeichnen();
}

/* ---------------- Überblick ---------------- */

function ueberblickZeichnen() {
  const { profile, versuche, lektionen, sterne } = zustand.daten;

  const richtig = versuche.filter((v) => v.richtig).length;
  const quote = versuche.length ? richtig / versuche.length : 0;
  const zeitGesamt = versuche.reduce((s, v) => s + (v.dauer_ms || 0), 0);
  const heute = new Set(versuche.filter((v) => v.erstellt?.slice(0, 10) === heuteStr()).map((v) => v.nutzer));
  const woche7 = new Set(versuche.filter((v) => v.erstellt?.slice(0, 10) >= vorTagen(7)).map((v) => v.nutzer));
  const sterneWoche = sterne.filter((s) => s.tag >= vorTagen(7)).length;

  $('kennzahlen').innerHTML = [
    [profile.length, 'Zugänge'],
    [heute.size, 'heute aktiv'],
    [`${woche7.size} von ${profile.length}`, 'in sieben Tagen aktiv'],
    [versuche.length ? prozent(quote) : '–', 'richtig insgesamt'],
    [zeit(zeitGesamt), 'Übungszeit gesamt'],
    [sterneWoche, 'Sterne diese Woche'],
  ].map(([wert, text]) => `<div class="kennzahl"><strong>${wert}</strong><span>${text}</span></div>`).join('');

  // Knackpunkte
  const fehler = haeufigsteFehler(versuche, zustand.fehlerNamen).slice(0, 5);
  $('klassenfehler').innerHTML = fehler.length
    ? fehler.map((f) => `<div class="knackpunkt"><p>${gross(f.name)}</p>
        <small>${f.anzahl}&nbsp;mal in dieser Klasse</small></div>`).join('')
    : '<p class="leer">Noch keine Daten.</p>';

  // Teilkompetenzen
  const tags = auswertungNachTag(versuche, zustand.tagNamen);
  $('tabelle-tags').innerHTML = tags.length
    ? tags.map((t) => `<tr>
        <td>${t.name}</td>
        <td class="rechts">${t.versuche}</td>
        <td class="rechts">${t.richtig}</td>
        <td>${balken(t.quote, t.versuche)} <small>${prozent(t.quote)}</small></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="leer">Noch keine Daten.</td></tr>';

  // Kapitel
  const proKapitel = new Map();
  for (const v of versuche) {
    if (!proKapitel.has(v.kapitel)) proKapitel.set(v.kapitel, { n: 0, r: 0, ms: 0 });
    const e = proKapitel.get(v.kapitel);
    e.n++; if (v.richtig) e.r++; e.ms += v.dauer_ms || 0;
  }
  const kapitelZeilen = [...proKapitel.entries()]
    .map(([id, e]) => ({ id, ...e, quote: e.r / e.n }))
    .sort((a, b) => a.quote - b.quote);

  $('tabelle-kapitel').innerHTML = kapitelZeilen.length
    ? kapitelZeilen.map((k) => `<tr>
        <td>${zustand.kapitelTitel[k.id] || k.id}</td>
        <td class="rechts">${k.n}</td>
        <td class="rechts">${zeit(Math.round(k.ms / k.n))}</td>
        <td>${balken(k.quote, k.n)} <small>${prozent(k.quote)}</small></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="leer">Noch keine Daten.</td></tr>';

  // Verlauf der letzten 14 Tage
  const tage = [];
  for (let i = 0; i < 14; i++) {
    const tag = vorTagen(i);
    const amTag = versuche.filter((v) => v.erstellt?.slice(0, 10) === tag);
    tage.push({
      tag,
      aktive: new Set(amTag.map((v) => v.nutzer)).size,
      aufgaben: amTag.length,
      sterne: sterne.filter((s) => s.tag === tag).length,
    });
  }
  const sichtbar = tage.filter((t) => t.aufgaben || t.sterne);
  $('tabelle-tage').innerHTML = sichtbar.length
    ? sichtbar.map((t) => `<tr>
        <td>${new Date(t.tag).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
        <td class="rechts">${t.aktive}</td>
        <td class="rechts">${t.aufgaben}</td>
        <td class="rechts">${t.sterne}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="leer">In den letzten vierzehn Tagen wurde nicht geübt.</td></tr>';
}

/* ---------------- Schülerliste ---------------- */

function schuelerBilanz(id) {
  const { versuche, sterne } = zustand.daten;
  const eigene = versuche.filter((v) => v.nutzer === id);
  const richtig = eigene.filter((v) => v.richtig).length;
  const ms = eigene.reduce((s, v) => s + (v.dauer_ms || 0), 0);
  const tags = auswertungNachTag(eigene, zustand.tagNamen).filter((t) => t.versuche >= 3);
  return {
    versuche: eigene,
    anzahl: eigene.length,
    richtig,
    quote: eigene.length ? richtig / eigene.length : 0,
    schnitt: eigene.length ? Math.round(ms / eigene.length) : 0,
    gesamtzeit: ms,
    sterne: sterne.filter((s) => s.nutzer === id).length,
    zuletzt: eigene[0]?.erstellt || null,
    schwach: tags[0] || null,
    stark: tags[tags.length - 1] || null,
  };
}

function schuelerZeichnen() {
  const { profile } = zustand.daten;
  $('tabelle-schueler').innerHTML = profile.length
    ? profile.map((p) => {
        const b = schuelerBilanz(p.id);
        const klasseQ = b.anzahl ? `q-${quotenstufe(b.quote, b.anzahl)}` : '';
        return `<tr class="klickbar" data-id="${p.id}">
          <td class="code">${p.code || '–'}</td>
          <td>${p.spitzname || '<span style="color:var(--grau)">–</span>'}${p.spitzname_gesperrt ? ' 🔒' : ''}</td>
          <td class="rechts">${b.anzahl}</td>
          <td>${b.anzahl ? `${balken(b.quote, b.anzahl)} <small class="quote ${klasseQ}">${prozent(b.quote)}</small>` : '–'}</td>
          <td class="rechts">${zeit(b.schnitt)}</td>
          <td class="rechts">${b.sterne}</td>
          <td class="rechts">${datum(b.zuletzt)}</td>
          <td>${b.schwach ? b.schwach.name : '–'}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="8" class="leer">Für diese Klasse gibt es noch keine Zugänge.</td></tr>';
}

$('tabelle-schueler').addEventListener('click', (e) => {
  const zeile = e.target.closest('tr[data-id]');
  if (zeile) detailOeffnen(zeile.dataset.id);
});

/* ---------------- Schülerdetail ---------------- */

function detailOeffnen(id) {
  const profil = zustand.daten.profile.find((p) => p.id === id);
  if (!profil) return;
  zustand.offenerSchueler = profil;

  const b = schuelerBilanz(id);
  $('detail-name').textContent = profil.spitzname || 'Ohne Spitznamen';
  $('detail-code').textContent = profil.code || '';
  $('detail-meldung').hidden = true;

  $('detail-kennzahlen').innerHTML = [
    [b.anzahl, 'Aufgaben'],
    [b.anzahl ? prozent(b.quote) : '–', 'richtig'],
    [zeit(b.gesamtzeit), 'Übungszeit'],
    [b.sterne, 'Sterne'],
  ].map(([w, t]) => `<div class="kennzahl"><strong>${w}</strong><span>${t}</span></div>`).join('');

  const tags = auswertungNachTag(b.versuche, zustand.tagNamen);
  $('detail-tags').innerHTML = tags.length
    ? tags.map((t) => `<tr>
        <td>${t.name}</td>
        <td class="rechts" style="width:70px">${t.richtig}/${t.versuche}</td>
        <td style="width:140px">${balken(t.quote, t.versuche)}</td>
      </tr>`).join('')
    : '<tr><td class="leer">Noch nicht geübt.</td></tr>';

  const fehler = haeufigsteFehler(b.versuche, zustand.fehlerNamen).slice(0, 4);
  $('detail-fehler').innerHTML = fehler.length
    ? fehler.map((f) => `<div class="knackpunkt"><p>${gross(f.name)}</p>
        <small>${f.anzahl}&nbsp;mal</small></div>`).join('')
    : '<p class="leer">Keine auffälligen Muster.</p>';

  $('dialog-schueler').showModal();
}

$('knopf-detail-zu').addEventListener('click', () => $('dialog-schueler').close());

const detailMeldung = (text, gut = true) => {
  const feld = $('detail-meldung');
  feld.textContent = text;
  feld.className = gut ? 'erfolg' : 'fehler';
  feld.hidden = false;
};

$('knopf-spitzname').addEventListener('click', async () => {
  const p = zustand.offenerSchueler;
  if (!p) return;
  try {
    await DB.spitznameSperren(p.id, false, null);
    p.spitzname = null; p.spitzname_gesperrt = false;
    detailMeldung('Spitzname zurückgesetzt. Der Schüler darf sich neu benennen.');
    schuelerZeichnen();
  } catch (fehler) { detailMeldung(fehler.message, false); }
});

$('knopf-code-neu').addEventListener('click', async () => {
  const p = zustand.offenerSchueler;
  if (!p) return;
  if (!confirm('Neuen Code vergeben? Der alte Streifen funktioniert dann nicht mehr. Lernstand und Sterne bleiben erhalten.')) return;
  try {
    const { code } = await DB.codeErneuern(p.id);
    p.code = code;
    detailMeldung(`Neuer Code: ${code} – notier ihn dir jetzt.`);
    $('detail-code').textContent = code;
    schuelerZeichnen();
  } catch (fehler) { detailMeldung(fehler.message, false); }
});

$('knopf-entfernen').addEventListener('click', async () => {
  const p = zustand.offenerSchueler;
  if (!p) return;
  if (!confirm(`Zugang ${p.code} endgültig löschen? Alle Ergebnisse dieses Schülers verschwinden mit.`)) return;
  try {
    await DB.schuelerEntfernen(p.id);
    $('dialog-schueler').close();
    await laden(zustand.klasse);
  } catch (fehler) { detailMeldung(fehler.message, false); }
});

/* ---------------- Zugänge anlegen ---------------- */

function namenLesen(text) {
  return text
    .split(/[\n,;\t]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

$('knopf-anlegen').addEventListener('click', async () => {
  const namen = namenLesen($('in-namen').value);
  const klasse = $('in-klasse').value.trim();
  const fehlerFeld = $('zugang-fehler');
  fehlerFeld.hidden = true;

  if (!klasse) { fehlerFeld.textContent = 'Es fehlt die Klasse.'; fehlerFeld.hidden = false; return; }
  if (!namen.length) { fehlerFeld.textContent = 'Es fehlen die Namen.'; fehlerFeld.hidden = false; return; }
  if (!confirm(`${namen.length} Zugänge für die Klasse ${klasse} anlegen?`)) return;

  const knopf = $('knopf-anlegen');
  knopf.disabled = true;
  $('zugang-stand').textContent = 'Konten werden angelegt …';

  try {
    const antwort = await DB.schuelerAnlegen(klasse, namen);
    zustand.letzteCodes = antwort.schueler;
    streifenZeichnen(klasse, antwort.schueler);
    $('zugang-stand').textContent = `${antwort.schueler.filter((s) => s.code).length} Zugänge angelegt.`;
    $('in-namen').value = '';

    const klassen = await DB.klassenListe();
    $('klasse-wahl').innerHTML = klassen.map((k) => `<option${k === klasse ? ' selected' : ''}>${k}</option>`).join('');
    await laden(klasse);
  } catch (fehler) {
    fehlerFeld.textContent = fehler.message;
    fehlerFeld.hidden = false;
    $('zugang-stand').textContent = '';
  } finally {
    knopf.disabled = false;
  }
});

const KURS_ADRESSE = location.href.replace(/lehrer\.html.*$/, '');

function streifenZeichnen(klasse, schueler) {
  $('codeliste').hidden = false;
  $('codeliste-titel').textContent = `Zahlenwerk – Zugangscodes ${klasse}`;
  $('streifen').innerHTML = schueler.map((s) => `
    <div>
      <b>${s.name}</b>
      ${s.code
        ? `<span class="zugang">${s.code}</span>
           <small>${KURS_ADRESSE.replace(/^https?:\/\//, '')}</small>`
        : `<span style="color:var(--rot)">${s.fehler || 'Fehlgeschlagen'}</span>`}
    </div>`).join('');
  $('codeliste').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('knopf-drucken').addEventListener('click', () => window.print());

$('knopf-kopieren').addEventListener('click', async () => {
  const text = zustand.letzteCodes.map((s) => `${s.name}\t${s.code}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    $('zugang-stand').textContent = 'Liste kopiert.';
  } catch {
    $('zugang-stand').textContent = 'Kopieren hat der Browser abgelehnt – bitte drucken.';
  }
});

/* ---------------- Wochenaufgabe ---------------- */

function schrittFeldDazu(frage = '', loesung = '') {
  const reihe = document.createElement('div');
  reihe.className = 'schritt';
  reihe.innerHTML = `
    <input type="text" class="wa-frage" placeholder="Frage dieses Schritts" value="${frage.replace(/"/g, '&quot;')}">
    <input type="text" class="wa-loesung" placeholder="Ergebnis" value="${loesung.replace(/"/g, '&quot;')}">
    <button class="knopf knopf-warn knopf-klein" type="button" title="Schritt entfernen">✕</button>`;
  reihe.querySelector('button').addEventListener('click', () => reihe.remove());
  $('wa-schritte').appendChild(reihe);
}

$('knopf-schritt-dazu').addEventListener('click', () => schrittFeldDazu());

$('knopf-wa-speichern').addEventListener('click', async () => {
  const meldung = $('wa-meldung');
  const schritte = [...document.querySelectorAll('#wa-schritte .schritt')]
    .map((r) => ({
      frage: r.querySelector('.wa-frage').value.trim(),
      loesung: r.querySelector('.wa-loesung').value.trim(),
    }))
    .filter((s) => s.frage && s.loesung);

  const aufgabe = {
    klasse: ($('wa-klasse').value || zustand.klasse).trim(),
    jahr: Number($('wa-jahr').value),
    kw: Number($('wa-kw').value),
    titel: $('wa-titel').value.trim(),
    text: $('wa-text').value.trim(),
    schritte,
    aktiv: true,
  };

  if (!aufgabe.klasse || !aufgabe.titel || !aufgabe.text || !schritte.length) {
    meldung.textContent = 'Es fehlen Klasse, Titel, Text oder mindestens ein vollständiger Schritt.';
    meldung.className = 'fehler'; meldung.hidden = false;
    return;
  }

  try {
    await DB.wochenaufgabeSpeichern(aufgabe);
    meldung.textContent = `Gespeichert: KW ${aufgabe.kw}/${aufgabe.jahr}, Klasse ${aufgabe.klasse}, ${schritte.length} Schritte.`;
    meldung.className = 'erfolg'; meldung.hidden = false;
    await wochenaufgabenZeichnen();
  } catch (fehler) {
    meldung.textContent = fehler.message;
    meldung.className = 'fehler'; meldung.hidden = false;
  }
});

async function wochenaufgabenZeichnen() {
  if (!zustand.klasse) return;
  let liste = [];
  try { liste = await DB.wochenaufgabenListe(zustand.klasse); } catch {}

  const { jahr, kw } = kalenderwoche();
  const jetzige = liste.find((w) => w.jahr === jahr && w.kw === kw && w.aktiv);

  // Ohne diesen Hinweis bleibt unklar, warum die Schüler nichts sehen.
  $('wa-stand').innerHTML = jetzige
    ? `<p>Diese Woche läuft <strong>${gross(jetzige.titel)}</strong> für Klasse ${jetzige.klasse}.</p>
       <small>KW ${kw}/${jahr} · ${(jetzige.schritte || []).length} Schritte</small>`
    : `<p>Für KW ${kw}/${jahr} ist in Klasse ${zustand.klasse} <strong>keine Wochenaufgabe aktiv</strong>.</p>
       <small>Die Schüler sehen deshalb keine. Klasse und Kalenderwoche unten müssen genau passen.</small>`;

  // Wie viele haben sie vollständig gelöst?
  let geloest = {};
  try { geloest = await DB.wochenaufgabeBilanz(liste.map((w) => w.id)); } catch {}

  $('tabelle-wa').innerHTML = liste.length
    ? liste.map((w) => {
        const istJetzt = w.jahr === jahr && w.kw === kw;
        return `<tr${istJetzt ? ' style="background:#F2F6FD"' : ''}>
          <td>${w.kw}/${w.jahr}${istJetzt ? ' <strong>· jetzt</strong>' : ''}</td>
          <td>${w.titel}<br><small style="color:var(--grau)">Klasse ${w.klasse}</small></td>
          <td class="rechts">${(w.schritte || []).length}</td>
          <td class="rechts">${geloest[w.id] ?? 0}</td>
          <td><button class="knopf knopf-rand knopf-klein" data-wa="${w.id}">Bearbeiten</button></td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="leer">Noch keine Wochenaufgabe angelegt.</td></tr>';

  $('tabelle-wa').querySelectorAll('button[data-wa]').forEach((b) => {
    b.addEventListener('click', () => {
      const w = liste.find((x) => String(x.id) === b.dataset.wa);
      if (!w) return;
      $('wa-titel').value = w.titel;
      $('wa-text').value = w.text;
      $('wa-klasse').value = w.klasse;
      $('wa-jahr').value = w.jahr;
      $('wa-kw').value = w.kw;
      $('wa-schritte').innerHTML = '';
      for (const s of w.schritte || []) schrittFeldDazu(s.frage, s.loesung);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ---------------- Kapitelpflege ---------------- */

async function kapitelpflegeZeichnen() {
  let stand = {};
  try { stand = await DB.kapitelstatusLaden(); } catch {}

  $('tabelle-kapitelpflege').innerHTML = zustand.kapitelListe.map((k, i) => {
    const e = stand[k.id] || {};
    return `<tr data-kapitel="${k.id}">
      <td><strong>${k.titel}</strong><br><small style="color:var(--grau)">${k.id}</small></td>
      <td><input type="text" class="kp-name" value="${(e.anzeigename || k.titel).replace(/"/g, '&quot;')}"></td>
      <td class="rechts"><input type="number" class="kp-reihe" style="width:80px" value="${e.reihenfolge ?? (i + 1) * 10}"></td>
      <td><select class="kp-status">
        <option value="aktiv"${e.status !== 'archiv' ? ' selected' : ''}>aktiv</option>
        <option value="archiv"${e.status === 'archiv' ? ' selected' : ''}>Archiv</option>
      </select></td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" class="leer">Keine Kapitel gefunden.</td></tr>';
}

$('knopf-kapitel-speichern').addEventListener('click', async () => {
  const meldung = $('kapitel-meldung');
  const eintraege = [...document.querySelectorAll('#tabelle-kapitelpflege tr[data-kapitel]')].map((r) => ({
    id: r.dataset.kapitel,
    anzeigename: r.querySelector('.kp-name').value.trim(),
    reihenfolge: Number(r.querySelector('.kp-reihe').value) || 100,
    status: r.querySelector('.kp-status').value,
  }));

  try {
    await DB.kapitelSpeichern(eintraege);
    meldung.textContent = 'Gespeichert. Die Schüler sehen die Änderung beim nächsten Laden.';
    meldung.className = 'erfolg'; meldung.hidden = false;
  } catch (fehler) {
    meldung.textContent = fehler.message;
    meldung.className = 'fehler'; meldung.hidden = false;
  }
});

/* ---------------- Tabelle sichern ---------------- */

$('knopf-csv').addEventListener('click', () => {
  if (!zustand.daten) return;
  const zeilen = [['Code', 'Spitzname', 'Aufgaben', 'Richtig', 'Quote', 'UebungszeitMin', 'Sterne', 'Zuletzt', 'SchwaechsterBereich', 'StaerksterBereich']];
  for (const p of zustand.daten.profile) {
    const b = schuelerBilanz(p.id);
    zeilen.push([
      p.code || '', p.spitzname || '', b.anzahl, b.richtig,
      b.anzahl ? Math.round(b.quote * 100) : '',
      Math.round(b.gesamtzeit / 60000), b.sterne,
      b.zuletzt ? b.zuletzt.slice(0, 10) : '',
      b.schwach?.name || '', b.stark?.name || '',
    ]);
  }
  const csv = '﻿' + zeilen.map((z) => z.join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `zahlenwerk-${zustand.klasse}-${heuteStr()}.csv`;
  a.click();
});
