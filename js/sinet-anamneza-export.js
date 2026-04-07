(function(){
  const VERSION = "16.0.0.118.40.7";
  const STORAGE_KEY = 'SINET_ANAMNEZA_EXPORT_PAYLOAD_V1';
  const esc = (v='') => String(v ?? '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  const arr = (v) => Array.isArray(v) ? v : [];
  const text = (v) => String(v ?? '').trim();
  function field(label, value){ const val = text(value); return val ? { label, value: val } : null; }
  function collect(...items){ return items.filter(Boolean); }
  function sectionsForPatient(p={}){
    const o = p.osobni || {};
    const licna = p.licna || {};
    const status = p.status || {};
    return [
      { n:1, title:'Lični podaci', fields: collect(field('Ime', [o.ime, o.prezime].filter(Boolean).join(' ')), field('Nick', o.nick), field('Pol', o.pol), field('Datum rođenja', o.datum_rodjenja), field('Godine', o.godina), field('Telefon', o.telefon), field('E-mail', o.email), field('Adresa', o.adresa)) },
      { n:2, title:'Razlog dolaska', fields: collect(field('Glavni razlog', p.razlog)) },
      { n:3, title:'Porodična anamneza', fields: collect(field('Porodična anamneza', p.porodicna || p.porodična)) },
      { n:4, title:'Lična anamneza', fields: collect(field('Prethodne bolesti', licna.prethodne), field('Hospitalizacije / operacije', licna.hospitalizacije), field('Terapije', licna.terapije), field('Dosadašnje tegobe', licna.dosadasnje), field('Sadašnja bolest', licna.sadasnja)) },
      { n:5, title:'Socijalna / radna / epidemiološka', fields: collect(field('Socijalna anamneza', p.socijalna), field('Radna anamneza', p.radna), field('Epidemiološka anamneza', p.epidemioloska)) },
      { n:6, title:'Funkcije / navike / alergije / lekovi', fields: collect(field('Funkcije', p.funkcije), field('Navike', p.navike), field('Alergije', p.alergije), field('Lekovi', p.lijekovi || p.lekovi)) },
      { n:7, title:'Status praesens', fields: collect(field('Opšti status', status.opci || status.opšti), field('Glava i vrat', status.glava), field('Vrat / grudni koš', status.vratPrsni), field('Srce / ostalo', status.srceOstalo), field('Zaključak', status.zakljucak || status.zaključak)) }
    ].map(sec => ({ ...sec, fields: sec.fields.length ? sec.fields : [field('Napomena', 'Nije popunjeno.')] }));
  }
  function normalizeRecords(records){ return arr(records).map((p, idx)=>({ idx: idx+1, patient: p || {}, sections: sectionsForPatient(p || {}) })); }
  function buildHtml(records){
    const items = normalizeRecords(records);
    const cards = items.map(({idx, patient, sections}) => {
      const o = patient.osobni || {}; const head = [o.ime, o.prezime].filter(Boolean).join(' ') || `Pacijent ${idx}`;
      return `<section class="card patient"><div class="patient-head"><div><div class="patient-title">${idx}. ${esc(head)}</div><div class="muted">${esc(o.nick || '')}${o.pol ? ` • ${esc(o.pol)}` : ''}${o.datum_rodjenja ? ` • ${esc(o.datum_rodjenja)}` : ''}</div></div></div><div class="section-grid">${sections.map(sec => `<div class="section"><div class="section-title">${sec.n}. ${esc(sec.title)}</div>${sec.fields.map(f => `<div class="row"><div class="label">${esc(f.label)}</div><div class="value">${esc(f.value)}</div></div>`).join('')}</div>`).join('')}</div></section>`;
    }).join('');
    return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SINET Anamneza • Print / Export</title><style>
      :root{--bg:#f7fbff;--card:#fff;--line:#d9e7f5;--ink:#14324a;--muted:#5f7288;--soft:#eef6ff}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--ink)}
      .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}.actions{display:flex;gap:8px;flex-wrap:wrap}button,a.btn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 12px;cursor:pointer;text-decoration:none;color:var(--ink);font-weight:700}
      .page{max-width:1500px;margin:0 auto;padding:14px}.sheet{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 6px 24px rgba(20,50,74,.08)}.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin-bottom:12px}.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;break-inside:avoid;page-break-inside:avoid}.title{font-size:28px;font-weight:800;line-height:1.1;margin:0 0 8px 0}.muted{color:var(--muted)}
      .patient{margin-bottom:12px}.patient-title{font-size:20px;font-weight:800}.section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.section{border:1px solid var(--line);border-radius:12px;padding:10px;background:#fcfeff;break-inside:avoid;page-break-inside:avoid}.section-title{font-weight:800;color:#0f3d66;margin-bottom:8px}.row{display:grid;grid-template-columns:150px 1fr;gap:10px;padding:4px 0;border-top:1px dashed #e1ebf5}.row:first-child{border-top:none;padding-top:0}.label{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}.value{font-size:14px;line-height:1.45}
      @media (max-width:1000px){.hero,.section-grid{grid-template-columns:1fr}.title{font-size:24px}}
      @page{size:A4 landscape;margin:8mm}@media print{body{background:#fff;font-size:10pt}.topbar{display:none}.page{max-width:none;padding:0}.sheet{border:none;box-shadow:none;border-radius:0;padding:0}.hero{grid-template-columns:1.5fr 1fr;gap:4mm;margin-bottom:4mm}.title{font-size:18pt}.patient{margin-bottom:4mm}.patient-title{font-size:13pt}.section-grid{gap:2.5mm}.section{padding:2.2mm 2.5mm;border-radius:8px}.section-title{font-size:10pt}.row{grid-template-columns:34mm 1fr;gap:2mm;padding:1mm 0}.label{font-size:7.7pt}.value{font-size:8.7pt;line-height:1.22}}
    </style></head><body><div class="topbar"><div><div style="font-weight:800;">SINET Anamneza • Print / Export</div><div class="muted">v${VERSION} • jasan redosled 1–7</div></div><div class="actions"><button onclick="window.print()">🖨️ Štampaj</button></div></div><div class="page"><div class="sheet"><div class="hero"><section class="card"><div class="title">SINET Anamneza</div><div class="muted">Numerisan, nedvosmislen redosled 1 → 7 za pregled, štampu i izvoz.</div></section><section class="card"><div class="muted"><strong>Ukupno zapisa:</strong> ${items.length}<br><strong>Format:</strong> A4 landscape • print/export</div></section></div>${cards || '<section class="card">Nema anamneza za prikaz.</section>'}</div></div></body></html>`;
  }
  function buildTxt(records){
    const items = normalizeRecords(records); const out = ['SINET ANAMNEZA', `Verzija: ${VERSION}`, ''];
    items.forEach(({idx, patient, sections})=>{ const o = patient.osobni || {}; out.push(`${idx}. ${(o.ime||'') + (o.prezime? ' '+o.prezime:'') || `Pacijent ${idx}`}`); sections.forEach(sec=>{ out.push(`  ${sec.n}. ${sec.title}`); sec.fields.forEach(f=>out.push(`     - ${f.label}: ${f.value}`)); }); out.push(''); });
    return out.join('\n');
  }
  function buildMd(records){
    const items = normalizeRecords(records); const out = ['# SINET Anamneza', '', `- **Verzija:** ${VERSION}`, `- **Ukupno zapisa:** ${items.length}`, ''];
    items.forEach(({idx, patient, sections})=>{ const o = patient.osobni || {}; out.push(`## ${idx}. ${(o.ime||'') + (o.prezime? ' '+o.prezime:'') || `Pacijent ${idx}`}`, ''); sections.forEach(sec=>{ out.push(`### ${sec.n}. ${sec.title}`); sec.fields.forEach(f=>out.push(`- **${f.label}:** ${f.value}`)); out.push(''); }); });
    return out.join('\n');
  }
  function download(content, filename, mime){ const blob = new Blob([content], {type:mime||'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(_){} }, 1200); }
  function persist(records){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: arr(records), ts: Date.now(), version: VERSION })); } catch(_){} }
  function loadPersisted(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch(_) { return null; } }
  async function resolveRecords(opts={}){ if (arr(opts.records).length) return arr(opts.records); const persisted = loadPersisted(); if (persisted?.records?.length) return persisted.records; try { const res = await fetch(opts.dataPath || '../data/anamneza.json', { cache:'no-store' }); const data = await res.json(); return arr(data); } catch(_) { return []; } }
  async function renderPage(opts={}){ const host = opts.host || document.getElementById('app'); if (!host) return []; const records = await resolveRecords(opts); host.innerHTML = buildHtml(records).replace(/^[\s\S]*<body>/i,'').replace(/<\/body>[\s\S]*$/i,''); return records; }
  function openPage(records, opts={}){ persist(records); const q = new URLSearchParams(); q.set('v', VERSION); if (opts.autoprint) q.set('autoprint', '1'); const url = `pages/anamneza-print.html?${q.toString()}`; window.open(url, opts.sameWindow ? '_self' : '_blank', 'noopener'); }
  window.SINET_AnamnezaExport = { VERSION, buildHtml, buildTxt, buildMd, persist, loadPersisted, renderPage, openPage, exportHTML(records){ persist(records); download(buildHtml(records), 'SINET_Anamneza.html', 'text/html;charset=utf-8'); }, exportTXT(records){ persist(records); download(buildTxt(records), 'SINET_Anamneza.txt', 'text/plain;charset=utf-8'); }, exportMD(records){ persist(records); download(buildMd(records), 'SINET_Anamneza.md', 'text/markdown;charset=utf-8'); } };
})();
