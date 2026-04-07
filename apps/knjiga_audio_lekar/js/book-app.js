import { loadManifest, loadTocIndex, formatInt } from './book-data.js';

const state = { manifest:null, toc:null };
const VERSION = 'v0.3.8';

const EXPORT_MODES = [
  { code:'TOC', label:'Sadržaj / TOC pregled svih oblasti', mode:'toc-preview' },
  { code:'ATL', label:'Atlas oblasti', mode:'areas' },
  { code:'MHT', label:'Master HTML knjiga', mode:'master-book' },
  { code:'MHF', label:'Master HTML knjiga + frekvencije', mode:'master-book-freqs' },
  { code:'JOB', label:'Jedna oblast', mode:'single-area' },
];

function areaOption(area){
  return `<option value="${area.naziv}">${String(area.order).padStart(2,'0')}. ${area.naziv} (${formatInt(area.symptom_count)})</option>`;
}

function areaCard(area){
  const pods = (area.podoblasti || []).slice(0,8).map(p=>`<span class="pill">${p.naziv} · ${formatInt(p.count)}</span>`).join('');
  return `
    <article class="area-item">
      <h3>${String(area.order).padStart(2,'0')}. ${area.naziv}</h3>
      <div class="area-meta">${formatInt(area.symptom_count)} simptoma • ${formatInt(area.freq_covered)} sa frekvencijama • ${formatInt(area.mkb_covered)} sa MKB-10</div>
      <div class="pills">${pods || '<span class="pill">Bez podoblasti</span>'}</div>
      <div class="actions" style="margin-top:14px;">
        <a class="btn btn-soft" href="pages/book-print.html?mode=single-area&area=${encodeURIComponent(area.naziv)}">📖 Otvori oblast</a>
      </div>
    </article>`;
}

function modeRow(item){
  return `<div class="export-mode-row"><strong>${item.code}</strong><span>${item.label}</span></div>`;
}

function openMode(mode){
  const select = document.getElementById('singleAreaSelect');
  const params = new URLSearchParams({mode});
  if(mode === 'single-area' && select?.value){
    params.set('area', select.value);
  }
  window.location.href = `pages/book-print.html?${params.toString()}`;
}

function bind(){
  document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => openMode(btn.dataset.mode)));
  document.getElementById('openSingleArea')?.addEventListener('click', ()=>openMode('single-area'));
}

async function init(){
  const app = document.getElementById('app');
  try{
    const [manifest, toc] = await Promise.all([loadManifest(), loadTocIndex()]);
    state.manifest = manifest;
    state.toc = toc;
    const stats = manifest.meta;
    const areas = toc.areas || [];
    const tocPages = manifest.toc?.master_toc_pages || Math.max(1, Math.ceil(areas.length / 72));
    app.innerHTML = `
      <section class="hero">
        <article class="card">
          <div class="version-badge">📘 ${VERSION} • master tok poliran • JOB stabilan</div>
          <h1 class="title">SINET Knjiga Audio Lekar</h1>
          <p class="subtitle">Knjiga sada ulazi u mirniju, knjižniju fazu: početak vodi preko sadržaja i atlasa, Master tok je jasniji, a JOB / Jedna oblast ostaje stabilan za direktan pregled i štampu. Svaki export i svaka štampa zadržavaju kod moda, opseg i vreme generisanja.</p>
          <div class="controls">
            <div>
              <label for="singleAreaSelect">Jedna oblast</label>
              <select id="singleAreaSelect">${areas.map(areaOption).join('')}</select>
            </div>
            <div>
              <label>Brzi ulaz</label>
              <div class="actions">
                <button class="btn btn-primary" id="openSingleArea">📖 Otvori izabranu oblast</button>
                <a class="btn" href="pages/book-print.html?mode=toc-preview">🧭 TOC pregled</a>
              </div>
            </div>
          </div>
        </article>
        <article class="card">
          <h2 style="margin-top:0">Tok knjige</h2>
          <div class="subtitle">Najčistiji redosled rada kroz knjigu sada je isti kao i za korisnika: prvo sadržaj, zatim atlas, pa jedna oblast ili kompletan Master tok.</div>
          <ul class="info-list">
            <li><strong>1. TOC / Sadržaj:</strong> najbrži ulaz u celu knjigu.</li>
            <li><strong>2. Atlas oblasti:</strong> pregled oblasti u 2 kolone sa direktnim ulazom u oblast.</li>
            <li><strong>3. Jedna oblast:</strong> stabilan fokusirani prikaz za pregled, HTML export i print.</li>
            <li><strong>4. Master knjiga:</strong> kompletan tok za celinu knjige, sa ${formatInt(tocPages)} sadržajne strane pri trenutnoj gustini.</li>
          </ul>
          <div class="book-sequence">
            <article class="book-step"><div class="step-no">01</div><h3>TOC</h3><p>Sadržaj svih oblasti je najbrži ulaz i orijentir za ceo korpus.</p></article>
            <article class="book-step"><div class="step-no">02</div><h3>Atlas</h3><p>Atlas daje pregled oblasti u 2 kolone i odmah vodi u pojedinačnu oblast.</p></article>
            <article class="book-step"><div class="step-no">03</div><h3>JOB</h3><p>Jedna oblast ostaje najčistiji detaljni prikaz za čitanje, export i print.</p></article>
            <article class="book-step"><div class="step-no">04</div><h3>Master</h3><p>Master tok sada je mirniji i knjižniji, sa jasnijim prelazom od sadržaja ka detalju.</p></article>
          </div>
        </article>
      </section>

      <section class="grid">
        <article class="card stat"><div class="kicker">Ukupno oblasti</div><div class="value">${formatInt(stats.area_count)}</div><div class="meta">iz brzog TOC indeksa</div></article>
        <article class="card stat"><div class="kicker">Ukupno simptoma</div><div class="value">${formatInt(stats.symptom_count)}</div><div class="meta">manifest / master indeks</div></article>
        <article class="card stat"><div class="kicker">Izvor podataka</div><div class="value" style="font-size:18px">${stats.source_project || 'SINET Audio Lekar'}</div><div class="meta">schema: ${stats.source_schema || 'N/A'} • source: ${stats.source_version || 'N/A'}</div></article>
        <article class="card stat"><div class="kicker">Verzija knjige</div><div class="value">${VERSION}</div><div class="meta">master tok poliran • JOB stabilan</div></article>

        <article class="card panel">
          <h2>Modovi knjige</h2>
          <div class="mode-grid">
            <section class="mode-card">
              <h3>📘 Master HTML knjiga</h3>
              <p>Mirniji glavni tok knjige: naslovna, sadržaj, mapa knjige, atlas i zatim kompletna knjiga simptoma.</p>
              <div class="cta"><button class="btn btn-primary" data-mode="master-book">Otvori mod</button></div>
            </section>
            <section class="mode-card">
              <h3>🎵 Master + frekvencije</h3>
              <p>Isti glavni tok, ali ispod simptoma dodaje kompaktne frekvencijske blokove i zadržava isti export/print identitet.</p>
              <div class="cta"><button class="btn btn-primary" data-mode="master-book-freqs">Otvori mod</button></div>
            </section>
            <section class="mode-card">
              <h3>📚 Atlas oblasti</h3>
              <p>Brzi atlas svih oblasti u 2 stabilne kolone, bez učitavanja teškog master sadržaja.</p>
              <div class="cta"><button class="btn btn-primary" data-mode="areas">Otvori mod</button></div>
            </section>
            <section class="mode-card">
              <h3>🧭 TOC pregled</h3>
              <p>Sadržaj svih oblasti iz laganog indeksa, sa klikabilnim redovima i jasnim polaskom u jednu oblast.</p>
              <div class="cta"><button class="btn btn-primary" data-mode="toc-preview">Otvori mod</button></div>
            </section>
          </div>
        </article>

        <article class="card panel export-codes-panel">
          <h2>Skraćenice export modova</h2>
          <div class="export-mode-list">${EXPORT_MODES.map(modeRow).join('')}</div>
          <div class="footer-note">Svaki HTML/TXT/MD export i svaka štampa sada treba da sadrže oznaku moda, naziv oblasti ili opsega i vreme generisanja.</div>
        </article>

        <article class="card panel">
          <h2>Tehnička napomena</h2>
          <div class="footer-note">
            Ako želiš potpuno poravnanje sa lokalnim <code>data/SINET_STL.json</code>, pokreni:<br>
            <code>./tools/build_book_runtime.sh</code><br><br>
            To će obnoviti: <code>book_manifest.json</code>, <code>book_toc_index.json</code>, <code>book_master_index.json</code> i <code>book_area_chunks/*</code>.
          </div>
        </article>
      </section>

      <section class="section">
        <h2>Pregled prvih oblasti</h2>
        <div class="area-list">${areas.slice(0,16).map(areaCard).join('')}</div>
      </section>
    `;
    bind();
  }catch(error){
    app.innerHTML = `<article class="card"><h1>Greška</h1><p>${error.message}</p></article>`;
  }
}

init();
