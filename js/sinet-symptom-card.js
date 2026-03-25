(function(){
  const VERSION = "16.0.0.118.40";
  const STORAGE_KEY = 'SINET_SYMPTOM_CARD_PAYLOAD_V1';
  const esc = (v='') => String(v ?? '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  const arr = (v) => Array.isArray(v) ? v : [];
  const textOf = (...vals) => vals.find(v => String(v ?? '').trim()) || '';

  function mkbObj(item) {
    const raw = item?.mkb10_obj || item?.mkb10 || {};
    if (typeof raw === 'string') return { sifra: raw, naziv: '' };
    return raw || {};
  }

  function formatRecommendation(rec){
    if (!rec) return 'Nema posebne preporuke.';
    if (typeof rec === 'string') return rec;
    if (typeof rec !== 'object') return String(rec);
    const opis = textOf(rec.opis, rec.summary, rec.desc);
    const traj = Number(rec.trajanje_po_frekv_min ?? rec.trajanjePoFrekvencijiMin ?? rec.segment_min ?? 0) || 0;
    const loop = Number(rec.loop_uzastopno ?? rec.loop ?? 0) || 0;
    const dana = Number(rec.dnevno_dana ?? rec.dani ?? 0) || 0;
    const pauza = Number(rec.pauza_dana ?? rec.pauza ?? 0) || 0;
    const segment = Number(rec.segment_min ?? 0) || 0;
    const parts = [];
    if (opis) parts.push(opis);
    else {
      if (traj) parts.push(`Trajanje po frekvenciji: ${traj} min.`);
      if (loop) parts.push(`Uzastopni prolazi: ${loop}.`);
      if (dana) parts.push(`Dnevni ritam: ${dana} dana rada.`);
      if (pauza || pauza === 0) parts.push(`Pauza: ${pauza} dana po potrebi.`);
      if (segment) parts.push(`Ukupan segment: ${segment} min.`);
    }
    return parts.join(' ') || 'Nema posebne preporuke.';
  }

  function formatShortlist(list){
    return arr(list).map(x => {
      if (!x) return '';
      if (typeof x === 'string') return x;
      const sifra = textOf(x.sifra, x.code);
      const naziv = textOf(x.naziv, x.title, x.opis);
      const simptom = textOf(x.simptom, x.label);
      const score = Number(x.score || 0);
      const parts = [];
      if (sifra) parts.push(sifra);
      if (naziv) parts.push(naziv);
      if (simptom) parts.push(`najbliže: ${simptom}`);
      if (score) parts.push(`score ${score.toFixed(2)}`);
      return parts.join(' — ');
    }).filter(Boolean);
  }

  function normalizeItem(item={}) {
    const out = JSON.parse(JSON.stringify(item || {}));
    out.id = String(out.id || out.uid || '').trim();
    out.simptom = textOf(out.simptom, out.naziv, out.name, out.id);
    out.oblast = textOf(out.oblast, out.kategorija, out._area, 'Ostalo');
    out.podOblast = textOf(out.podOblast, out.podoblast, out.subarea, out._subarea, 'Opšti prikaz');
    out.opis = textOf(out.opis, out.description, out.desc, out._desc, 'Opis nije popunjen.');
    out.preporuka = formatRecommendation(out.preporuka || out.recommendation);
    out.mkb10_obj = mkbObj(out);
    out.mkb10_shortlist_text = formatShortlist(out.mkb10_shortlist);
    out.frekvencije = arr(out.frekvencije || out._freqs).map((f, idx) => ({
      hz: Number(f?.hz ?? f?.value ?? f?.freq) || 0,
      value: Number(f?.value ?? f?.hz ?? f?.freq) || 0,
      naziv: textOf(f?.naziv, f?.name, ((Number(f?.hz ?? f?.value ?? f?.freq) || 0) ? `${Number(f?.hz ?? f?.value ?? f?.freq)} Hz` : `Frekvencija ${idx+1}`)),
      opis: textOf(f?.opis, f?.desc, f?.funkcija, f?.svrha, ''),
      funkcija: textOf(f?.funkcija, f?.svrha, f?.desc, ''),
      trajanje_min: Number(f?.trajanje_min ?? f?.duration_min) || Number(out.trajanjePoFrekvencijiMin) || 0,
      enabled: f?.enabled !== false
    }));
    out.alternativne_metode = arr(out.alternativne_metode || out.alternative_methods || out._stl?.alternativne_metode).map((a, idx) => ({
      id: textOf(a?.id, `alt-${idx+1}`),
      naziv: textOf(a?.naziv, a?.name, a?.id, `Metoda ${idx+1}`),
      kategorija: textOf(a?.kategorija, a?.category, ''),
      evidenceTier: textOf(a?.evidenceTier, a?.evidence, ''),
      opis: textOf(a?.opis, a?.summary, a?.desc, '')
    }));
    const hol = out.holisticki || out.holistika || {};
    out.holisticki = {
      opis: textOf(hol?.opis, out?._stl?.holisticki_opis, ''),
      psihosomatika: hol?.psihosomatika || {},
      afirmacija: hol?.afirmacija || out?._stl?.afirmacija || {},
      duhovnost: hol?.duhovnost || hol?.molitva || {}
    };
    out.red_flags = arr(out.red_flags || out.redFlags);
    out.warnings = arr(out.warnings);
    out.sekundarneOblasti = arr(out.sekundarneOblasti || out.sekundarne_oblasti);
    out.trajanjePoFrekvencijiMin = Number(out.trajanjePoFrekvencijiMin || out?.preporuka?.trajanje_po_frekv_min || 0) || (out.frekvencije[0]?.trajanje_min || 0);
    return out;
  }

  function filenameBase(item){
    const name = String(item?.simptom || item?.naziv || item?.id || 'simptom').replace(/[^\p{L}\p{N}._-]+/gu,'_').replace(/^_+|_+$/g,'');
    return `SINET_Simptom_${name || 'kartica'}`;
  }

  function badges(values){ return arr(values).map(v => `<span class="badge">${esc(v)}</span>`).join(''); }
  function mkbChapterLabel(item, mkb){
    const chapter = textOf(item.mkb10_primary_chapter, item.mkb10Chapter, '');
    if (chapter) return chapter;
    const code = textOf(mkb?.sifra, item.mkb10, '');
    return code ? code.charAt(0).toUpperCase() : '—';
  }

  function buildHtml(item){
    item = normalizeItem(item);
    const mkb = mkbObj(item);
    const hol = item.holisticki || {};
    const freqs = arr(item.frekvencije);
    const alts = arr(item.alternativne_metode);
    const sec = arr(item.sekundarneOblasti);
    const rf = arr(item.red_flags);
    const warns = arr(item.warnings);
    const shortlist = arr(item.mkb10_shortlist_text);
    const title = `${item.simptom} — SINET kartica simptoma`;
    return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>
      :root{--bg:#f7fbff;--card:#ffffff;--line:#d9e7f5;--ink:#14324a;--muted:#5f7288;--soft:#eef6ff;--ok:#edf8f0;--warn:#fff7e8}
      *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--ink)}
      .topbar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
      .brand{font-weight:800}.muted{color:var(--muted)}.actions{display:flex;gap:8px;flex-wrap:wrap}
      button,a.btn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 12px;cursor:pointer;text-decoration:none;color:var(--ink);font-weight:700}
      .page{padding:14px;max-width:1500px;margin:0 auto}.sheet{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 6px 24px rgba(20,50,74,.08)}
      .header{display:grid;grid-template-columns:1.55fr 1fr;gap:12px;margin-bottom:12px}.title{font-size:30px;line-height:1.12;font-weight:800;margin:0 0 8px 0}
      .meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.meta-chip{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
      .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px;font-weight:700}.value{font-size:14px;font-weight:700}
      .screen-cols{display:grid;grid-template-columns:1.02fr 1.15fr 1.15fr;gap:12px;align-items:start}.block{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}.block h3{margin:0 0 8px 0;font-size:16px}
      .list{display:grid;gap:8px}.item{padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:#fcfeff;break-inside:avoid;page-break-inside:avoid}.hz{font-weight:800}.small{font-size:12px;color:var(--muted)}
      .badge{display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:var(--soft);font-size:12px;font-weight:700;margin:0 6px 6px 0}.empty{color:var(--muted);font-style:italic}.footer{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .ok{background:var(--ok)}.warn{background:var(--warn)} .compact-text{line-height:1.45}.print-flow{display:contents}
      @media (max-width:1080px){.header,.screen-cols,.footer{grid-template-columns:1fr}.title{font-size:24px}.meta-grid{grid-template-columns:1fr}}
      @page{size:A4 landscape;margin:7mm}
      @media print{
        body{background:#fff;font-size:10pt;color:#1d2d3a}.topbar{display:none}.page{padding:0;max-width:none}.sheet{border:none;box-shadow:none;border-radius:0;padding:0}
        .header{grid-template-columns:1.45fr 1fr;gap:4mm;margin-bottom:4mm}.title{font-size:18pt;margin-bottom:2mm}.muted{font-size:9pt}
        .meta-grid{gap:1.8mm}.meta-chip{padding:2.2mm 2.6mm;border-radius:8px}.label{font-size:8pt;margin-bottom:1mm}.value{font-size:9.4pt}
        .screen-cols{display:block}.print-flow{display:block;column-count:2;column-gap:5mm;column-fill:auto}
        .block{display:inline-block;width:100%;padding:2.3mm 2.6mm;margin:0 0 3mm;border-radius:8px;border:1px solid #bcd1e4}
        .block h3{font-size:10pt;margin:0 0 1.6mm}.list{display:block}.item{padding:1.9mm 2mm;border-radius:7px;margin:0 0 1.8mm}.small{font-size:8pt}.badge{font-size:8pt;padding:1mm 1.8mm;margin:0 .9mm .9mm 0}
        .compact-text{line-height:1.22}.footer{display:block}.footer .block{display:inline-block;width:100%}
      }
    </style></head><body>
    <div class="topbar"><div><div class="brand">SINET Print kartica simptoma</div><div class="muted">v${VERSION} • A4 landscape • optimizovano za 2 kolone</div></div><div class="actions"><button onclick="window.print()">🖨️ Štampaj</button></div></div>
    <div class="page"><div class="sheet">
      <div class="header"><section class="block"><div class="title">${esc(item.simptom)}</div><div class="muted" style="margin-bottom:10px;">Print/export kartica simptoma • SINET Audio Lekar v${VERSION}</div><div class="meta-grid"><div class="meta-chip"><div class="label">ID</div><div class="value">${esc(item.id || '—')}</div></div><div class="meta-chip"><div class="label">Primarna oblast</div><div class="value">${esc(item.oblast)}</div></div><div class="meta-chip"><div class="label">Podoblast</div><div class="value">${esc(item.podOblast)}</div></div><div class="meta-chip"><div class="label">MKB-10</div><div class="value">${esc(mkb.sifra || item.mkb10 || 'NONE')} ${mkb.naziv ? '— ' + esc(mkb.naziv) : ''}</div></div></div>${sec.length ? `<div style="margin-top:10px;"><div class="label">Sekundarne oblasti</div>${badges(sec)}</div>` : ''}</section><section class="block"><h3>Brzi pregled</h3><div class="list compact-text"><div class="item"><div class="label">Opis simptoma</div><div>${esc(item.opis)}</div></div><div class="item"><div class="label">Preporuka</div><div>${esc(item.preporuka)}</div></div><div class="item"><div class="label">Trajanje po frekvenciji</div><div>${esc(item.trajanjePoFrekvencijiMin || '—')} min</div></div><div class="item"><div class="label">Broj frekvencija</div><div>${freqs.length}</div></div><div class="item"><div class="label">Alternativne metode</div><div>${alts.length}</div></div></div></section></div>
      <div class="screen-cols print-flow"><div>
        <section class="block"><h3>MKB-10 i klasifikacija</h3><div class="item"><div class="label">Primarni kod</div><div>${esc(mkb.sifra || item.mkb10 || 'NONE')}</div></div><div class="item" style="margin-top:8px;"><div class="label">Naziv</div><div>${esc(mkb.naziv || 'Nema formalnog ICD naziva / podrška')}</div></div><div class="item" style="margin-top:8px;"><div class="label">Poglavlje</div><div>${esc(mkbChapterLabel(item, mkb))}</div></div><div class="item" style="margin-top:8px;"><div class="label">Shortlist</div><div class="compact-text">${shortlist.length ? shortlist.map(x => esc(x)).join('<br>') : '—'}</div></div></section>
        <section class="block"><h3>Holistički pristup</h3><div class="compact-text">${esc(hol.opis || '—')}</div><div class="small" style="margin-top:8px;">Afirmacija: ${esc(hol.afirmacija?.tekst || '—')}</div><div class="small" style="margin-top:6px;">Duhovnost: ${esc(hol.duhovnost?.tekst || hol.duhovnost?.opis || '—')}</div></section></div>
        <div><section class="block"><h3>Detaljni opis</h3><div class="compact-text">${esc(item.opis)}</div></section><section class="block"><h3>Alternative i pomoćne metode</h3>${alts.length ? `<div class="list">${alts.map(a => `<div class="item"><div style="font-weight:800;">${esc(a.naziv || a.id || 'Metoda')}</div><div class="small">${esc(a.kategorija || '')}${a.evidenceTier ? ` • evidence ${esc(a.evidenceTier)}` : ''}</div><div class="compact-text" style="margin-top:6px;">${esc(a.opis || '')}</div></div>`).join('')}</div>` : `<div class="empty">Nema popunjenih alternativnih metoda.</div>`}</section></div>
        <div><section class="block"><h3>Frekvencije sa opisima</h3>${freqs.length ? `<div class="list">${freqs.map(f => `<div class="item"><div class="hz">${esc(f.naziv || ((f.hz || f.value) ? `${f.hz || f.value} Hz` : 'Frekvencija'))}</div><div class="small">${esc(f.funkcija || 'Podrška / informativna frekvencija')} • ${esc(f.trajanje_min || item.trajanjePoFrekvencijiMin || '—')} min</div><div class="compact-text" style="margin-top:6px;">${esc(f.opis || '')}</div></div>`).join('')}</div>` : `<div class="empty">Nema frekvencija.</div>`}</section></div>
      </div>
      <div class="footer"><section class="block warn"><h3>Red flags</h3>${rf.length ? badges(rf) : '<div class="empty">Nema posebnih red flags unosa.</div>'}</section><section class="block ok"><h3>Warnings / napomene</h3>${warns.length ? badges(warns) : '<div class="empty">Nema dodatnih warnings unosa.</div>'}</section></div>
    </div></div></body></html>`;
  }

  function buildTxt(item){
    item = normalizeItem(item);
    const mkb = mkbObj(item);
    const freqs = arr(item.frekvencije);
    const alts = arr(item.alternativne_metode);
    const hol = item.holisticki || {};
    return [
      'SINET KARTICA SIMPTOMA',
      `Verzija: ${VERSION}`,
      '',
      `Naziv: ${item.simptom}`,
      `ID: ${item.id || '—'}`,
      `Oblast: ${item.oblast}`,
      `Podoblast: ${item.podOblast}`,
      `MKB-10: ${mkb.sifra || item.mkb10 || 'NONE'}${mkb.naziv ? ' — ' + mkb.naziv : ''}`,
      item.sekundarneOblasti?.length ? `Sekundarne oblasti: ${item.sekundarneOblasti.join(', ')}` : '',
      '',
      'OPIS', item.opis, '',
      'PREPORUKA', item.preporuka, '',
      'HOLISTIČKI PRISTUP', hol.opis || '—', hol.afirmacija?.tekst ? `Afirmacija: ${hol.afirmacija.tekst}` : '', hol.duhovnost?.tekst ? `Duhovnost: ${hol.duhovnost.tekst}` : '', '',
      'FREKVENCIJE', ...(freqs.length ? freqs.map((f, idx) => `${idx+1}. ${f.naziv || ((f.hz || f.value) ? `${f.hz || f.value} Hz` : 'Frekvencija')} — ${f.opis || f.funkcija || 'bez opisa'} (${f.trajanje_min || item.trajanjePoFrekvencijiMin || '—'} min)`) : ['Nema frekvencija.']), '',
      'ALTERNATIVE / POMOĆNE METODE', ...(alts.length ? alts.map((a, idx) => `${idx+1}. ${a.naziv || a.id} — ${a.opis || 'bez opisa'}`) : ['Nema alternativnih metoda.']), '',
      'RED FLAGS', ...(item.red_flags?.length ? item.red_flags : ['Nema posebnih red flags unosa.']), '',
      'WARNINGS', ...(item.warnings?.length ? item.warnings : ['Nema dodatnih warnings unosa.'])
    ].filter(v => String(v ?? '') !== '').join('\n');
  }

  function buildMd(item){
    item = normalizeItem(item);
    const mkb = mkbObj(item);
    const freqs = arr(item.frekvencije);
    const alts = arr(item.alternativne_metode);
    const hol = item.holisticki || {};
    return [
      `# ${item.simptom}`,'',`- **ID:** ${item.id || '—'}`,`- **Oblast:** ${item.oblast}`,`- **Podoblast:** ${item.podOblast}`,
      `- **MKB-10:** ${mkb.sifra || item.mkb10 || 'NONE'}${mkb.naziv ? ' — ' + mkb.naziv : ''}`,
      item.sekundarneOblasti?.length ? `- **Sekundarne oblasti:** ${item.sekundarneOblasti.join(', ')}` : '',
      '','## Opis', item.opis,'','## Preporuka', item.preporuka,'','## Holistički pristup', hol.opis || '—',
      hol.afirmacija?.tekst ? `\n**Afirmacija:** ${hol.afirmacija.tekst}` : '', hol.duhovnost?.tekst ? `\n**Duhovnost:** ${hol.duhovnost.tekst}` : '',
      '','## Frekvencije', ...(freqs.length ? freqs.map((f, idx) => `- **${idx+1}. ${f.naziv || ((f.hz || f.value) ? `${f.hz || f.value} Hz` : 'Frekvencija')}** — ${f.opis || f.funkcija || 'bez opisa'} _(${f.trajanje_min || item.trajanjePoFrekvencijiMin || '—'} min)_`) : ['- Nema frekvencija.']),
      '','## Alternative / pomoćne metode', ...(alts.length ? alts.map((a, idx) => `- **${idx+1}. ${a.naziv || a.id}** — ${a.opis || 'bez opisa'}`) : ['- Nema alternativnih metoda.']),
      '','## Red flags', ...(item.red_flags?.length ? item.red_flags.map(v => `- ${v}`) : ['- Nema posebnih red flags unosa.']),
      '','## Warnings', ...(item.warnings?.length ? item.warnings.map(v => `- ${v}`) : ['- Nema dodatnih warnings unosa.']),
      '', `_SINET kartica simptoma • verzija ${VERSION}_`
    ].filter(v => String(v ?? '') !== '').join('\n');
  }

  function download(content, filename, mime){
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch(_) {} }, 1500);
  }
  function persist(item){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ item: normalizeItem(item), ts: Date.now(), version: VERSION })); } catch(_) {} }
  function loadPersisted(){ try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; const obj = JSON.parse(raw); return obj?.item ? normalizeItem(obj.item) : null; } catch(_) { return null; } }
  function readFromCatalog(id, catalogPath){
    if (!id) return Promise.resolve(null);
    return fetch(catalogPath || 'data/SINET_CATALOG.json', { cache:'no-store' }).then(r => r.json()).then(data => {
      const items = Array.isArray(data?.items) ? data.items : []; const found = items.find(x => String(x?.id || '') === String(id || ''));
      return found ? normalizeItem(found) : null;
    }).catch(() => null);
  }
  async function resolveItem(opts={}){ const direct = opts.item ? normalizeItem(opts.item) : null; if (direct?.id || direct?.simptom) return direct; const persisted = loadPersisted(); if (persisted && (!opts.id || String(persisted.id||'') === String(opts.id||''))) return persisted; return await readFromCatalog(opts.id, opts.catalogPath); }
  function buildEmbeddedPageContent(item){
    const html = buildHtml(item);
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const inner = doc.querySelector('.page .sheet');
      if (inner) return inner.innerHTML;
    } catch(_) {}
    return html.replace(/^[\s\S]*<body>/i,'').replace(/<\/body>[\s\S]*$/i,'');
  }
  async function renderPage(opts={}){
    const host = opts.host || document.getElementById('app'); if (!host) return null; const item = await resolveItem(opts);
    if (!item) { host.innerHTML = '<div class="empty">Greška pri učitavanju kartice: simptom nije pronađen.</div>'; return null; }
    host.innerHTML = buildEmbeddedPageContent(item);
    try { const titleEl = document.querySelector('title'); if (titleEl) titleEl.textContent = `${item.simptom} — SINET kartica simptoma`; } catch(_) {}
    return item;
  }
  window.SINET_SymptomCard = {
    VERSION, normalizeItem, buildHtml, buildTxt, buildMd, persist, loadPersisted,
    async openPrint(item, opts={}){ item = normalizeItem(item); persist(item); const url = (opts.pagePath || 'pages/symptom-print-card.html') + `?id=${encodeURIComponent(item.id || '')}&v=${VERSION}${opts.autoprint ? '&autoprint=1' : ''}`; const target = opts.sameWindow ? '_self' : '_blank'; window.open(url, target, 'noopener'); },
    exportHTML(item){ item = normalizeItem(item); persist(item); download(buildHtml(item), `${filenameBase(item)}.html`, 'text/html;charset=utf-8'); },
    exportTXT(item){ item = normalizeItem(item); persist(item); download(buildTxt(item), `${filenameBase(item)}.txt`, 'text/plain;charset=utf-8'); },
    exportMD(item){ item = normalizeItem(item); persist(item); download(buildMd(item), `${filenameBase(item)}.md`, 'text/markdown;charset=utf-8'); },
    renderPage, resolveItem
  };
})();
