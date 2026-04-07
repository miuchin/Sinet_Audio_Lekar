const BOOK_MANIFEST_URL = new URL('../data/book_manifest.json', import.meta.url);
const BOOK_TOC_INDEX_URL = new URL('../data/book_toc_index.json', import.meta.url);
const BOOK_MASTER_INDEX_URL = new URL('../data/book_master_index.json', import.meta.url);
const LEGACY_BOOK_INDEX_URL = new URL('../data/book_index.json', import.meta.url);

const cache = new Map();

async function fetchJson(url){
  const key = String(url);
  if(cache.has(key)) return cache.get(key);
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`Ne mogu da učitam ${url.pathname.split('/').slice(-2).join('/')} (${res.status}).`);
  const data = await res.json();
  cache.set(key, data);
  return data;
}

async function tryFetch(url){
  try{return await fetchJson(url);}catch{return null;}
}

export async function loadManifest(){
  const data = await tryFetch(BOOK_MANIFEST_URL);
  if(data) return data;
  const legacy = await fetchJson(LEGACY_BOOK_INDEX_URL);
  return {
    meta: legacy.meta,
    files: { toc_index:'data/book_index.json', master_index:'data/book_index.json', area_chunks_dir:'data/' },
    toc: { rows_per_page:72, cover_pages:1, guide_pages:1, overview_pages:1, master_toc_pages:1, freq_toc_pages:1 },
    legacy: true,
  };
}

export async function loadTocIndex(){
  const data = await tryFetch(BOOK_TOC_INDEX_URL);
  if(data) return data;
  const legacy = await fetchJson(LEGACY_BOOK_INDEX_URL);
  return {
    meta: legacy.meta,
    toc: { rows_per_page:72, cover_pages:1, guide_pages:1, overview_pages:1, master_toc_pages:1, freq_toc_pages:1 },
    areas: legacy.areas.map(a => ({
      order: a.order,
      naziv: a.naziv,
      slug: a.slug || '',
      chunk_file: a.chunk_file || '',
      symptom_count: a.symptom_count,
      freq_covered: a.freq_covered,
      mkb_covered: a.mkb_covered,
      podoblasti: a.podoblasti,
      pages_master: 1,
      pages_freqs: 1,
      start_page_master: a.order + 4,
      start_page_freqs: a.order + 4,
    }))
  };
}

export async function loadMasterIndex(){
  const data = await tryFetch(BOOK_MASTER_INDEX_URL);
  if(data) return data;
  return await fetchJson(LEGACY_BOOK_INDEX_URL);
}

export async function loadAreaChunk(areaSummary){
  if(areaSummary?.chunk_file){
    const url = new URL(`../data/${areaSummary.chunk_file}`, import.meta.url);
    const chunk = await tryFetch(url);
    if(chunk?.area) return chunk.area;
  }
  const master = await loadMasterIndex();
  const found = (master.areas || []).find(a => a.naziv === areaSummary?.naziv || a.slug === areaSummary?.slug);
  if(!found) throw new Error(`Ne mogu da pronađem oblast: ${areaSummary?.naziv || areaSummary?.slug || 'N/A'}`);
  return found;
}

export function formatInt(value){
  try{return new Intl.NumberFormat('sr-RS').format(value||0);}catch{return String(value||0);} 
}

export function slugify(text=''){
  return String(text).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

export function getQueryParams(){
  return new URLSearchParams(window.location.search);
}

export function escapeHtml(value=''){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

export function pickAreas(areaList, requestedArea){
  if(!requestedArea) return areaList;
  return areaList.filter(a => a.naziv === requestedArea);
}
