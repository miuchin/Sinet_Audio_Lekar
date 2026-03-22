// SINET Model A: Frequency catalog fallback
// Assumes you already loaded SINET_STL.json into a variable `stlData` (object).

const FREQ_CATALOG = (stlData?.meta?.freq_catalog) || {};

function hzKey(hz) {
  const n = Number(hz);
  if (Number.isFinite(n)) {
    const r = Math.round(n * 1000) / 1000; // stabilize
    return String(r);
  }
  return String(hz).trim();
}

function resolveFreqInfo(freqObj) {
  // freqObj: {hz, naziv, opis, izvor}
  const inlineNaziv = (freqObj?.naziv || "").trim();
  const inlineOpis  = (freqObj?.opis  || "").trim();
  const inlineIzvor = freqObj?.izvor || null;

  if (inlineNaziv || inlineOpis) {
    return { hz: freqObj?.hz, naziv: inlineNaziv, opis: inlineOpis, izvor: inlineIzvor, source: "inline" };
  }

  const key = hzKey(freqObj?.hz);
  const meta = FREQ_CATALOG[key];
  if (meta) {
    return {
      hz: freqObj?.hz,
      naziv: (meta.naziv || "").trim(),
      opis: (meta.opis || "").trim(),
      izvor: meta.izvor || null,
      evidence: meta.evidence || null,
      tags: meta.tags || [],
      source: "catalog"
    };
  }

  return { hz: freqObj?.hz, naziv: "", opis: "", izvor: null, source: "none" };
}

// Example in your renderer (pseudo):
// const info = resolveFreqInfo(fr);
// renderText(`${fr.hz} Hz`);
// if (info.naziv) renderSub(info.naziv);
// if (info.opis) renderMuted(info.opis);
// if (info.izvor?.url) renderLink("Izvor", info.izvor.url);
