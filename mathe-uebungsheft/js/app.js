import { CONFIG } from './config.js?v=12';
import { DB, speicher, kalenderwoche } from './db.js?v=12';
import {
  ladeKapitelliste, ladeKapitel, baueAufgabe, waehleVorlagen,
  naechsteWiederholung, auswertungNachTag, wuerfel, startwert, heute,
} from './engine.js?v=12';
import { feiern, danebenRums, lobText, sternenregen, funken } from './effekte.js?v=12';

const $ = (id) => document.getElementById(id);

/* Anzeige in deutscher Schreibweise: echtes Minuszeichen, Komma statt Punkt. */
const anz = (wert) => String(wert).replace('-', '−').replace('.', ',');
const roh = (text) => text.replace(/[−–—]/g, '-').replace(',', '.').replace(/\s/g, '');

const zeige = (name) => {
  document.querySelectorAll('.ansicht').forEach((a) => a.classList.remove('sichtbar'));
  $(`ansicht-${name}`).classList.add('sichtbar');
  window.scrollTo(0, 0);
};

/* Aktive Übungszeit. Gezählt wird nur vom Erscheinen einer Aufgabe bis zur
   Antwort, je Aufgabe gedeckelt. Ein liegen gelassenes Handy sammelt damit
   keine Sterne, und wer kurz weggeschaut hat, verliert nicht alles. */
let aufgabeSeit = 0;
const uhrStarten = () => { aufgabeSeit = Date.now(); };
const uhrLesen = () => {
  if (!aufgabeSeit) return 0;
  const gemessen = Date.now() - aufgabeSeit;
  aufgabeSeit = 0;
  return Math.min(gemessen, CONFIG.maxDauerProAufgabeMs);
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) uhrLesen(); else uhrStarten();
});

const zustand = {
  kapitel: [],          // alle geladenen Kapitel
  aktiveKapitel: [],    // ohne die archivierten
  kapitelstatus: {},
  tagNamen: {},
  fehlerNamen: {},
  lernstand: {},
  versuche: [],
  sterne: [],
  lobby: [],
  wochenaufgabe: null,
  waStand: [],
  lektion: null,
  auswahl: null,
  sofortPruefen: speicher.lies('sofort') === 'ja',
};

/* ---------------- Start ---------------- */

async function los() {
  const eintraege = await ladeKapitelliste();
  zustand.kapitel = await Promise.all(eintraege.map(ladeKapitel));
  for (const k of zustand.kapitel) {
    Object.assign(zustand.tagNamen, k.tagNamen || {});
    Object.assign(zustand.fehlerNamen, k.fehlerNamen || {});
  }

  // Wer den QR-Code vom Streifen scannt, kommt mit seinem Code in der Adresse
  // an und soll nicht noch einmal tippen müssen.
  const ausAdresse = new URLSearchParams(location.search).get('code');
  if (ausAdresse) {
    // Code sofort aus der Adresszeile nehmen, damit er nicht im Verlauf
    // stehen bleibt oder beim Teilen des Links mitwandert.
    history.replaceState(null, '', location.pathname);
    try {
      await DB.mitCode(ausAdresse);
      await startseite();
      return;
    } catch (fehler) {
      zeige('login');
      $('in-code').value = ausAdresse.toUpperCase();
      $('login-fehler').textContent = fehler.message;
      $('login-fehler').hidden = false;
      return;
    }
  }

  if (!DB.nutzer()) { zeige('login'); return; }

  // Scheitert der Start trotz gültig aussehender Sitzung, ist sie verbraucht.
  // Dann nicht die Seite zerschießen, sondern sauber zur Anmeldung zurück.
  try {
    await startseite();
  } catch (fehler) {
    console.warn('Sitzung unbrauchbar:', fehler);
    DB.abmelden();
    zeige('login');
    $('login-fehler').textContent = 'Deine Anmeldung ist abgelaufen. Tipp deinen Code noch einmal ein.';
    $('login-fehler').hidden = false;
  }
}

$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = e.target.querySelector('button');
  knopf.disabled = true;
  $('login-fehler').hidden = true;
  try {
    await DB.mitCode($('in-code').value);
    await startseite();
  } catch (fehler) {
    $('login-fehler').textContent = fehler.message;
    $('login-fehler').hidden = false;
  } finally {
    knopf.disabled = false;
  }
});

$('knopf-gast').addEventListener('click', async () => {
  DB.alsGast();
  await startseite();
});

$('knopf-gast-anmelden').addEventListener('click', () => {
  DB.abmelden();
  $('in-code').value = '';
  $('login-fehler').hidden = true;
  zeige('login');
});

$('knopf-abmelden').addEventListener('click', () => {
  DB.abmelden();
  zeige('login');
});

$('schalter-sofort').checked = zustand.sofortPruefen;
$('schalter-sofort').addEventListener('change', (e) => {
  zustand.sofortPruefen = e.target.checked;
  speicher.schreib('sofort', e.target.checked ? 'ja' : 'nein');
});

/* ---------------- Startseite ---------------- */

async function startseite() {
  const nutzer = DB.nutzer();
  $('gruss').textContent = nutzer.gast ? 'Üben ohne Code' : `Hallo ${nutzer.name || nutzer.code}`;
  $('gastband').hidden = !nutzer.gast;
  $('datum').textContent = new Date().toLocaleDateString('de-DE',
    { weekday: 'long', day: 'numeric', month: 'long' });

  const [lernstand, versuche, sterne, status, lobby, wa] = await Promise.all([
    DB.lernstandLaden(),
    DB.versucheLaden(),
    DB.sterneLaden(),
    DB.kapitelstatusLaden().catch(() => ({})),
    DB.lobbyLaden().catch(() => []),
    DB.wochenaufgabeLaden().catch(() => null),
  ]);
  Object.assign(zustand, { lernstand, versuche, sterne, kapitelstatus: status, lobby, wochenaufgabe: wa });

  kapitelOrdnen();

  if (wa) {
    zustand.waStand = await DB.wochenaufgabeStand(wa.id).catch(() => []);
  }

  const richtig = versuche.filter((v) => v.richtig).length;
  const dieseWoche = sterneDieserWoche();

  $('stat-woche').textContent = `${dieseWoche}/${CONFIG.sterneProWoche}`;
  $('stat-gesamt').textContent = sterne.length;
  $('stat-quote').textContent = versuche.length
    ? `${Math.round((richtig / versuche.length) * 100)}%` : '–';

  zeichneKette(dieseWoche);
  zeichneTageskarte(dieseWoche);
  zeichneWochenaufgabe();
  zeichneRangliste($('rangliste'), 6);
  zeichneKapitel();
  zeichneDiagnose($('diagnose'), versuche, 4);

  $('version').textContent = 'Version 12' + (DB.nurLokal() ? ' · Stand nur auf diesem Gerät' : '');
  zeige('start');

  // Wer noch keinen Spitznamen hat, wird einmal gefragt – nicht aufdringlich,
  // sondern nachdem er die Rangliste gesehen hat.
  const n = DB.nutzer();
  if (!n.gast && !n.spitzname && !n.spitzname_gesperrt && !speicher.lies('namegefragt')) {
    speicher.schreib('namegefragt', 'ja');
    setTimeout(() => nameFragen(), 700);
  }
}

/* Archivierte Kapitel fliegen aus der Tagesaufgabe, bleiben aber zum
   Nachüben erreichbar. Anzeigename und Reihenfolge kommen aus der Datenbank. */
function kapitelOrdnen() {
  for (const k of zustand.kapitel) {
    const e = zustand.kapitelstatus[k.id];
    k.anzeige = e?.anzeigename || k.titel;
    k.archiviert = e?.status === 'archiv';
    k.reihenfolge = e?.reihenfolge ?? 100;
  }
  zustand.kapitel.sort((a, b) => a.reihenfolge - b.reihenfolge);
  zustand.aktiveKapitel = zustand.kapitel.filter((k) => !k.archiviert);
}

/* ---------------- Sternenkette ---------------- */

function sterneDieserWoche() {
  const { jahr, kw } = kalenderwoche();
  return zustand.sterne.filter((s) => {
    const d = kalenderwoche(new Date(s.tag));
    return d.jahr === jahr && d.kw === kw;
  }).length;
}

function tageDerWoche() {
  // Montag der laufenden Woche als Startpunkt.
  const jetzt = new Date();
  const versatz = (jetzt.getDay() + 6) % 7;
  const montag = new Date(jetzt);
  montag.setDate(jetzt.getDate() - versatz);
  return [...Array(7)].map((_, i) => {
    const d = new Date(montag);
    d.setDate(montag.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function zeichneKette(dieseWoche) {
  const tage = tageDerWoche();
  const geholt = new Set(zustand.sterne.map((s) => s.tag));
  const heuteStr = heute();

  $('kette-reihe').innerHTML = tage.map((tag) => {
    const voll = geholt.has(tag);
    const istHeute = tag === heuteStr;
    const kuerzel = new Date(tag).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2);
    return `<span class="kette-stern ${voll ? 'voll' : ''} ${istHeute ? 'heute' : ''}"
             title="${kuerzel}">${voll ? '★' : '☆'}</span>`;
  }).join('');

  const fehlt = CONFIG.sterneProWoche - dieseWoche;
  $('kette-text').innerHTML = dieseWoche >= CONFIG.sterneProWoche
    ? 'Wochenstern geschafft. <b>★</b>'
    : `<b>${dieseWoche}</b> von ${CONFIG.sterneProWoche} – noch ${fehlt} ${fehlt === 1 ? 'Stern' : 'Sterne'} bis zum Wochenstern.`;
}

function zeichneTageskarte(dieseWoche) {
  const sternHeute = zustand.sterne.some((s) => s.tag === heute());
  const tag = tagesbilanz();

  if (!zustand.aktiveKapitel.length) {
    $('tages-titel').textContent = 'Gerade nichts freigeschaltet';
    $('tages-info').textContent = 'Deine Lehrkraft hat alle Themen ins Archiv gelegt. Schau später noch einmal rein.';
    $('tages-balken').style.width = '0%';
    $('knopf-start').disabled = true;
    return;
  }
  $('knopf-start').disabled = false;

  $('tages-titel').textContent = sternHeute
    ? 'Stern für heute geholt'
    : 'Gemischt aus allen Kapiteln';

  if (sternHeute) {
    $('tages-info').textContent = dieseWoche >= CONFIG.sterneProWoche
      ? 'Der Wochenstern ist sicher. Weiterüben zählt trotzdem.'
      : `Noch ${CONFIG.sterneProWoche - dieseWoche} bis zum Wochenstern.`;
    $('tages-balken').style.width = '100%';
  } else if (tag.zeitMs > 0) {
    const fehlen = Math.max(0, CONFIG.sternZeitMs - tag.zeitMs);
    $('tages-info').textContent = fehlen < 90000
      ? `Fast – noch etwa ${Math.max(1, Math.ceil(fehlen / 60000))} Minute, dann ist der Stern deiner.`
      : 'Für den Stern: drei Viertel richtig oder fünf Minuten üben.';
    $('tages-balken').style.width =
      `${Math.min(100, Math.round((tag.zeitMs / CONFIG.sternZeitMs) * 100))}%`;
  } else {
    $('tages-info').textContent =
      `${CONFIG.aufgabenProLektion} Aufgaben, ungefähr fünf Minuten. Enthält alles, was zur Wiederholung ansteht.`;
    $('tages-balken').style.width = '0%';
  }
  $('knopf-start').textContent = sternHeute ? 'Noch eine Runde' : 'Loslegen';
}

function tagesbilanz() {
  const heuteStr = heute();
  const heutige = zustand.versuche.filter((v) => (v.erstellt || '').slice(0, 10) === heuteStr);
  return {
    anzahl: heutige.length,
    richtig: heutige.filter((v) => v.richtig).length,
    zeitMs: heutige.reduce((summe, v) => summe + (v.dauer_ms || 0), 0),
  };
}

/* ---------------- Rangliste ---------------- */

/* Der Stern erzählt die ganze Woche auf einen Blick:
   gefüllt  = Wochenstern geschafft
   Schweif  = Wochenaufgabe gelöst
   hohl mit Schweif = nur die Wochenaufgabe, keine fünf Tagessterne

   Selbst gezeichnet statt als Zeichen aus der Schriftart, weil Handys den
   Kometen sonst als buntes Emoji darstellen und die drei Zustände
   ohnehin nicht unterscheidbar wären. */
const STERN_PFAD = 'M24.0 2.8L26.29 8.84L32.75 9.16L27.71 13.21L29.41 19.44L24.0 15.9L18.59 19.44L20.29 13.21L15.25 9.16L21.71 8.84Z';

function sternZeichen({ wochenstern, wochenaufgabe_geloest: schweif, einladend }) {
  const farbe = wochenstern || schweif || einladend ? '#FFC247' : '#4C5894';
  const titel = wochenstern && schweif ? 'Wochenstern mit Sternschnuppe'
    : wochenstern ? 'Wochenstern'
    : schweif ? 'Wochenaufgabe gelöst'
    : 'Noch kein Wochenstern';

  return `<svg viewBox="0 0 36 24" width="24" height="16" role="img" aria-label="${titel}">
    <title>${titel}</title>
    ${schweif ? `<g stroke="${farbe}" stroke-linecap="round" fill="none">
        <path d="M14 8.5H3.5"   stroke-width="2.1" opacity=".85"/>
        <path d="M13.5 13H5.5"  stroke-width="1.7" opacity=".6"/>
        <path d="M15.5 17.5H9"  stroke-width="1.4" opacity=".38"/>
      </g>` : ''}
    <path d="${STERN_PFAD}" fill="${wochenstern ? farbe : 'none'}"
          stroke="${farbe}" stroke-width="1.8" stroke-linejoin="round"
          ${wochenstern ? '' : 'opacity=".9"'}/>
  </svg>`;
}

/* Derselbe Stern in groß, für den Abschlussbildschirm. */
function grosserStern(mitSchweif) {
  const pfad = 'M50.0 12.0L57.41 31.81L78.53 32.73L61.98 45.89L67.63 66.27L50.0 54.6L32.37 66.27L38.02 45.89L21.47 32.73L42.59 31.81Z';
  return `<svg viewBox="0 0 100 80" width="86" height="69" aria-hidden="true">
    ${mitSchweif ? `<g stroke="#FFC247" stroke-linecap="round" fill="none">
        <path d="M34 26H6"   stroke-width="5" opacity=".75"/>
        <path d="M30 41H12"  stroke-width="4" opacity=".5"/>
        <path d="M36 56H18"  stroke-width="3.2" opacity=".3"/>
      </g>` : ''}
    <path d="${pfad}" fill="#FFC247" stroke="#FFE7B0" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`;
}

function zeichneRangliste(ziel, anzahl) {
  const nutzer = DB.nutzer();
  const liste = zustand.lobby;

  if (!liste.length) {
    ziel.innerHTML = nutzer?.gast
      ? '<li class="rangliste-leer">Ohne Code bist du nicht in der Rangliste. Mit Code spielst du mit.</li>'
      : '<li class="rangliste-leer">Noch hat niemand Sterne gesammelt. Sei der Erste.</li>';
    $('knopf-name').hidden = true;
    return;
  }

  const sortiert = [...liste].sort((a, b) =>
    b.sterne_woche - a.sterne_woche || b.sterne_gesamt - a.sterne_gesamt);

  // Immer die Spitze zeigen – und die eigene Zeile, auch wenn sie weiter unten steht.
  const oben = sortiert.slice(0, anzahl);
  const meinPlatz = sortiert.findIndex((e) => e.ich);
  if (meinPlatz >= anzahl) oben.push(sortiert[meinPlatz]);

  ziel.innerHTML = oben.map((e) => {
    const platz = sortiert.indexOf(e) + 1;
    return `<li class="${e.ich ? 'ich' : ''}">
      <span class="rang-platz">${platz}</span>
      <span class="rang-name">${entschaerfen(e.name)}</span>
      <span class="rang-sterne">${sternZeichen(e)} ${e.sterne_woche}</span>
    </li>`;
  }).join('');

  $('knopf-name').hidden = !!nutzer?.gast || !!nutzer?.spitzname_gesperrt;
}

const entschaerfen = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (z) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));

/* ---------------- Spitzname ---------------- */

$('knopf-name').addEventListener('click', () => nameFragen());
$('knopf-name-zu').addEventListener('click', () => $('dialog-name').close());

function nameFragen() {
  const nutzer = DB.nutzer();
  if (nutzer?.spitzname_gesperrt) return;
  $('in-spitzname').value = nutzer?.spitzname || '';
  $('name-fehler').hidden = true;
  $('dialog-name').showModal();
  setTimeout(() => $('in-spitzname').focus(), 60);
}

$('in-spitzname').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('knopf-name-speichern').click(); }
});

$('knopf-name-speichern').addEventListener('click', async () => {
  const name = $('in-spitzname').value.trim().replace(/\s+/g, ' ');
  const fehler = $('name-fehler');

  if (name.length < 2) {
    fehler.textContent = 'Mindestens zwei Zeichen.';
    fehler.hidden = false;
    return;
  }
  try {
    await DB.spitznameSetzen(name);
    $('dialog-name').close();
    await startseite();
  } catch (f) {
    fehler.textContent = f.message;
    fehler.hidden = false;
  }
});

/* ---------------- Wochenaufgabe ---------------- */

function wochenaufgabeGeloest() {
  const wa = zustand.wochenaufgabe;
  if (!wa) return false;
  const richtige = new Set(zustand.waStand.filter((s) => s.richtig).map((s) => s.schritt));
  return richtige.size >= (wa.schritte || []).length;
}

function zeichneWochenaufgabe() {
  const wa = zustand.wochenaufgabe;
  const karte = $('wochenkarte');
  if (!wa) { karte.hidden = true; return; }

  const fertig = wochenaufgabeGeloest();
  const geschafft = new Set(zustand.waStand.filter((s) => s.richtig).map((s) => s.schritt)).size;

  karte.hidden = false;
  karte.classList.toggle('erledigt', fertig);
  $('wochen-komet').innerHTML = sternZeichen({
    wochenstern: fertig, wochenaufgabe_geloest: true, einladend: true,
  });
  $('wochen-titel').textContent = wa.titel;
  $('wochen-info').textContent = fertig
    ? 'Bearbeitung abgeschlossen.'
    : `Wochenaufgabe · ${geschafft} von ${(wa.schritte || []).length} Schritten`;
}

$('wochenkarte').addEventListener('click', () => wochenaufgabeOeffnen());
$('knopf-wa-zu').addEventListener('click', async () => {
  $('dialog-woche').close();
  await startseite();
});

function wochenaufgabeOeffnen() {
  const wa = zustand.wochenaufgabe;
  if (!wa) return;
  $('wa-titel').textContent = wa.titel;
  $('wa-text').textContent = wa.text;
  zeichneWaSchritte();
  $('dialog-woche').showModal();
}

function zeichneWaSchritte() {
  const wa = zustand.wochenaufgabe;
  const geloest = new Set(zustand.waStand.filter((s) => s.richtig).map((s) => s.schritt));
  const feld = $('wa-schritte');
  feld.innerHTML = '';

  (wa.schritte || []).forEach((schritt, i) => {
    const fertig = geloest.has(i);
    // Erst freigeben, wenn der Schritt davor sitzt – sonst wird geraten.
    const dran = fertig || i === 0 || geloest.has(i - 1);

    const kasten = document.createElement('div');
    kasten.className = `wa-schritt ${fertig ? 'fertig' : ''}`;
    kasten.innerHTML = `
      <p><span class="wa-schritt-nr">${i + 1}.</span>${entschaerfen(schritt.frage)}</p>
      ${fertig
        ? `<p class="wa-haken">✓ ${entschaerfen(schritt.loesung)}</p>`
        : dran
          ? `<div class="wa-eingabe">
               <input type="text" inputmode="text" autocomplete="off" placeholder="Ergebnis">
               <button type="button">Prüfen</button>
             </div>`
          : '<p class="fussnote" style="margin:0">Erst den Schritt davor lösen.</p>'}`;

    if (!fertig && dran) {
      const eingabe = kasten.querySelector('input');
      const knopf = kasten.querySelector('button');
      const pruefen = () => waSchrittPruefen(i, eingabe.value, kasten);
      knopf.addEventListener('click', pruefen);
      eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') pruefen(); });
    }
    feld.appendChild(kasten);
  });
}

async function waSchrittPruefen(index, eingabe, kasten) {
  const wa = zustand.wochenaufgabe;
  const erwartet = roh(String(wa.schritte[index].loesung));
  const gegeben = roh(eingabe.trim());
  if (!gegeben) return;

  const richtig = gegeben === erwartet;
  zustand.waStand.push({ schritt: index, richtig });
  try { await DB.wochenaufgabeSchritt(wa.id, index, eingabe.trim(), richtig); } catch {}

  if (richtig) {
    funken(kasten, 2);
    zeichneWaSchritte();
    zeichneWochenaufgabe();
    if (wochenaufgabeGeloest()) sternenregen(3);
  } else {
    danebenRums();
    kasten.classList.add('wackelt');
    const feld = kasten.querySelector('input');
    if (feld) { feld.value = ''; feld.focus(); }
    setTimeout(() => kasten.classList.remove('wackelt'), 400);
  }
}

/* ---------------- Kapitel ---------------- */

function zeichneKapitel() {
  const liste = $('kapitelliste');
  liste.innerHTML = '';

  // Archiviert heißt weg: weder in der Tagesaufgabe noch in dieser Liste.
  // Die Ergebnisse bleiben in der Datenbank, die Lehrkraft kann jederzeit
  // zurückschalten.
  const sichtbar = zustand.kapitel.filter((k) => !k.archiviert);

  if (!sichtbar.length) {
    liste.innerHTML = '<li class="rangliste-leer">Zurzeit ist kein Thema freigeschaltet.</li>';
    return;
  }

  for (const k of sichtbar) {
    const gesamt = k.vorlagen.length;
    const staerken = k.vorlagen.map((v) => Math.min(zustand.lernstand[v.id]?.box ?? 0, 3) / 3);
    const geuebt = staerken.filter((x) => x > 0).length;
    const sicher = staerken.filter((x) => x === 1).length;
    const anteil = staerken.reduce((a, b) => a + b, 0) / gesamt;

    const text = geuebt === 0
      ? `${gesamt} Aufgabentypen · noch nicht geübt`
      : `${geuebt} von ${gesamt} geübt · ${sicher} ${sicher === 1 ? 'sitzt' : 'sitzen'} sicher`;

    const li = document.createElement('li');
    li.innerHTML = `
      <button type="button">
        ${ring(anteil)}
        <span>
          <strong>${entschaerfen(k.anzeige || k.titel)}</strong>
          <small>${text}</small>
        </span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => starteLektion([k]));
    liste.appendChild(li);
  }
}

const ring = (anteil) => {
  const u = 2 * Math.PI * 15;
  return `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r="15" fill="none" stroke="#313C75" stroke-width="4"/>
    <circle cx="18" cy="18" r="15" fill="none" stroke="#FFC247" stroke-width="4"
      stroke-linecap="round" stroke-dasharray="${u}" stroke-dashoffset="${u * (1 - anteil)}"
      transform="rotate(-90 18 18)"/>
  </svg>`;
};

function zeichneDiagnose(ziel, versuche, anzahl) {
  const werte = auswertungNachTag(versuche, zustand.tagNamen);
  ziel.innerHTML = '';
  if (!werte.length) {
    ziel.innerHTML = '<li class="diagnose-leer">Übe eine Lektion, dann steht hier, was schon sitzt und was noch wackelt.</li>';
    return;
  }
  for (const w of werte.slice(0, anzahl)) {
    const li = document.createElement('li');
    li.className = w.stufe;
    li.innerHTML = `<span class="diagnose-name">${entschaerfen(w.name)}</span>
      <span class="diagnose-wert">${Math.round(w.quote * 100)}%</span>`;
    ziel.appendChild(li);
  }
}

/* ---------------- Lektion ---------------- */

$('knopf-start').addEventListener('click', () => starteLektion(zustand.aktiveKapitel));
$('knopf-abbrechen').addEventListener('click', () => startseite());
$('knopf-heim').addEventListener('click', () => startseite());
$('knopf-nochmal').addEventListener('click', () => {
  const l = zustand.lektion;
  starteLektion(l.quelle, l.runde + 1);
});

function starteLektion(kapitelAuswahl, runde = 0) {
  const nutzer = DB.nutzer();
  const seed = startwert(`${nutzer.id}|${heute()}|${runde}|${kapitelAuswahl.map((k) => k.id).join(',')}`);
  const r = wuerfel(seed);
  const paare = waehleVorlagen(kapitelAuswahl, zustand.lernstand, CONFIG.aufgabenProLektion, r);

  zustand.lektion = {
    id: (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    art: kapitelAuswahl.length > 1 ? 'tages' : 'kapitel',
    quelle: kapitelAuswahl,
    runde,
    index: 0,
    serie: 0,
    besteSerie: 0,
    protokoll: [],
    aufgaben: paare.map((p, i) =>
      baueAufgabe(p.kapitel, p.vorlage, startwert(`${seed}|${p.vorlage.id}|${i}`))),
  };
  zeige('uebung');
  zeichneAufgabe();
}

function zeichneAufgabe() {
  const l = zustand.lektion;
  const a = l.aufgaben[l.index];

  $('uebung-zaehler').textContent = `${l.index + 1}/${l.aufgaben.length}`;
  $('uebung-balken').style.width = `${(l.index / l.aufgaben.length) * 100}%`;
  $('aufgabe-thema').textContent = `${a.kapitelTitel} · ${a.thema}`;
  $('aufgabe-text').innerHTML = (a.satz ? `<span class="frage-satz">${a.satz}</span>` : '') + a.frage;
  $('tafel').classList.toggle('mit-satz', !!a.satz);
  $('rueckmeldung').hidden = true;
  $('serie').hidden = true;
  document.querySelector('.bahn-uebung').style.paddingBottom = '';
  $('knopf-hilfe').hidden = !a.grundlage;
  $('tafel').classList.remove('treffer');

  const felder = $('antworten');
  felder.innerHTML = '';
  const eingabe = $('form-eingabe');

  zustand.auswahl = null;
  $('in-antwort').value = '';
  const pruefKnopf = $('knopf-pruefen');

  if (a.typ === 'mc') {
    eingabe.hidden = true;
    pruefKnopf.hidden = false;
    pruefKnopf.disabled = true;

    // Kurze Ergebnisse passen zu zweit nebeneinander. Das halbiert die Höhe
    // und erspart auf dem Handy das Scrollen während der Aufgabe.
    const laengste = Math.max(...a.optionen.map((o) => anz(o.wert).length));
    felder.classList.toggle('zweispaltig', laengste <= 7);
    felder.classList.toggle('gedraengt', laengste > 7);

    for (const option of a.optionen) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'antwort';
      b.textContent = anz(option.wert);
      b.dataset.wert = option.wert;
      b.addEventListener('click', () => waehle(option, b));
      felder.appendChild(b);
    }
  } else {
    eingabe.hidden = false;
    pruefKnopf.hidden = true;
    $('form-eingabe').querySelector('button').disabled = false;
    $('in-antwort').focus({ preventScroll: true });
  }

  uhrStarten();
}

/* Antwort auswählen – solange nicht geprüft ist, kann beliebig umgewählt werden. */
function waehle(option, knopf) {
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  for (const b of $('antworten').children) b.classList.remove('gewaehlt');
  knopf.classList.add('gewaehlt');
  zustand.auswahl = { option, knopf };
  $('knopf-pruefen').disabled = false;
  if (zustand.sofortPruefen) pruefe(option.wert === a.loesung, option.fehler, knopf);
}

$('knopf-pruefen').addEventListener('click', () => {
  const wahl = zustand.auswahl;
  if (!wahl) return;
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  pruefe(wahl.option.wert === a.loesung, wahl.option.fehler, wahl.knopf);
});

$('form-eingabe').addEventListener('submit', (e) => {
  e.preventDefault();
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  const eingabe = roh($('in-antwort').value.trim());
  if (!eingabe) return;
  pruefe(eingabe === roh(a.loesung), null, null);
});

function pruefe(richtig, fehler, knopf) {
  const l = zustand.lektion;
  const a = l.aufgaben[l.index];

  l.serie = richtig ? l.serie + 1 : 0;
  l.besteSerie = Math.max(l.besteSerie, l.serie);

  if (a.typ === 'mc') {
    $('knopf-pruefen').hidden = true;
    for (const b of $('antworten').children) {
      b.disabled = true;
      b.classList.remove('gewaehlt');
      if (b.dataset.wert === a.loesung) b.classList.add('richtig');
    }
    if (!richtig && knopf) knopf.classList.add('falsch');
  } else {
    $('form-eingabe').querySelector('button').disabled = true;
  }

  l.protokoll.push({
    kapitel: a.kapitelId, vorlage: a.vorlageId, tags: a.tags,
    richtig, fehler: richtig ? null : (fehler || 'eigene-eingabe'),
    dauer_ms: uhrLesen(),
  });

  // Die Feier fällt nach Serie unterschiedlich aus – sonst nutzt sie sich ab.
  const serienmarke = richtig
    ? feiern({
        element: knopf || $('antworten').querySelector('.richtig') || $('tafel'),
        tafel: $('tafel'),
        serie: l.serie,
      })
    : (danebenRums(), false);

  const marke = $('serie');
  marke.hidden = !serienmarke;
  if (serienmarke) marke.textContent = `★ ${l.serie} richtig hintereinander`;

  const feld = $('rueckmeldung');
  feld.className = `rueckmeldung ${richtig ? 'ja' : 'nein'}`;
  feld.hidden = false;
  $('rueckmeldung-titel').textContent = richtig ? lobText(l.serie) : `Richtig wäre ${anz(a.loesung)}`;
  $('rueckmeldung-text').textContent = richtig
    ? (a.weg || '')
    : (fehler && zustand.fehlerNamen[fehler]
        ? `Typischer Stolperstein: ${zustand.fehlerNamen[fehler]}.`
        : a.weg || '');
  $('knopf-weiter').focus({ preventScroll: true });
  platzFuerRueckmeldung();
}

/* Das Rückmeldefeld liegt fest am unteren Rand. Erst wenn es erscheint, wird
   darunter Platz freigeräumt – vorher würde die Reserve die Aufgabe unnötig
   nach oben schieben und Scrollen erzwingen. Steht die richtige Antwort
   dahinter, wird sie in den sichtbaren Bereich geholt. */
function platzFuerRueckmeldung() {
  const feld = $('rueckmeldung');
  const bahn = document.querySelector('.bahn-uebung');
  requestAnimationFrame(() => {
    const hoehe = feld.getBoundingClientRect().height;
    bahn.style.paddingBottom = `${Math.round(hoehe) + 20}px`;

    const treffer = $('antworten').querySelector('.richtig') || $('antworten').querySelector('.falsch');
    if (!treffer) return;
    const ort = treffer.getBoundingClientRect();
    const frei = window.innerHeight - hoehe;
    if (ort.bottom > frei) {
      window.scrollBy({ top: ort.bottom - frei + 12, behavior: 'smooth' });
    }
  });
}

$('knopf-weiter').addEventListener('click', async () => {
  const l = zustand.lektion;
  l.index++;
  if (l.index < l.aufgaben.length) zeichneAufgabe();
  else await beendeLektion();
});

$('knopf-hilfe').addEventListener('click', () => {
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  const kapitel = zustand.kapitel.find((k) => k.id === a.kapitelId);
  const g = kapitel?.grundlagen.find((x) => x.id === a.grundlage);
  if (!g) return;
  $('grundlage-titel').textContent = g.titel;
  $('grundlage-text').innerHTML = g.html;
  $('dialog-grundlage').showModal();
});
$('knopf-dialog-zu').addEventListener('click', () => $('dialog-grundlage').close());

/* ---------------- Abschluss ---------------- */

async function beendeLektion() {
  const l = zustand.lektion;
  const richtig = l.protokoll.filter((p) => p.richtig).length;
  const quote = richtig / l.protokoll.length;
  const zeitLektion = l.protokoll.reduce((summe, p) => summe + (p.dauer_ms || 0), 0);

  const standNeu = l.protokoll.map((p) => ({
    kapitel: p.kapitel,
    vorlage: p.vorlage,
    ...naechsteWiederholung(zustand.lernstand[p.vorlage], p.richtig),
  }));
  for (const s of standNeu) zustand.lernstand[s.vorlage] = s;

  const jetzt = new Date().toISOString();
  zustand.versuche = [...l.protokoll.map((p) => ({ ...p, erstellt: jetzt })), ...zustand.versuche];

  const lektion = {
    id: l.id,
    tag: heute(),
    art: l.art,
    kapitel: l.art === 'kapitel' ? l.quelle[0].id : null,
    aufgaben: l.protokoll.length,
    richtig,
    aktive_zeit_ms: zeitLektion,
  };

  // Tagesstern: drei Viertel richtig in einer Lektion ODER fünf Minuten am Tag.
  const tag = tagesbilanz();
  const hatteSchonStern = zustand.sterne.some((s) => s.tag === heute());
  const durchQuote = quote >= CONFIG.sternQuote;
  const durchZeit = tag.zeitMs >= CONFIG.sternZeitMs;
  const sternNeu = !hatteSchonStern && (durchQuote || durchZeit);

  if (sternNeu) {
    zustand.sterne = [{
      tag: heute(),
      grund: durchQuote ? 'quote' : 'zeit',
      quote: Math.round(quote * 1000) / 1000,
      zeit_ms: tag.zeitMs,
    }, ...zustand.sterne];
  }

  try {
    await Promise.all([
      DB.versucheSpeichern(l.protokoll.map((p) => ({ ...p, lektion: l.id }))),
      DB.lernstandSpeichern(standNeu),
      DB.lektionSpeichern(lektion),
      sternNeu ? DB.sternSetzen(zustand.sterne[0]) : Promise.resolve(),
    ]);
  } catch (fehler) {
    console.warn('Speichern fehlgeschlagen:', fehler);
  }

  if (sternNeu) {
    try { zustand.lobby = await DB.lobbyLaden(); } catch {}
  }

  zeichneAbschluss({ richtig, sternNeu, hatteSchonStern, tag, durchQuote });
}

function zeichneAbschluss({ richtig, sternNeu, hatteSchonStern, tag, durchQuote }) {
  const l = zustand.lektion;
  const siegel = $('siegel');
  const inWoche = sterneDieserWoche();
  const wochensternNeu = sternNeu && inWoche === CONFIG.sterneProWoche;
  const fehlendeZeit = Math.max(0, CONFIG.sternZeitMs - tag.zeitMs);

  siegel.className = 'siegel';

  if (sternNeu) {
    siegel.classList.add('gewonnen');
    siegel.innerHTML = grosserStern(wochensternNeu);
    $('fertig-titel').textContent = wochensternNeu ? 'Wochenstern!' : 'Stern verdient';
    $('fertig-text').textContent = wochensternNeu
      ? 'Fünf Tage in dieser Woche. Das schafft nicht jeder.'
      : durchQuote
        ? `${richtig} von ${l.protokoll.length} richtig. Noch ${CONFIG.sterneProWoche - inWoche} bis zum Wochenstern.`
        : `Fünf Minuten durchgehalten. Noch ${CONFIG.sterneProWoche - inWoche} bis zum Wochenstern.`;
    sternenregen(wochensternNeu ? 4 : 2);
  } else if (hatteSchonStern) {
    siegel.classList.add('ruhig');
    siegel.textContent = '✓';
    $('fertig-titel').textContent = `${richtig} von ${l.protokoll.length} richtig`;
    $('fertig-text').textContent = l.besteSerie >= 4
      ? `Beste Serie: ${l.besteSerie} am Stück. Den Stern für heute hattest du schon.`
      : 'Den Stern für heute hattest du schon. Diese Runde zählt trotzdem für deinen Fortschritt.';
  } else {
    siegel.classList.add('ruhig');
    siegel.textContent = '↻';
    $('fertig-titel').textContent = `${richtig} von ${l.protokoll.length} richtig`;
    $('fertig-text').textContent = fehlendeZeit <= 120000
      ? `Übe weiter – noch etwa ${Math.max(1, Math.ceil(fehlendeZeit / 60000))} Minute, dann gibt es den Stern auch so.`
      : 'Für den Stern fehlt noch etwas: drei Viertel richtig oder fünf Minuten üben. Die schwierigen kommen gleich wieder, dann mit neuen Zahlen.';
  }

  zeichneDiagnose($('fertig-diagnose'), l.protokoll, 3);

  const zeigeRang = zustand.lobby.length > 1;
  $('fertig-rang-titel').hidden = !zeigeRang;
  if (zeigeRang) zeichneRangliste($('fertig-rangliste'), 5);
  else $('fertig-rangliste').innerHTML = '';

  zeige('fertig');
}

los().catch((fehler) => {
  // Hier landet nur noch, was vor der Anmeldung schiefgeht – praktisch
  // ausschließlich ein Problem beim Laden der Kapiteldateien.
  console.error(fehler);
  document.body.innerHTML = `<div class="bahn">
    <h1 class="marke">Zahlenwerk</h1>
    <p class="fehlermeldung">Die Kapitel konnten nicht geladen werden.</p>
    <p class="fussnote">${entschaerfen(fehler.message)}</p>
    <p class="fussnote">Lade die Seite neu. Hilft das nicht, sag deiner Lehrkraft Bescheid.</p></div>`;
});
