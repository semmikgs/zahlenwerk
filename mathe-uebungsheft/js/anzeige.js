/* ============================================================
   Gemeinsame Darstellung

   Rangliste, Flamme und Sterne werden an zwei Stellen gebraucht: in der
   Schüler-App und in der Schülersicht des Lehrerbereichs. Damit beide
   nicht auseinanderlaufen, steht die Zeichnung nur hier.
   ============================================================ */

export const entschaerfen = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (z) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));

const STERN_PFAD = 'M24.0 2.8L26.29 8.84L32.75 9.16L27.71 13.21L29.41 19.44L24.0 15.9'
  + 'L18.59 19.44L20.29 13.21L15.25 9.16L21.71 8.84Z';

/* Der Stern erzählt die Woche auf einen Blick:
   gefüllt  = Wochenstern geschafft
   Schweif  = Wochenaufgabe gelöst
   hohl mit Schweif = nur die Wochenaufgabe, keine fünf Tagessterne

   Selbst gezeichnet statt als Zeichen aus der Schriftart, weil Handys den
   Kometen sonst als buntes Emoji darstellen und die drei Zustände ohnehin
   nicht unterscheidbar wären. */
export function sternZeichen({ wochenstern, wochenaufgabe_geloest: schweif, einladend }) {
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

/* Schlichter Stern für die Gesamtzahl geübter Tage. Bewusst getrennt vom
   Wochenstern-Zeichen: Dort heißt gefüllt "Wochenstern geschafft", hier
   zählt er nur Tage. Die Beschriftung steht am umgebenden Element. */
const STERN_KLEIN = 'M12 2.2L14.59 9.04L21.89 9.39L16.18 13.96L18.11 21.01L12 17'
  + 'L5.89 21.01L7.82 13.96L2.11 9.39L9.41 9.04Z';

export function sternSymbol() {
  return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <path d="${STERN_KLEIN}" fill="#FFC247"/></svg>`;
}

/* Die Flamme steht für den Lauf. Gezeichnet statt als Zeichen aus der
   Schriftart, weil Handys sie sonst als buntes Emoji darstellen – und weil
   sie so dieselbe Farbe wie die Zahl daneben trägt. */
export function flammeZeichen(brennt) {
  const farbe = brennt ? '#FF9A4D' : '#4C5894';
  return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <path d="M12 1.8c3.3 4.3 6.3 6.5 6.3 11.2 0 3.7-2.8 6.5-6.3 6.5s-6.3-2.8-6.3-6.5c0-3 1.6-4.7 3.2-6.7.6 1.4 1.3 2 2 2.3.4-2.6.6-4.7 1.1-6.8z"
      fill="${farbe}" opacity="${brennt ? 1 : .55}"/>
    <path d="M12 19.5c-1.9 0-3.4-1.5-3.4-3.5 0-1.7 1.1-2.6 2-3.9.5 1.2 1.2 1.7 2 2 .9-1 1.3-1.9 1.5-3 1 1.5 1.3 2.8 1.3 4.9 0 2-1.5 3.5-3.4 3.5z"
      fill="#141B3C" opacity="${brennt ? .34 : 0}"/>
  </svg>`;
}

/* Derselbe Stern in groß, für den Abschlussbildschirm. */
export function grosserStern(mitSchweif) {
  const pfad = 'M50.0 12.0L57.41 31.81L78.53 32.73L61.98 45.89L67.63 66.27L50.0 54.6'
    + 'L32.37 66.27L38.02 45.89L21.47 32.73L42.59 31.81Z';
  return `<svg viewBox="0 0 100 80" width="86" height="69" aria-hidden="true">
    ${mitSchweif ? `<g stroke="#FFC247" stroke-linecap="round" fill="none">
        <path d="M34 26H6"   stroke-width="5" opacity=".75"/>
        <path d="M30 41H12"  stroke-width="4" opacity=".5"/>
        <path d="M36 56H18"  stroke-width="3.2" opacity=".3"/>
      </g>` : ''}
    <path d="${pfad}" fill="#FFC247" stroke="#FFE7B0" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * Rangliste als Listeneinträge.
 *
 * Sortiert wird nach dem Lauf: Wer dranbleibt, steht oben. Bei Gleichstand
 * entscheidet, wer insgesamt mehr Tage gesammelt hat.
 *
 * anzahl  – wie viele Zeilen von oben gezeigt werden; 0 heißt alle.
 *           Die eigene Zeile kommt dazu, auch wenn sie weiter unten steht.
 */
export function ranglisteZeilen(liste, anzahl = 0) {
  const sortiert = [...liste].sort((a, b) =>
    (b.lauf ?? 0) - (a.lauf ?? 0) || (b.sterne_gesamt ?? 0) - (a.sterne_gesamt ?? 0));

  let gezeigt = sortiert;
  if (anzahl > 0 && sortiert.length > anzahl) {
    gezeigt = sortiert.slice(0, anzahl);
    const meinPlatz = sortiert.findIndex((e) => e.ich);
    if (meinPlatz >= anzahl) gezeigt = [...gezeigt, sortiert[meinPlatz]];
  }

  return gezeigt.map((e) => {
    const platz = sortiert.indexOf(e) + 1;
    const lauf = e.lauf ?? 0;
    return `<li class="${e.ich ? 'ich' : ''}">
      <span class="rang-platz">${platz}</span>
      <span class="rang-name">${entschaerfen(e.name)}${
        e.wochenaufgabe_geloest ? ` <span class="rang-komet">${sternZeichen(e)}</span>` : ''}</span>
      <span class="rang-lauf ${lauf ? '' : 'kalt'}" title="${lauf} Tage am Stück">
        ${flammeZeichen(lauf > 0)}${lauf}</span>
      <span class="rang-sterne" title="${e.sterne_gesamt ?? 0} Tage geübt">
        ${sternSymbol()}${e.sterne_gesamt ?? 0}</span>
    </li>`;
  }).join('');
}
