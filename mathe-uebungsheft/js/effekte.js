/* ============================================================
   Belohnungseffekte

   Grundgedanke: Eine Belohnung, die jedes Mal gleich ausfällt, ist nach
   zwei Tagen Tapete. Deshalb variiert hier sowohl die Stärke als auch die
   Form – und sie steigt mit der Serie. Wer fünf richtig hintereinander
   hat, sieht etwas anderes als beim ersten Treffer.

   Alles läuft über CSS-Animationen auf kurzlebigen Elementen. Kein
   WebGL, keine Bibliothek, keine Anfrage nach außen – damit es auch auf
   fünf Jahre alten Handys flüssig bleibt.
   ============================================================ */

const GOLD = ['#FFC247', '#FFE7B0', '#FFD979'];
const GRUEN = ['#35D6A0', '#7DF0C4', '#2BB98A'];

let feld = null;
const feldHolen = () => {
  if (!feld) {
    feld = document.createElement('div');
    feld.className = 'funkenfeld';
    feld.setAttribute('aria-hidden', 'true');
    document.body.appendChild(feld);
  }
  return feld;
};

const sparsameBewegung = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Kurze Vibration, wo das Gerät sie kann. iPhones können es nicht – kein Verlust. */
export function rums(muster) {
  try { navigator.vibrate?.(muster); } catch {}
}

/**
 * Funken aus der Mitte eines Elements.
 * stufe 1 = kleiner Treffer, 3 = Serie, 5 = Meilenstein.
 */
export function funken(element, stufe = 1, farben = GOLD) {
  if (!element || sparsameBewegung()) return;

  const ort = element.getBoundingClientRect();
  const x = ort.left + ort.width / 2;
  const y = ort.top + ort.height / 2;
  const behaelter = feldHolen();

  const anzahl = Math.min(8 + stufe * 7, 40);
  const weite = 70 + stufe * 26;

  for (let i = 0; i < anzahl; i++) {
    const f = document.createElement('i');
    f.className = Math.random() < 0.35 ? 'funke zacke' : 'funke';

    // Nach oben hin etwas dichter streuen – wirkt wie Auftrieb.
    const winkel = (Math.PI * 2 * i) / anzahl + (Math.random() - 0.5) * 0.5;
    const strecke = weite * (0.45 + Math.random() * 0.75);
    const groesse = 5 + Math.random() * (4 + stufe * 1.6);

    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.setProperty('--dx', `${Math.cos(winkel) * strecke}px`);
    f.style.setProperty('--dy', `${Math.sin(winkel) * strecke - 18}px`);
    f.style.setProperty('--gr', `${groesse}px`);
    f.style.setProperty('--farbe', farben[i % farben.length]);
    f.style.setProperty('--dauer', `${620 + Math.random() * 380}ms`);
    f.style.setProperty('--ende', `${0.2 + Math.random() * 0.5}`);

    behaelter.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
}

/** Funken über die gesamte Breite, von oben herabfallend. Für den Tagesstern. */
export function sternenregen(stufe = 3) {
  if (sparsameBewegung()) return;
  const behaelter = feldHolen();
  const anzahl = 26 + stufe * 8;

  for (let i = 0; i < anzahl; i++) {
    const f = document.createElement('i');
    f.className = Math.random() < 0.5 ? 'funke zacke' : 'funke';
    const start = Math.random() * window.innerWidth;

    f.style.left = `${start}px`;
    f.style.top = `${-20 - Math.random() * 60}px`;
    f.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    f.style.setProperty('--dy', `${window.innerHeight * (0.55 + Math.random() * 0.6)}px`);
    f.style.setProperty('--gr', `${5 + Math.random() * 7}px`);
    f.style.setProperty('--farbe', GOLD[i % GOLD.length]);
    f.style.setProperty('--dauer', `${1100 + Math.random() * 900}ms`);
    f.style.setProperty('--ende', '0.3');
    f.style.animationDelay = `${Math.random() * 420}ms`;

    behaelter.appendChild(f);
    setTimeout(() => f.remove(), 2600);
  }
}

/* Lob, das sich nicht wiederholt: aus jedem Topf wird gezogen, ohne
   dass direkt dieselbe Zeile zweimal hintereinander kommt. */
const LOB = {
  klein: ['Richtig.', 'Sitzt.', 'Genau so.', 'Stimmt.', 'Passt.', 'Korrekt.'],
  serie: ['Drei am Stück.', 'Läuft gerade.', 'Du bist drin.', 'Weiter so.'],
  gross: ['Fünf hintereinander!', 'Das sitzt richtig.', 'Starke Serie!', 'Souverän.'],
};
let zuletzt = '';

export function lobText(serie) {
  const topf = serie >= 5 ? LOB.gross : serie >= 3 ? LOB.serie : LOB.klein;
  let gewaehlt = topf[Math.floor(Math.random() * topf.length)];
  if (gewaehlt === zuletzt && topf.length > 1) {
    gewaehlt = topf[(topf.indexOf(gewaehlt) + 1) % topf.length];
  }
  zuletzt = gewaehlt;
  return gewaehlt;
}

/**
 * Die ganze Feier zu einer richtigen Antwort, abgestuft nach Serie.
 * Gibt zurück, ob eine Serienmarke gezeigt werden soll.
 */
export function feiern({ element, tafel, serie }) {
  const stufe = serie >= 5 ? 3 : serie >= 3 ? 2 : 1;

  funken(element || tafel, stufe, serie >= 3 ? GOLD : GRUEN);
  if (tafel) {
    tafel.classList.remove('treffer');
    void tafel.offsetWidth;        // Neustart der Animation erzwingen
    tafel.classList.add('treffer');
  }

  rums(stufe === 3 ? [18, 40, 18, 40, 30] : stufe === 2 ? [15, 50, 25] : 18);
  return serie >= 3;
}

export function danebenRums() {
  rums([40, 60, 40]);
}
