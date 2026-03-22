/*
  SINET STL → Runtime Adapter (v1.1)
  File: js/catalog/stl-adapter.js

  Purpose:
    App UI/player expects "runtime" items:
      { items: [ { id, simptom, opis, oblast, frekvencije:[{value,svrha,izvor,enabled}], holisticki:{...} } ] }

    Canonical STL uses:
      { meta, simptomi: [ { id, uid?, naziv, opis, mkb10, psihosomatika, afirmacija, molitva, narodni_lek, akupresura, frekvencije:[{hz,naziv,opis,funkcija,izvor}] } ] }

  This adapter:
    - Detects STL payload
    - Converts into runtime items[]
    - Adds reasonable defaults for oblast + presets (sys-hitno-*)
    - Preserves rich source objects (keeps original under *_obj fields)
*/

function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }

function slugToTitle(slug){
  return String(slug || "")
    .replace(/[_]+/g, "-")
    .replace(/-+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : w)
    .join(" ");
}

function deriveNameFromId(id){
  const s = String(id || "");
  if (!s) return "";
  if (s.startsWith("sys-hitno-")) return "HITNO: " + slugToTitle(s.slice("sys-hitno-".length));
  const parts = s.split("-");
  if (parts.length > 1) return slugToTitle(parts.slice(1).join("-"));
  return slugToTitle(s);
}


function isEmptySource(src){
  if (!src) return true;
  if (typeof src === "string") return !src.trim();
  if (!isObj(src)) return !String(src).trim();
  return !(src.url || src.URL || src.link || src.sistem || src.tradicija || src.autor || src.delo || src.licenca);
}

function sourceToString(src){
  if (!src) return '';
  if (typeof src === 'string') return src;
  if (!isObj(src)) return String(src);

  // Prefer URL as most "verifiable" in UI
  const url = src.url || src.URL || src.link;
  if (url) return String(url);

  // Then system/author/work
  const parts = [];
  if (src.sistem) parts.push(src.sistem);
  if (src.tradicija) parts.push(src.tradicija);
  if (src.autor) parts.push(src.autor);
  if (src.delo) parts.push(src.delo);
  if (src.licenca) parts.push(src.licenca);
  return parts.filter(Boolean).join(' • ');
}

function mkbToBadge(mkb){
  if (!mkb) return '';
  if (typeof mkb === 'string') return mkb;
  if (!isObj(mkb)) return String(mkb);
  return mkb.code || mkb.sifra || mkb.sifra_mkb || '';
}


// --- Model A: Frequency Catalog (meta.freq_catalog) fallback ---
function hzKey(hz){
  const n = Number(hz);
  if (Number.isFinite(n)) {
    const r = Math.round(n * 1000) / 1000; // stabilize
    return String(r);
  }
  return String(hz ?? '').trim();
}

function getFreqMeta(freqCatalog, hz){
  if (!freqCatalog) return null;
  const k = hzKey(hz);
  return freqCatalog[k] || freqCatalog[String(hz)] || null;
}
function freqToRuntime(f, freqCatalog){
  if (!f) return null;

  const hz = Number(f.hz ?? f.value ?? f.Hz ?? 0);
  if (!Number.isFinite(hz) || hz <= 0) return null;

  const meta = getFreqMeta(freqCatalog, hz) || {};

  const naziv = (f.naziv || f.name || meta.naziv || '').toString().trim();
  const opis = (f.opis || f.description || f.desc || meta.opis || '').toString().trim();
  const funkcija = (f.funkcija || f.svrha || f.note || '').toString().trim();

  // Recommended/optimal duration (minutes) if present in STL (optional)
  const recMinRaw =
    (f.trajanje_min ?? f.trajanjeMin ?? f.preporuceno_min ?? f.preporucenoMin ?? f.preporucenoTrajanjeMin ?? null);
  const trajanje_min = (recMinRaw === null || recMinRaw === undefined || recMinRaw === '')
    ? null
    : Math.max(0, Number(recMinRaw) || 0);

  // Model A source fallback: inline source first, then meta.freq_catalog
  const inlineSource = isEmptySource(f.izvor) ? null : f.izvor;
  const fallbackSource = isEmptySource(f.source) ? null : f.source;
  const izvorObj = inlineSource || fallbackSource || meta.izvor || null;
  const evidence = meta.evidence || null;
  const tags = Array.isArray(meta.tags) ? meta.tags : null;

  // "svrha" is the primary short label used by legacy UI lists
  const svrha = (funkcija || naziv || opis || '').toString();
  const izvor = sourceToString(izvorObj) || '—';

  return {
    value: hz,

    // Rich STL fields (kept for Player + Inspector)
    naziv,
    opis,
    funkcija,
    trajanje_min,

    // Legacy runtime fields (for existing UI)
    svrha,
    izvor,
    izvor_obj: izvorObj,
    evidence,
    tags,
    enabled: f.enabled !== false,

    // For Now-Playing list
    desc: svrha,
    src: izvor
  };
}

function holistikaFromSTL(stl){
  const h = {};

  if (stl.psihosomatika) {
    h.psihosomatika = {
      uzrok: stl.psihosomatika.uzrok || '',
      lek: stl.psihosomatika.lek || ''
    };
  }

  if (stl.afirmacija) {
    h.afirmacija = {
      tekst: stl.afirmacija.tekst || '',
      autor: stl.afirmacija.autor || '',
      izvor: stl.afirmacija.izvor || ''
    };
  }

  if (stl.molitva) {
    // legacy UI used "duhovnost.tekst"
    h.duhovnost = {
      tekst: stl.molitva.tekst || '',
      izvor: stl.molitva.izvor || ''
    };
    h.molitva = { ...h.duhovnost };
  }

  if (stl.narodni_lek) {
    // STL: { tekst, napomena, izvor }
    const opis = stl.narodni_lek.opis || stl.narodni_lek.tekst || '';
    h.saveti = { narodno: opis };
    h.narodni_lek = { opis };
  }

  return h;
}

function oblastFromId(id){
  const s = String(id || "");
  if (!s) return "Ostalo";
  if (s.startsWith("sys-hitno-")) return "01. PRVA POMOĆ (AKUTNO)";

  const prefix = s.split("-")[0];
  const map = {
    sys: "Sistem",
    rife: "Rife (osnovno)",
    akutne: "Akutno",
    bolovi: "Bolovi",
    varenje: "Varenje",
    nervni: "Nervni sistem",
    disanje: "Disanje",
    jetra: "Jetra i žuč",
    neuro: "Neurologija",
    koza: "Koža",
    psycho: "Psihosomatika",
    psy: "Psihosomatika",
    oci: "Oči",
    kosa: "Kosa",
    hormoni: "Hormoni",
    imunitet: "Imunitet",
    zubi: "Zubi i vilica"
  };
  return map[prefix] || slugToTitle(prefix) || "Ostalo";
}

export function isSTLCatalog(data){
  return isObj(data) && Array.isArray(data.simptomi) && isObj(data.meta);
}

export function stlToRuntimeItems(stlCatalog){
  const freqCatalog = (stlCatalog && stlCatalog.meta && stlCatalog.meta.freq_catalog) ? stlCatalog.meta.freq_catalog : {};
  const simptomi = Array.isArray(stlCatalog?.simptomi) ? stlCatalog.simptomi : [];
  const items = [];

  for (const s of simptomi) {
    if (!s || !s.id) continue;

    const freqs = Array.isArray(s.frekvencije)
      ? s.frekvencije.map(f => freqToRuntime(f, freqCatalog)).filter(Boolean)
      : [];

    // display name: prefer STL naziv unless it is a placeholder like "Simptom 123"
    let display = (s.naziv || s.simptom || String(s.id)).toString().trim();
    if (/^Simptom\s+\d+$/i.test(display) || !display) {
      display = deriveNameFromId(s.id);
    }

    const isHitno = String(s.id).startsWith("sys-hitno-");
    const quickGroup = s.quickGroup || (isHitno ? "01. PRVA POMOĆ (AKUTNO)" : undefined);
    const seniorQuick = (typeof s.seniorQuick === "boolean") ? s.seniorQuick : isHitno;
    const tags = Array.from(new Set([
      ...(Array.isArray(s.tags) ? s.tags : []),
      ...(Array.isArray(s.keywords) ? s.keywords : []),
      ...(Array.isArray(s.search_terms) ? s.search_terms : []),
      ...(Array.isArray(s.alias_terms) ? s.alias_terms : []),
      ...(Array.isArray(s.alias_id_list) ? s.alias_id_list : []),
      ...(Array.isArray(s.alias_naziv_list) ? s.alias_naziv_list : [])
    ].filter(Boolean).map(v => String(v).trim()).filter(Boolean)));

    items.push({
      uid: s.uid ?? null,
      id: String(s.id),
      version: s.version || "stl",
      status: s.status || "active",

      oblast: s.oblast || oblastFromId(s.id),
      podOblast: s.podOblast ?? null,

      simptom: display,
      opis: s.opis || '',

      mkb10: mkbToBadge(s.mkb10),
      mkb10_obj: s.mkb10 || null,

      holisticki: holistikaFromSTL(s),

      akupresura: s.akupresura || null,

      frekvencije: freqs,
      preporuka: s.preporuka || s.preporuke || s.recommendation || null,
      trajanjePoFrekvencijiMin: s.trajanjePoFrekvencijiMin ?? s.trajanje_po_frekv_min ?? null,

      // Search / bridge metadata
      tags,
      keywords: Array.isArray(s.keywords) ? s.keywords : [],
      search_terms: Array.isArray(s.search_terms) ? s.search_terms : [],
      alias_terms: Array.isArray(s.alias_terms) ? s.alias_terms : [],
      warnings: s.warnings || '',
      red_flags: s.red_flags || '',
      risk: s.risk || '',
      evidence: s.evidence || '',
      frequency_protocol_family: s.frequency_protocol_family || '',
      frequency_target_system: s.frequency_target_system || '',
      frequency_intent: s.frequency_intent || '',
      frequency_time_window: s.frequency_time_window || '',
      frequency_pattern: s.frequency_pattern || '',
      frequency_target_region: s.frequency_target_region || '',
      frequency_caution: s.frequency_caution || '',
      mkb10_primary_block: s.mkb10_primary_block || '',
      mkb10_primary_chapter: s.mkb10_primary_chapter || '',
      mkb10_shortlist: Array.isArray(s.mkb10_shortlist) ? s.mkb10_shortlist : [],
      mkb10_confidence: s.mkb10_confidence || '',
      canonical_seq: s.canonical_seq ?? s.seq ?? null,
      canonical_id: s.canonical_id || s.id || '',
      canonical_naziv: s.canonical_naziv || s.naziv || display,
      source_bridge: s.source_bridge === true,

      // Presets / quick help
      seniorQuick,
      quickGroup,

      _stl: s
    });
  }

  return items;
}

export function normalizeCatalogPayload(raw){
  if (!raw) return { meta: null, items: [] };

  // Already runtime-ish
  if (Array.isArray(raw)) return { meta: null, items: raw };
  if (Array.isArray(raw.items)) return { meta: raw.meta || null, items: raw.items };
  if (Array.isArray(raw.entries)) return { meta: raw.meta || null, items: raw.entries };

  // STL
  if (isSTLCatalog(raw)) {
    return { meta: raw.meta || null, items: stlToRuntimeItems(raw) };
  }

  return { meta: raw.meta || null, items: [] };
}
