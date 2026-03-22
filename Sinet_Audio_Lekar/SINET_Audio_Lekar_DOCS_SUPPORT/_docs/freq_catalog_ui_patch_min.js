// Model A (freq_catalog) - minimal UI patch
// Pretpostavka: nakon učitavanja SINET_STL.json imaš objekat `stlData` (JSON).
const FREQ_CATALOG = stlData?.meta?.freq_catalog || {};

function hzKey(hz) {
  const n = Number(hz);
  if (Number.isFinite(n)) return String(Math.round(n * 1000) / 1000);
  return String(hz).trim();
}

function resolveFreqOpis(freqObj) {
  const inlineOpis = (freqObj?.opis || "").trim();
  if (inlineOpis) return inlineOpis;

  const key = hzKey(freqObj?.hz);
  const meta = FREQ_CATALOG[key];
  return (meta?.opis || "").trim();
}

// U renderer-u frekvencije:
// const opis = resolveFreqOpis(fr);
// if (opis) prikazi(opis);
