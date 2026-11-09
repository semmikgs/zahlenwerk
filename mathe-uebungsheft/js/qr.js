import qrcode from './fremd/qrcode.mjs?v=14';

/* QR-Code als SVG.

   Bewusst SVG und nicht Bild: Der Streifen wird gedruckt, und ein SVG bleibt
   bei jeder Papiergröße gestochen scharf. Außerdem landet nichts im
   Zwischenspeicher und es geht keine Anfrage nach außen.

   Fehlerkorrektur M – verträgt ungefähr fünfzehn Prozent Beschädigung.
   Das reicht für einen Zettel, der in der Schultasche knittert. */
export function qrSvg(text, { groesse = 86, rand = 2, farbe = '#122B57' } = {}) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();

  const n = q.getModuleCount();
  let pfad = '';
  for (let zeile = 0; zeile < n; zeile++) {
    for (let spalte = 0; spalte < n; spalte++) {
      if (q.isDark(zeile, spalte)) pfad += `M${spalte} ${zeile}h1v1h-1z`;
    }
  }

  const feld = n + rand * 2;
  return `<svg viewBox="${-rand} ${-rand} ${feld} ${feld}" width="${groesse}" height="${groesse}"
     shape-rendering="crispEdges" role="img" aria-label="QR-Code zum Übungsheft">
    <rect x="${-rand}" y="${-rand}" width="${feld}" height="${feld}" fill="#fff"/>
    <path d="${pfad}" fill="${farbe}"/>
  </svg>`;
}
