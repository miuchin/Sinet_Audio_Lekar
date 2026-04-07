(function(){
  const VERSION = "16.0.0.118.40.7";
  const STORAGE_KEY = 'SINET_AREA_EXPORT_PAYLOAD_V1';
  const esc = (v='') => String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  const arr = (v) => Array.isArray(v) ? v : [];
  const textOf = (...vals) => vals.find(v => String(v ?? '').trim()) || '';

  function normalizeItem(item, idx=0){
    const src = (item && typeof item === 'object') ? item : {};
    return {
      id: textOf(src.id, src.uid, src._id, `area-item-${idx+1}`),
      simptom: textOf(src.simptom, src.naziv, src.name, src.title, src._symptom, `Stavka ${idx+1}`),
      oblast: textOf(src.oblast, src.category, src.group, src._area, 'Ostalo'),
      podOblast: textOf(src.podOblast, src.podoblast, src.subarea, src._subarea, 'Opšti prikaz'),
      opis: textOf(src.opis, src.description, src.desc, src._desc, ''),
      mkb10: textOf(src?.mkb10_obj?.sifra, src.mkb10, src._mkb, ''),
      frekCount: arr(src.frekvencije || src._freqs).length,
      altCount: arr(src.alternativne_metode || src.alternative_methods || src._stl?.alternativne_metode).length
    };
  }
  function normalizeItems(items){ return arr(items).map(normalizeItem).filter(Boolean); }
  function groupAreas(items){
    const map = new Map();
    normalizeItems(items).forEach((it)=>{
      const key = it.oblast || 'Ostalo';
      const g = map.get(key) || { oblast:key, count:0, freq:0, mkb:0, symptoms:[], pods:new Map() };
      g.count += 1;
      if (it.frekCount) g.freq += 1;
      if (it.mkb10) g.mkb += 1;
      g.symptoms.push(it);
      const pod = it.podOblast || 'Opšti prikaz';
      g.pods.set(pod, (g.pods.get(pod) || 0) + 1);
      map.set(key, g);
    });
    return [...map.values()].sort((a,b)=> a.oblast.localeCompare(b.oblast, 'sr', {sensitivity:'base'})).map(g=>({
      ...g,
      podStats: [...g.pods.entries()].sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0], 'sr', {sensitivity:'base'}))
    }));
  }

  function resolveMode(mode='areas'){
    return mode === 'area-symptoms' ? 'area-symptoms' : 'areas';
  }
  function titleOf(opts={}){
    const mode = resolveMode(opts.mode);
    const oblast = String(opts.oblast || '').trim();
    if (mode === 'areas') return 'SINET Oblasti';
    return oblast ? `SINET Oblast + simptomi - ${oblast}` : 'SINET Oblasti + simptomi';
  }
  function subtitleOf(opts={}){
    const mode = resolveMode(opts.mode);
    return mode === 'areas'
      ? 'Kompaktan pregled oblasti: 3 kolone, sa brojem simptoma, MKB-10 i frekvencijskim pokrićem.'
      : 'Book režim: svaka oblast kreće na novoj strani, a simptomi idu u zbijenom 2-kolonskom rasporedu.';
  }
  function modeLabelOf(opts={}){
    return resolveMode(opts.mode) === 'areas' ? 'Samo oblasti' : 'Oblasti + simptomi';
  }
  function statPill(label, value){
    return `<span class="stat-pill"><strong>${esc(value)}</strong> <span>${esc(label)}</span></span>`;
  }
  function areaStyles(){
    return `
      :root{--bg:#f7fbff;--card:#fff;--line:#d9e7f5;--ink:#14324a;--muted:#5f7288;--soft:#eef6ff;--soft2:#f8fbff}
      *{box-sizing:border-box}
      body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--ink)}
      .page{max-width:1560px;margin:0 auto;padding:14px}
      .sheet{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 6px 24px rgba(20,50,74,.08)}
      .hero{display:grid;grid-template-columns:1.35fr 1fr;gap:12px;margin-bottom:12px}
      .hero .card{margin:0}
      .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}
      .title{font-size:30px;font-weight:800;line-height:1.08;margin:0 0 8px 0}
      .muted{color:var(--muted)}
      .hero-meta{display:flex;flex-wrap:wrap;gap:8px}
      .stat-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:var(--soft);font-size:12px}
      .stat-pill strong{font-size:13px}
      .grid{gap:12px;align-items:start}
      .grid.area-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
      .grid.area-book{display:grid;grid-template-columns:1fr}
      .area-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
      .area-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;margin-bottom:4px}
      .area-title{font-size:18px;font-weight:800;margin-bottom:2px;line-height:1.18}
      .meta{font-size:13px;color:var(--muted);line-height:1.35}
      .compact-meta{text-align:right;white-space:nowrap}
      .pill{display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:var(--soft);font-size:12px;font-weight:700;margin:0 6px 6px 0}
      .pods{margin-top:4px}
      .microlist{margin-top:8px;padding-top:8px;border-top:1px dashed #dbe8f4;font-size:12px;line-height:1.35;color:var(--muted)}
      .microlist strong{color:var(--ink)}
      .symptoms{margin-top:10px}
      .symptoms-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;align-items:start}
      .symptom-row{padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:var(--soft2);break-inside:avoid;page-break-inside:avoid}
      .symptom-head{font-size:13px;line-height:1.28}
      .nr{color:#5f7288;font-weight:700}
      .small{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.25}
      .desc{font-size:12px;line-height:1.34;margin-top:6px}
      .area-detail{padding-bottom:14px}
      @media (max-width:1260px){.grid.area-overview{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:1100px){.hero{grid-template-columns:1fr}.grid.area-overview,.grid.area-book{grid-template-columns:1fr}.title{font-size:24px}.symptoms-grid{grid-template-columns:1fr}.compact-meta{text-align:left;white-space:normal}}
      @page{size:A4 landscape;margin:7mm}
      @media print{
        body{background:#fff;font-size:9pt}
        .page{max-width:none;padding:0}
        .sheet{border:none;box-shadow:none;border-radius:0;padding:0}
        .hero{grid-template-columns:1.45fr 1fr;gap:4mm;margin-bottom:4mm}
        .title{font-size:16.8pt;margin-bottom:1.8mm}
        .muted{font-size:7.8pt;line-height:1.18}
        .hero-meta{gap:1.2mm}
        .stat-pill{padding:.9mm 1.4mm;font-size:7pt;gap:1mm}
        .stat-pill strong{font-size:7.4pt}
        .grid.area-overview{display:block;column-count:3;column-gap:4.8mm;column-fill:auto}
        .grid.area-overview .area-card{display:inline-block;width:100%}
        .grid.area-book{display:block}
        .card{padding:2.2mm 2.6mm;margin:0 0 2.6mm;border-radius:7px}
        .area-head{gap:3mm;margin-bottom:1.6mm}
        .area-kicker{font-size:7.1pt;margin-bottom:.5mm}
        .area-title{font-size:9.8pt}
        .meta,.small{font-size:7pt;line-height:1.14}
        .compact-meta{text-align:right}
        .pill{font-size:6.9pt;padding:.9mm 1.4mm;margin:0 .7mm .7mm 0}
        .microlist{font-size:6.9pt;margin-top:1.2mm;padding-top:1mm}
        .grid.area-book .area-detail{display:block;break-before:page;page-break-before:always;min-height:0;padding:2.2mm 2.7mm;margin:0 0 0 0;border-radius:0;border:none;box-shadow:none}
        .grid.area-book .area-detail:first-child{break-before:auto;page-break-before:auto}
        .grid.area-book .area-head{margin-bottom:1.2mm;padding-bottom:1mm;border-bottom:1px solid #cbdced}
        .grid.area-book .symptoms{margin-top:1.2mm}
        .grid.area-book .symptoms-grid{display:block;column-count:2;column-gap:4.3mm;column-fill:auto}
        .grid.area-book .symptom-row{display:inline-block;width:100%;padding:1.35mm 1.6mm;border-radius:6px;margin:0 0 1.1mm;font-size:7.7pt}
        .grid.area-book .symptom-head{font-size:8pt;line-height:1.13}
        .grid.area-book .small{font-size:6.7pt;margin-top:.35mm}
        .grid.area-book .desc{font-size:7.05pt;line-height:1.13;margin-top:.55mm}
      }
    `;
  }

  function buildAreasMarkup(items, opts={}){
    const mode = resolveMode(opts.mode);
    const oblast = String(opts.oblast || '').trim();
    const groups = groupAreas(items);
    const filtered = oblast ? groups.filter(g => g.oblast === oblast) : groups;
    const totalSymptoms = filtered.reduce((s,g)=>s+g.count,0);
    const title = titleOf({ mode, oblast });
    const subtitle = subtitleOf({ mode });
    const gridClass = mode === 'areas' ? 'grid area-overview' : 'grid area-book';
    const cards = mode === 'areas'
      ? filtered.map((g, idx) => `
        <section class="card area-card" data-area-index="${idx+1}">
          <div class="area-head">
            <div>
              <div class="area-kicker">Oblast ${idx+1}</div>
              <div class="area-title">${esc(g.oblast)}</div>
            </div>
            <div class="meta compact-meta">${g.count} simptoma<br>${g.freq} sa frekvencijama<br>${g.mkb} sa MKB-10</div>
          </div>
          <div class="pods">${g.podStats.slice(0,8).map(([name,count])=>`<span class="pill">${esc(name)} · ${count}</span>`).join('')}</div>
          <div class="microlist"><strong>Top podoblasti:</strong> ${g.podStats.slice(0,4).map(([name,count])=>`${esc(name)} (${count})`).join(', ') || '—'}</div>
        </section>`).join('')
      : filtered.map((g, idx) => `
        <section class="card area-detail" data-area-index="${idx+1}">
          <div class="area-head">
            <div>
              <div class="area-kicker">Oblast ${idx+1}</div>
              <div class="area-title">${esc(g.oblast)}</div>
            </div>
            <div class="meta compact-meta">${g.count} simptoma<br>${g.freq} sa frekvencijama<br>${g.mkb} sa MKB-10</div>
          </div>
          <div class="pods">${g.podStats.slice(0,8).map(([name,count])=>`<span class="pill">${esc(name)} · ${count}</span>`).join('')}</div>
          <div class="symptoms">
            <div class="symptoms-grid">${g.symptoms
              .sort((a,b)=>a.simptom.localeCompare(b.simptom,'sr',{sensitivity:'base'}))
              .map((s,idx2)=>`<article class="symptom-row compact-row"><div class="symptom-head"><span class="nr">${idx2+1}.</span> <strong>${esc(s.simptom)}</strong></div><div class="small">${esc(s.podOblast)}${s.mkb10 ? ` • ${esc(s.mkb10)}` : ''}${s.frekCount ? ` • 🎵 ${s.frekCount}` : ''}${s.altCount ? ` • 🌿 ${s.altCount}` : ''}</div>${s.opis ? `<div class="desc">${esc(s.opis)}</div>` : ''}</article>`).join('')}</div>
          </div>
        </section>`).join('');
    return `
      <style>${areaStyles()}</style>
      <div class="page"><div class="sheet"><div class="hero"><section class="card"><div class="title">${esc(title)}</div><div class="muted">${esc(subtitle)}</div></section><section class="card"><div class="hero-meta">${statPill('oblasti', filtered.length)}${statPill('simptoma', totalSymptoms)}${statPill('režim', modeLabelOf({ mode }))}</div></section></div><div class="${gridClass}">${cards || '<section class="card">Nema podataka za prikaz.</section>'}</div></div></div>`;
  }

  function buildAreasHtml(items, opts={}){
    const title = titleOf(opts);
    return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} • Print / Export v${VERSION}</title></head><body>${buildAreasMarkup(items, opts)}</body></html>`;
  }
  function buildAreasTxt(items, opts={}){
    const mode = resolveMode(opts.mode); const oblast = String(opts.oblast || '').trim(); const groups = groupAreas(items); const filtered = oblast ? groups.filter(g=>g.oblast===oblast) : groups;
    const out = [`SINET ${mode === 'areas' ? 'OBLASTI' : 'OBLASTI + SIMPTOMI'}`, `Verzija: ${VERSION}`, ''];
    filtered.forEach((g, idx)=>{
      out.push(`${idx+1}. ${g.oblast}`); out.push(`   Simptoma: ${g.count} | Frekvencije: ${g.freq} | MKB-10: ${g.mkb}`);
      if (mode === 'areas') out.push(`   Podoblasti: ${g.podStats.slice(0,10).map(([n,c])=>`${n} (${c})`).join(', ')}`);
      else g.symptoms.sort((a,b)=>a.simptom.localeCompare(b.simptom,'sr',{sensitivity:'base'})).forEach((s,i)=>out.push(`   ${i+1}. ${s.simptom} — ${s.podOblast}${s.mkb10 ? ' • ' + s.mkb10 : ''}${s.frekCount ? ' • 🎵 ' + s.frekCount : ''}`));
      out.push('');
    });
    return out.join('\n');
  }
  function buildAreasMd(items, opts={}){
    const mode = resolveMode(opts.mode); const oblast = String(opts.oblast || '').trim(); const groups = groupAreas(items); const filtered = oblast ? groups.filter(g=>g.oblast===oblast) : groups;
    const out = [`# SINET ${mode === 'areas' ? 'Oblasti' : 'Oblasti + simptomi'}`, '', `- **Verzija:** ${VERSION}`, `- **Ukupno oblasti:** ${filtered.length}`, `- **Ukupno simptoma:** ${filtered.reduce((s,g)=>s+g.count,0)}`, ''];
    filtered.forEach((g)=>{
      out.push(`## ${g.oblast}`, '', `- **Simptoma:** ${g.count}`, `- **Sa frekvencijama:** ${g.freq}`, `- **Sa MKB-10:** ${g.mkb}`, '');
      if (mode === 'areas') out.push(...g.podStats.slice(0,10).map(([n,c])=>`- ${n} (${c})`), '');
      else out.push(...g.symptoms.sort((a,b)=>a.simptom.localeCompare(b.simptom,'sr',{sensitivity:'base'})).map((s,idx)=>`- **${idx+1}. ${s.simptom}** — ${s.podOblast}${s.mkb10 ? ` • ${s.mkb10}` : ''}${s.frekCount ? ` • 🎵 ${s.frekCount}` : ''}`), '');
    });
    return out.join('\n');
  }
  function download(content, filename, mime){ const blob = new Blob([content], {type:mime||'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(_ ){} }, 1200); }
  function persist(payload){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...(payload||{}), ts: Date.now(), version: VERSION })); } catch(_){} }
  function loadPersisted(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch(_) { return null; } }
  async function resolvePayload(opts={}){
    if (arr(opts.items).length) return { items: normalizeItems(opts.items), mode: resolveMode(opts.mode || 'areas'), oblast: opts.oblast || '' };
    const persisted = loadPersisted();
    if (persisted?.items?.length) return { items: normalizeItems(persisted.items), mode: resolveMode(opts.mode || persisted.mode || 'areas'), oblast: opts.oblast || persisted.oblast || '' };
    const res = await fetch(opts.catalogPath || '../data/SINET_CATALOG.json', { cache:'no-store' });
    const data = await res.json();
    return { items: normalizeItems(data?.items || []), mode: resolveMode(opts.mode || 'areas'), oblast: opts.oblast || '' };
  }
  async function renderPage(opts={}){
    const host = opts.host || document.getElementById('app'); if (!host) return null;
    const payload = await resolvePayload(opts);
    const title = titleOf(payload);
    host.classList.remove('empty');
    host.innerHTML = buildAreasMarkup(payload.items, payload);
    try { document.title = `${title} • Print / Export v${VERSION}`; } catch(_ ){}
    return { ...payload, title, version: VERSION };
  }
  function baseFilename(opts={}){ const suffix = resolveMode(opts.mode) === 'areas' ? 'Oblasti' : (opts.oblast ? `Oblast_${opts.oblast}` : 'Oblasti_i_Simptomi'); return `SINET_${suffix.replace(/[^\p{L}\p{N}._-]+/gu,'_')}`; }
  function openPage(payload={}){ persist(payload); const q = new URLSearchParams(); if (payload.mode) q.set('mode', resolveMode(payload.mode)); if (payload.oblast) q.set('oblast', payload.oblast); q.set('v', VERSION); window.open(`pages/area-print.html?${q.toString()}`, payload.sameWindow ? '_self' : '_blank', 'noopener'); }
  window.SINET_AreaExport = {
    VERSION, normalizeItems, groupAreas, buildAreasHtml, buildAreasTxt, buildAreasMd, persist, loadPersisted, renderPage, openPage, titleOf,
    exportHTML(items, opts={}){ const payload = { items, ...opts }; persist(payload); download(buildAreasHtml(items, opts), `${baseFilename(opts)}.html`, 'text/html;charset=utf-8'); },
    exportTXT(items, opts={}){ const payload = { items, ...opts }; persist(payload); download(buildAreasTxt(items, opts), `${baseFilename(opts)}.txt`, 'text/plain;charset=utf-8'); },
    exportMD(items, opts={}){ const payload = { items, ...opts }; persist(payload); download(buildAreasMd(items, opts), `${baseFilename(opts)}.md`, 'text/markdown;charset=utf-8'); }
  };
})();
