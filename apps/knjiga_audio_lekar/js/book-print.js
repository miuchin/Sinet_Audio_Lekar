import { loadManifest, loadTocIndex, loadMasterIndex, loadAreaChunk, formatInt, getQueryParams, escapeHtml, pickAreas } from './book-data.js';

const VERSION = 'v0.3.8';
const params = getQueryParams();
const mode = params.get('mode') || 'master-book';
const requestedArea = params.get('area') || '';
const state = {
  manifest:null,
  toc:null,
  tocRows:[],
  runtimeText:'',
  runtimeMd:'',
  exportCode:'',
  scopeLabel:'',
  generatedAtDisplay:'',
  generatedAtFile:'',
  renderId:'',
};

const modeLabelMap = {
  'areas': 'Atlas oblasti',
  'area-symptoms': 'Oblasti + Simptomi',
  'area-symptoms-freqs': 'Oblasti + Simptomi + Frekvencije',
  'master-book': 'Master HTML knjiga',
  'master-book-freqs': 'Master HTML knjiga + frekvencije',
  'single-area': 'Jedna oblast',
  'toc-preview': 'TOC pregled'
};

const exportCodeMap = {
  'areas': 'ATL',
  'master-book': 'MHT',
  'master-book-freqs': 'MHF',
  'single-area': 'JOB',
  'toc-preview': 'TOC'
};

function areaLink(areaName){
  return `book-print.html?mode=single-area&area=${encodeURIComponent(areaName)}`;
}

function escapeAttr(value){
  return escapeHtml(String(value ?? '')).replace(/"/g, '&quot;');
}

function pad(num){
  return String(num).padStart(2, '0');
}

function makeGeneratedAt(){
  const now = new Date();
  const display = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}. ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const file = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return { display, file };
}


function makeRenderId(fileStamp){
  return `R-${fileStamp}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
}

function slugify(value){
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'opseg';
}

function resolveScopeLabel(canonicalMode, areas){
  if(canonicalMode === 'single-area'){
    const area = areas[0];
    return `Jedna oblast — ${area?.naziv || requestedArea || 'nepoznata oblast'}`;
  }
  if(canonicalMode === 'toc-preview') return 'Sadržaj / TOC pregled svih oblasti';
  if(canonicalMode === 'areas') return 'Atlas oblasti — sve oblasti';
  if(canonicalMode === 'master-book') return requestedArea ? `Master HTML knjiga — ${requestedArea}` : 'Master HTML knjiga — sve oblasti';
  if(canonicalMode === 'master-book-freqs') return requestedArea ? `Master HTML knjiga + frekvencije — ${requestedArea}` : 'Master HTML knjiga + frekvencije — sve oblasti';
  return modeLabelMap[canonicalMode] || canonicalMode;
}

function formatMkbValue(value){
  if(value == null || value === '') return 'bez MKB-10';
  if(typeof value === 'object'){
    const code = value.sifra || value.code || '';
    const name = value.naziv || value.name || '';
    return [code, name].filter(Boolean).join(' — ') || 'bez MKB-10';
  }
  const raw = String(value).trim();
  if(!raw) return 'bez MKB-10';
  const codeMatch = raw.match(/[A-Z][0-9]{2}(?:\.[0-9A-Z]+)?/);
  const nameMatch = raw.match(/(?:'naziv'|"naziv"|naziv)\s*:\s*['"]([^'"]+)['"]/i);
  if(codeMatch || nameMatch){
    return [codeMatch?.[0], nameMatch?.[1]].filter(Boolean).join(' — ');
  }
  return raw;
}

function symptomRow(symptom, index, withFreqs = false){
  const metaBits = [symptom.podOblast || symptom.oblast, formatMkbValue(symptom.mkb10)];
  if(symptom.freq_count) metaBits.push(`🎵 ${symptom.freq_count}`);
  if(symptom.alternative_count) metaBits.push(`🌿 ${symptom.alternative_count}`);
  const freqList = withFreqs && symptom.freqs?.length ? `
    <div class="freq-list">
      ${symptom.freqs.map(freq => `
        <div class="freq-item">
          <strong>${escapeHtml(freq.naziv || (freq.hz ? `${freq.hz} Hz` : 'Frekvencija'))}</strong>
          ${freq.trajanje_min ? ` • ${escapeHtml(String(freq.trajanje_min))} min` : ''}
          ${freq.opis ? `<br>${escapeHtml(freq.opis)}` : ''}
        </div>`).join('')}
    </div>` : '';
  return `
    <article class="symptom-row">
      <div class="symptom-head"><span class="nr">${index}.</span> <strong>${escapeHtml(symptom.simptom)}</strong></div>
      <div class="symptom-meta">${metaBits.map(escapeHtml).join(' • ')}</div>
      ${symptom.opis ? `<div class="symptom-desc">${escapeHtml(symptom.opis)}</div>` : ''}
      ${freqList}
    </article>`;
}

function areaCard(area){
  const pods = (area.podoblasti || []).slice(0,8).map(p=>`<span class="pill">${escapeHtml(p.naziv)} · ${formatInt(p.count)}</span>`).join('');
  const href = areaLink(area.naziv);
  return `
    <article class="area-card">
      <h3 class="area-title"><a class="area-link" href="${href}">${String(area.order).padStart(2,'0')}. ${escapeHtml(area.naziv)}</a></h3>
      <div class="area-meta">${formatInt(area.symptom_count)} simptoma • ${formatInt(area.freq_covered)} sa frekvencijama • ${formatInt(area.mkb_covered)} sa MKB-10</div>
      <div class="pills">${pods || '<span class="pill">Bez podoblasti</span>'}</div>
      <div class="area-actions"><a class="mini-btn" href="${href}">📖 Otvori oblast</a></div>
    </article>`;
}

function exportMetaStrip(){
  return `<div class="export-meta-strip"><strong>SKAL • ${escapeHtml(VERSION)} • ${escapeHtml(state.exportCode)}</strong><span>${escapeHtml(state.scopeLabel)}</span><span>${escapeHtml(state.generatedAtDisplay)}</span><span>${escapeHtml(state.renderId)}</span></div>`;
}

function footerMetaLine(){
  return `SKAL • ${VERSION} • ${state.exportCode} • ${state.scopeLabel} • ${state.generatedAtDisplay} • ${state.renderId}`;
}


function areaHeroCompact(area, firstPage = true){
  const pods = (area.podoblasti || []).slice(0,12).map(p=>`<span class="pod-chip">${escapeHtml(p.naziv)} · ${formatInt(p.count)}</span>`).join('');
  if(firstPage){
    return `
      <div class="area-hero compact print-pack">
        <div>
          <div class="area-order">Oblast ${String(area.order).padStart(2,'0')}</div>
          <h2 class="area-heading">${escapeHtml(area.naziv)}</h2>
          <div class="pod-grid stable-two-col" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8mm 1.2mm;">${pods || '<span class="pod-chip">Bez podoblasti</span>'}</div>
        </div>
        <div class="area-summary-card compact">
          <div class="area-summary"><strong>${formatInt(area.symptom_count)}</strong> simptoma</div>
          <div class="area-summary"><strong>${formatInt(area.freq_covered)}</strong> sa frekvencijama</div>
          <div class="area-summary"><strong>${formatInt(area.mkb_covered)}</strong> sa MKB-10</div>
        </div>
      </div>`;
  }
  return `
      <div class="area-hero compact continuation print-pack">
        <div>
          <div class="area-order">Nastavak oblasti ${String(area.order).padStart(2,'0')}</div>
          <h2 class="area-heading">${escapeHtml(area.naziv)}</h2>
        </div>
        <div class="area-summary-card compact continuation">
          <div class="area-summary"><strong>${formatInt(area.symptom_count)}</strong> simptoma ukupno</div>
          <div class="area-summary">Strana nastavlja listu simptoma</div>
        </div>
      </div>`;
}

function areaDetailPageShell(area, firstChunk = false, withFreqs = false){
  const section = document.createElement('section');
  section.className = 'page area-detail single-area-page';
  const inner = document.createElement('div');
  inner.className = 'page-inner area-measure';
  inner.dataset.area = area.naziv;
  inner.innerHTML = `${exportMetaStrip()}${areaHeroCompact(area, firstChunk)}<div class="symptoms three-col stable-two-col" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.42mm 2mm;align-content:start;"></div>`;
  section.appendChild(inner);
  return section;
}

function createHiddenMeasureHost(){
  let host = document.getElementById('jobMeasureHost');
  if(host) return host;
  host = document.createElement('div');
  host.id = 'jobMeasureHost';
  host.className = 'hidden-measure';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  return host;
}

function measureSingleAreaPageChunks(area, withFreqs = false){
  const symptoms = Array.isArray(area.symptoms) ? area.symptoms : [];
  if(!symptoms.length) return [[]];

  const host = createHiddenMeasureHost();
  host.innerHTML = '';
  const pages = [];
  let pageRows = [];
  let pageStartIndex = 0;
  let pageIndex = 0;

  const openMeasuredPage = () => {
    const shell = areaDetailPageShell(area, pageIndex === 0, withFreqs);
    shell.style.boxShadow = 'none';
    shell.style.margin = '0';
    shell.style.borderRadius = '0';
    const inner = shell.querySelector('.page-inner');
    inner.style.height = '196mm';
    inner.style.minHeight = '196mm';
    host.appendChild(shell);
    return { shell, inner, grid: shell.querySelector('.symptoms') };
  };

  let current = openMeasuredPage();
  let currentLimit = current.inner.clientHeight;

  const closeCurrentPage = () => {
    pages.push(pageRows.slice());
    host.innerHTML = '';
    pageRows = [];
    pageStartIndex += pages[pages.length - 1].length;
    pageIndex += 1;
    current = openMeasuredPage();
    currentLimit = current.inner.clientHeight;
  };

  symptoms.forEach((symptom, localIndex) => {
    const temp = document.createElement('div');
    temp.innerHTML = symptomRow(symptom, pageStartIndex + pageRows.length + 1, withFreqs);
    const card = temp.firstElementChild;
    current.grid.appendChild(card);
    const tooTall = current.inner.scrollHeight > currentLimit;
    if(tooTall && pageRows.length){
      current.grid.removeChild(card);
      closeCurrentPage();
      const temp2 = document.createElement('div');
      temp2.innerHTML = symptomRow(symptom, pageStartIndex + pageRows.length + 1, withFreqs);
      current.grid.appendChild(temp2.firstElementChild);
    }
    pageRows.push(symptom);
  });

  if(pageRows.length) pages.push(pageRows.slice());
  host.innerHTML = '';
  return pages;
}

function areaDetailPageChunk(area, rows, startIndex, withFreqs = false, firstChunk = false){
  return `
    <section class="page area-detail single-area-page">
      <div class="page-inner area-measure" data-area="${escapeHtml(area.naziv)}">
        ${exportMetaStrip()}
        ${areaHeroCompact(area, firstChunk)}
        <div class="symptoms three-col stable-two-col" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.42mm 2mm;align-content:start;">
          ${rows.map((symptom, idx) => symptomRow(symptom, startIndex + idx + 1, withFreqs)).join('')}
        </div>
      </div>
    </section>`;
}

function renderSingleAreaPaged(area, withFreqs = false){
  const chunks = measureSingleAreaPageChunks(area, withFreqs);
  let offset = 0;
  const html = chunks.map((chunk, idx) => {
    const block = areaDetailPageChunk(area, chunk, offset, withFreqs, idx === 0);
    offset += chunk.length;
    return block;
  }).join('');
  return html;
}

function areaDetail(area, withFreqs = false){
  return areaDetailPageChunk(area, area.symptoms || [], 0, withFreqs, true);
}
function modeIntro(canonicalMode){
  if(canonicalMode === 'toc-preview') return 'Sadržaj svih oblasti služi kao miran ulaz u knjigu: klikabilan je, pregledan i nosi isti export identitet kao i ostali modovi.';
  if(canonicalMode === 'areas') return 'Atlas oblasti je pregledni ulaz u knjigu: dve stabilne kolone, brz izbor oblasti i isti export/print identitet kao i ostali modovi.';
  if(canonicalMode === 'master-book-freqs') return 'Master tok sa frekvencijama zadržava isti redosled knjige, ali ispod simptoma dodaje kompaktan frekvencijski blok i jedinstvenu export oznaku.';
  if(canonicalMode === 'single-area') return 'Jedna oblast se otvara direktno iz TOC-a i Atlasa, bez suvišne uvodne strane, kao fokusirani prikaz za čitanje, export i štampu.';
  return 'Master HTML knjiga sada ide mirnijim knjižnim tokom: naslovna, sadržaj, mapa knjige, atlas i zatim detalji oblasti, uz jedinstven export/print standard kroz sve modove.';
}

function coverPage(manifest, scopeLabel, canonicalMode){
  const modeTitle = modeLabelMap[canonicalMode] || canonicalMode;
  return `
    <section class="page cover">
      <div class="page-inner">
        ${exportMetaStrip()}
        <div class="cover-grid">
          <article class="card">
            <div class="section-kicker">SINET KNJIGA AUDIO LEKAR</div>
            <h1 class="title">${escapeHtml(modeTitle)}</h1>
            <p class="subtitle">${escapeHtml(modeIntro(canonicalMode))}</p>
            <div class="meta-grid">
              <div class="meta-box"><div class="k">Verzija</div><div class="v">${VERSION}</div></div>
              <div class="meta-box"><div class="k">Export kod</div><div class="v">${escapeHtml(state.exportCode)}</div></div>
              <div class="meta-box"><div class="k">Opseg</div><div class="v">${escapeHtml(scopeLabel)}</div></div>
              <div class="meta-box"><div class="k">Generisano</div><div class="v export-v-small">${escapeHtml(state.generatedAtDisplay)}</div></div>
            </div>
          </article>
          <article class="card">
            <div class="section-kicker">KAKO KORISTITI KNJIGU</div>
            <h2 class="section-title">${escapeHtml(scopeLabel)}</h2>
            <p class="section-text">Knjiga se najlakše koristi ovim redom: prvo sadržaj, zatim atlas oblasti, pa jedna oblast ili kompletan Master tok. Tako korisnik uvek može da krene od opšteg pregleda ka detalju.</p>
            <p class="section-text"><strong>Skraćenice:</strong><br>TOC — Sadržaj / TOC pregled svih oblasti<br>ATL — Atlas oblasti<br>MHT — Master HTML knjiga<br>MHF — Master HTML knjiga + frekvencije<br>JOB — Jedna oblast</p>
            <p class="section-text"><strong>Opseg ovog izlaza:</strong> ${escapeHtml(scopeLabel)}<br><strong>Oblasti:</strong> ${formatInt(manifest.meta.area_count)}<br><strong>Simptomi:</strong> ${formatInt(manifest.meta.symptom_count)}<br><strong>Izvor:</strong> ${escapeHtml(manifest.meta.source_project || 'SINET Audio Lekar')}</p>
          </article>
        </div>
      </div>
    </section>`;
}

function chunkRowsEvenly(arr, maxRowsPerPage){
  if(!arr.length) return [[]];
  const pageCount = Math.max(1, Math.ceil(arr.length / Math.max(1, maxRowsPerPage)));
  const base = Math.floor(arr.length / pageCount);
  const extra = arr.length % pageCount;
  const chunks = [];
  let cursor = 0;
  for(let i=0;i<pageCount;i++){
    const size = base + (i < extra ? 1 : 0);
    chunks.push(arr.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks;
}

function tocRowsForMode(areas, withFreqs = false){
  return areas.map(area => ({
    order: area.order,
    name: area.naziv,
    page: withFreqs ? area.start_page_freqs : area.start_page_master,
  }));
}

function tocColumnMarkup(rows){
  return rows.map((row) => {
    const href = areaLink(row.name);
    return `
    <a class="toc-row toc-link" href="${href}" title="Otvori oblast: ${escapeAttr(row.name)}">
      <span>${String(row.order).padStart(2, '0')}.</span>
      <span class="toc-name"><span>${escapeHtml(row.name)}</span></span>
      <span>${row.page}</span>
    </a>`;
  }).join('');
}

function tocPageChunk(rows, title, chunkIndex = 0, chunkCount = 1){
  const continuation = chunkCount > 1 ? ` <span class="toc-part">• deo ${chunkIndex + 1}/${chunkCount}</span>` : '';
  const midpoint = Math.ceil(rows.length / 2);
  const left = rows.slice(0, midpoint);
  const right = rows.slice(midpoint);
  return `
    <section class="page toc">
      <div class="page-inner">
        ${exportMetaStrip()}
        <div class="section-kicker">SADRŽAJ</div>
        <h2 class="section-title">${escapeHtml(title)}${continuation}</h2>
        <div class="section-text">Sadržaj je prebuilt iz posebnog TOC indeksa. Redovi se sada ravnomernije raspoređuju po stranicama, a klik vodi direktno na jednu oblast bez uvodnog Master toka.</div>
        <div class="toc-grid">
          <div class="toc-col">${tocColumnMarkup(left)}</div>
          <div class="toc-col">${tocColumnMarkup(right)}</div>
        </div>
      </div>
    </section>`;
}

function renderTocPages(rows, title = 'Sadržaj svih oblasti', rowsPerPage = 72){
  const pages = chunkRowsEvenly(rows, rowsPerPage);
  return pages.map((chunk, index) => tocPageChunk(chunk, title, index, pages.length)).join('');
}

function guidePage(){
  return `
    <section class="page guide">
      <div class="page-inner">
        ${exportMetaStrip()}
        <div class="section-kicker">VODIČ KROZ KNJIGU</div>
        <h2 class="section-title">Kako čitati ovu knjigu</h2>
        <div class="guide-grid stable-two-col" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3.6mm;">
          <article class="guide-card">
            <h3>1. Kreni od sadržaja</h3>
            <ul>
              <li>TOC daje najbrži pregled svih oblasti.</li>
              <li>Klik iz sadržaja vodi direktno u jednu oblast.</li>
              <li>Ovo je najlakši početak za korisnika.</li>
            </ul>
          </article>
          <article class="guide-card">
            <h3>2. Atlas pa detalj</h3>
            <ul>
              <li>Atlas oblasti daje pregled po oblastima u dve kolone.</li>
              <li>Iz atlasa možeš odmah ući u jednu oblast.</li>
            </ul>
          </article>
          <article class="guide-card">
            <h3>3. Jedna oblast</h3>
            <ul>
              <li>Jedna oblast je najčistiji prikaz za detaljno čitanje.</li>
              <li>HTML export i print nose isti identitet i fingerprint.</li>
            </ul>
          </article>
          <article class="guide-card">
            <h3>4. Master tok</h3>
            <ul>
              <li>Master HTML spaja naslovnu, sadržaj, atlas i kompletan tok oblasti.</li>
              <li>Master + frekvencije dodaje frekvencijski sloj bez menjanja osnove knjige.</li>
            </ul>
          </article>
        </div>
      </div>
    </section>`;
}

function bookMapPage(manifest, areas, canonicalMode){
  const masterLabel = canonicalMode === 'master-book-freqs' ? 'Master HTML knjiga + frekvencije' : 'Master HTML knjiga';
  return `
    <section class="page book-map">
      <div class="page-inner">
        ${exportMetaStrip()}
        <div class="section-kicker">MAPA KNJIGE</div>
        <h2 class="section-title">Kako teče ovaj izdvojeni prikaz</h2>
        <div class="book-flow-grid">
          <article class="flow-card"><div class="flow-step">01</div><h3>Sadržaj</h3><p>Prvo dobijaš pregled svih oblasti i tačku od koje oblast kreće u knjizi.</p></article>
          <article class="flow-card"><div class="flow-step">02</div><h3>Atlas</h3><p>Atlas daje pregled svih oblasti u dve stabilne kolone i vodi te direktno ka detalju.</p></article>
          <article class="flow-card"><div class="flow-step">03</div><h3>Detalji oblasti</h3><p>Nakon atlasa sledi puni tok oblasti sa simptomima u kompaktnom knjižnom rasporedu.</p></article>
          <article class="flow-card"><div class="flow-step">04</div><h3>${masterLabel}</h3><p>${canonicalMode === 'master-book-freqs' ? 'Ovaj mod dodaje i frekvencijski sloj ispod simptoma.' : 'Ovaj mod ostaje fokusiran na glavni tok oblasti i simptoma.'}</p></article>
        </div>
        <div class="quiet-note">Ukupno oblasti: <strong>${formatInt(manifest.meta.area_count)}</strong> • Ukupno simptoma: <strong>${formatInt(manifest.meta.symptom_count)}</strong> • Aktivni opseg: <strong>${escapeHtml(state.scopeLabel)}</strong></div>
      </div>
    </section>`;
}

function overviewPage(areas){
  return `
    <section class="page overview">
      <div class="page-inner">
        ${exportMetaStrip()}
        <div class="section-kicker">ATLAS OBLASTI</div>
        <h2 class="section-title">Pregled svih oblasti</h2>
        <div class="section-text">Atlas ostaje u 2 stabilne kolone i u desktop split prikazu, kako bi pregled oblasti ostao miran i pregledan pre ulaska u detalje.</div>
        <div class="area-overview-grid stable-two-col" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2.2mm 3mm;align-content:start;margin-top:3mm;">
          ${areas.map(areaCard).join('')}
        </div>
      </div>
    </section>`;
}

function addPageNumbers(){
  const footerMeta = footerMetaLine();
  [...document.querySelectorAll('.sheet > .page')].forEach((page, index) => {
    if(page.querySelector('.page-no')) return;
    page.insertAdjacentHTML('beforeend', `<div class="page-header-note">${escapeHtml(footerMeta)}</div><div class="page-no">${index + 1}</div>`);
  });
}

function buildTextExports(areas, withFreqs){
  const symptomTotal = areas.reduce((sum, a) => sum + a.symptom_count, 0);
  const header = [
    `SINET Knjiga Audio Lekar ${VERSION}`,
    `Export: ${state.exportCode}`,
    `Mod: ${modeLabelMap[mode] || mode}`,
    `Opseg: ${state.scopeLabel}`,
    `Generisano: ${state.generatedAtDisplay}`,
    `Render: ${state.renderId}`,
    `Oblasti: ${areas.length}`,
    `Simptomi: ${symptomTotal}`,
    ''
  ].join('\n');

  const lines = [header, ''];
  const md = [
    `# SINET Knjiga Audio Lekar ${VERSION}`,
    '',
    `**Export:** ${state.exportCode}`,
    `**Mod:** ${modeLabelMap[mode] || mode}`,
    `**Opseg:** ${state.scopeLabel}`,
    `**Generisano:** ${state.generatedAtDisplay}`,
    `**Render:** ${state.renderId}`,
    `**Oblasti:** ${areas.length}`,
    `**Simptomi:** ${symptomTotal}`,
    ''
  ];

  state.tocRows.forEach(row => md.push(`- ${row.name} — str. ${row.page}`));
  md.push('');

  areas.forEach(area => {
    const tocEntry = state.tocRows.find(r => r.name === area.naziv);
    lines.push(`${area.order}. ${area.naziv} [str. ${tocEntry?.page ?? '?'}]`);
    lines.push(`${area.symptom_count} simptoma | ${area.freq_covered} sa frekvencijama | ${area.mkb_covered} sa MKB-10`);
    md.push(`## ${area.order}. ${area.naziv}`);
    md.push(`_str. ${tocEntry?.page ?? '?'}_`);
    (area.symptoms || []).forEach((symptom, idx) => {
      lines.push(`  ${idx + 1}. ${symptom.simptom} | ${symptom.podOblast || symptom.oblast} | ${formatMkbValue(symptom.mkb10)}`);
      if(symptom.opis) lines.push(`     ${symptom.opis}`);
      if(withFreqs && symptom.freqs?.length){
        symptom.freqs.forEach(freq => lines.push(`     - ${freq.naziv}${freq.trajanje_min ? ` (${freq.trajanje_min} min)` : ''}: ${freq.opis || ''}`));
      }
      md.push(`- **${idx + 1}. ${symptom.simptom}** — ${symptom.podOblast || symptom.oblast}${symptom.mkb10 ? ` • ${formatMkbValue(symptom.mkb10)}` : ''}`);
      if(symptom.opis) md.push(`  - ${symptom.opis}`);
      if(withFreqs && symptom.freqs?.length){
        symptom.freqs.forEach(freq => md.push(`  - 🎵 ${freq.naziv}${freq.trajanje_min ? ` (${freq.trajanje_min} min)` : ''}${freq.opis ? ` — ${freq.opis}` : ''}`));
      }
    });
    lines.push('');
    md.push('');
  });

  state.runtimeText = lines.join('\n');
  state.runtimeMd = md.join('\n');
}

function download(filename, text, type = 'text/plain;charset=utf-8'){
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildFilename(ext){
  const scopeSlug = slugify(state.scopeLabel);
  return `SINET_KNJIGA_AUDIO_LEKAR_${state.exportCode}_${scopeSlug}_${state.generatedAtFile}.${ext}`;
}

function bindDownloads(){
  document.getElementById('downloadTxt')?.addEventListener('click', () => download(buildFilename('txt'), state.runtimeText));
  document.getElementById('downloadMd')?.addEventListener('click', () => download(buildFilename('md'), state.runtimeMd, 'text/markdown;charset=utf-8'));
  document.getElementById('downloadHtml')?.addEventListener('click', () => download(buildFilename('html'), document.documentElement.outerHTML, 'text/html;charset=utf-8'));
}

function waitFrame(){
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function renderAreasProgressively(target, areas, withFreqs = false, batchSize = 4){
  target.innerHTML = '';
  for(let i = 0; i < areas.length; i += batchSize){
    const batch = areas.slice(i, i + batchSize);
    target.insertAdjacentHTML('beforeend', batch.map(area => areaDetail(area, withFreqs)).join(''));
    const progress = document.getElementById('renderProgressText');
    if(progress){
      progress.textContent = `Renderujem oblasti ${Math.min(i + batch.length, areas.length)}/${areas.length}…`;
    }
    await waitFrame();
  }
}

async function init(){
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<section class="page"><div class="page-inner"><article class="card"><h1 style="margin-top:0">Učitavam knjigu…</h1><p>Učitavam manifest i prebuilt indekse; zatim renderujem traženi mod. JOB auto-resize sada meri stvarnu visinu kartica i puni stranu do realnog kraja, umesto grubog 1–10 / 11–17 sečenja.</p></article></div></section>`;
  try{
    const generatedAt = makeGeneratedAt();
    state.generatedAtDisplay = generatedAt.display;
    state.generatedAtFile = generatedAt.file;
    state.renderId = makeRenderId(generatedAt.file);

    const [manifest, toc] = await Promise.all([loadManifest(), loadTocIndex()]);
    state.manifest = manifest;
    state.toc = toc;
    const summaryAreas = pickAreas(toc.areas || [], requestedArea);
    if(requestedArea && !summaryAreas.length) throw new Error(`Oblast nije pronađena: ${requestedArea}`);

    const canonicalMode = mode === 'area-symptoms' ? 'master-book' : mode === 'area-symptoms-freqs' ? 'master-book-freqs' : mode;
    const withFreqs = canonicalMode === 'master-book-freqs';
    state.exportCode = exportCodeMap[canonicalMode] || 'EXP';
    state.scopeLabel = resolveScopeLabel(canonicalMode, summaryAreas);

    const tocRows = tocRowsForMode(summaryAreas, withFreqs);
    state.tocRows = tocRows;
    const tocPagesHtml = renderTocPages(tocRows, canonicalMode === 'toc-preview' ? 'TOC pregled svih oblasti' : 'Sadržaj svih oblasti', manifest.toc?.rows_per_page || 72);

    let fullAreas = [];
    if(canonicalMode === 'toc-preview' || canonicalMode === 'areas'){
      fullAreas = summaryAreas.map(a => ({...a, symptoms: []}));
    } else if(canonicalMode === 'single-area'){
      fullAreas = [await loadAreaChunk(summaryAreas[0])];
      state.scopeLabel = resolveScopeLabel(canonicalMode, fullAreas);
    } else {
      const masterIndex = await loadMasterIndex();
      const selected = pickAreas(masterIndex.areas || [], requestedArea);
      fullAreas = requestedArea ? selected : (masterIndex.areas || []);
      state.scopeLabel = resolveScopeLabel(canonicalMode, fullAreas);
    }

    if(canonicalMode === 'areas'){
      sheet.innerHTML = coverPage(manifest, state.scopeLabel, canonicalMode) + overviewPage(summaryAreas);
      buildTextExports(fullAreas, withFreqs);
      addPageNumbers();
    } else if(canonicalMode === 'toc-preview'){
      sheet.innerHTML = coverPage(manifest, state.scopeLabel, canonicalMode) + tocPagesHtml + guidePage();
      buildTextExports(fullAreas, withFreqs);
      addPageNumbers();
    } else if(canonicalMode === 'single-area'){
      const area = fullAreas[0];
      sheet.innerHTML = renderSingleAreaPaged(area, withFreqs);
      buildTextExports(fullAreas, withFreqs);
      addPageNumbers();
    } else {
      const overview = requestedArea ? '' : overviewPage(summaryAreas);
      const masterPrelude = bookMapPage(manifest, summaryAreas, canonicalMode);
      sheet.innerHTML = coverPage(manifest, state.scopeLabel, canonicalMode) + tocPagesHtml + masterPrelude + overview + `<section class="page"><div class="page-inner">${exportMetaStrip()}<article class="card render-progress"><h2 style="margin-top:0">Renderujem glavni tok knjige…</h2><p id="renderProgressText">Učitano 0/${fullAreas.length} oblasti…</p><p class="section-text">Master mod ostaje najopsežniji pogled, zato i dalje ide progresivno. Sadržaj i atlas ostaju brzi ulazi, a detaljni tok oblasti se puni postepeno i mirnije.</p></article></div></section><div id="detailsMount"></div>`;
      const mount = document.getElementById('detailsMount');
      await renderAreasProgressively(mount, fullAreas, withFreqs, requestedArea ? 1 : 4);
      document.querySelector('.render-progress')?.closest('.page')?.remove();
      buildTextExports(fullAreas, withFreqs);
      addPageNumbers();
    }
    document.body.className = `mode-${canonicalMode.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`;
    const title = `SINET Knjiga Audio Lekar — ${state.exportCode} — ${state.scopeLabel}`;
    document.title = title;
    document.getElementById('pageTitle').textContent = 'SINET Knjiga Audio Lekar';
    document.getElementById('pageSubTitle').textContent = `${VERSION} • ${state.exportCode} • ${state.scopeLabel} • ${state.generatedAtDisplay} • ${state.renderId}`;
    bindDownloads();
  }catch(error){
    sheet.innerHTML = `<section class="page"><div class="page-inner"><article class="card"><h1 style="margin-top:0">Greška</h1><p>${escapeHtml(error.message)}</p></article></div></section>`;
  }
}

init();
