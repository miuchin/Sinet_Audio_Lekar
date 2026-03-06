(function(){
  const MKB_URLS = [
    './data/mkb10_sr.json','/data/mkb10_sr.json','../data/mkb10_sr.json'
  ];
  const CHAPTERS = [
    ['A00','B99','I Određene zarazne i parazitarne bolesti'],
    ['C00','D48','II Neoplazme'],
    ['D50','D89','III Bolesti krvi i krvotvornih organa'],
    ['E00','E90','IV Endokrine, nutritivne i metaboličke bolesti'],
    ['F00','F99','V Mentalni poremećaji i poremećaji ponašanja'],
    ['G00','G99','VI Bolesti nervnog sistema'],
    ['H00','H59','VII Bolesti oka i adneksa'],
    ['H60','H95','VIII Bolesti uva i mastoidnog nastavka'],
    ['I00','I99','IX Bolesti sistema krvotoka'],
    ['J00','J99','X Bolesti sistema za disanje'],
    ['K00','K93','XI Bolesti sistema za varenje'],
    ['L00','L99','XII Bolesti kože i potkožnog tkiva'],
    ['M00','M99','XIII Bolesti mišićno-koštanog sistema'],
    ['N00','N99','XIV Bolesti genitourinarnog sistema'],
    ['O00','O99','XV Trudnoća, porođaj i babinje'],
    ['P00','P96','XVI Određena stanja nastala u perinatalnom periodu'],
    ['Q00','Q99','XVII Urođene malformacije i hromozomske abnormalnosti'],
    ['R00','R99','XVIII Simptomi, znaci i abnormalni nalazi'],
    ['S00','T98','XIX Povrede, trovanja i ostale posledice'],
    ['Z00','Z99','XXI Faktori koji utiču na zdravstveno stanje']
  ];
  const SR_MARKERS = [
    'KOLERA','TRBUŠNI','TRBUSNI','PARATIFUS','TIFUS','DIZENTERIJA','INFEK','ZAPALJENJE','UPALA',
    'BOLEST','BOLESTI','POREMEĆAJ','POREMEC','SIMPTOM','ZNACI','FAKTORI','SEPSA','NEOZNA',
    'UZROKOV','LOKALIZOVANA','DRUGA','DRUGE','CREVA','CRIJEVA','KOŽE','KOZE','PLUĆA','PLUCA',
    'JETRE','BUBREGA','KRVI','SRCA','MOZGA','MOKRAĆ','MOKRAC','TRUDNOĆA','TRUDNOCA','BABINJE',
    'MIŠIĆNO','MISICNO','KRVOTOKA','DISANJE','VARENJE','NERVNOG','GENITOURINARNOG','PARAZIT',
    'HRONIČ','HRONIC','AKUT','NEODREĐ','NEODRED','NEOZNAČ','NEOZNAC'
  ];

  let mkbEntriesPromise = null;

  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function norm(v){ return String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }
  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function titleCase(v){
    const lower = String(v || '').toLocaleLowerCase('sr-RS');
    return lower.replace(/(^|[\s(\/-])([\p{L}])/gu, (m, p1, p2) => p1 + p2.toLocaleUpperCase('sr-RS'));
  }

  function findSrSplitIndex(clean){
    const words = clean.split(/\s+/).filter(Boolean);
    let cursor = 0;
    for(let i = 0; i < words.length; i++){
      const word = words[i];
      const idx = clean.indexOf(word, cursor);
      cursor = idx + word.length;
      if(i < 1) continue;
      const nw = norm(word.replace(/[.,;:()+/-]+/g,''));
      if(!nw) continue;
      const hasSrChar = /[čćžšđ]/i.test(word);
      const looksSr = hasSrChar || SR_MARKERS.some(m => nw.startsWith(norm(m)));
      if(looksSr) return idx;
    }
    return -1;
  }

  function parseMkbTitle(raw){
    const clean = String(raw || '').replace(/\s+/g,' ').trim();
    if(!clean) return { displayTitle:'', subtitle:'' };
    const splitIdx = findSrSplitIndex(clean);
    if(splitIdx > 2){
      const original = clean.slice(0, splitIdx).trim();
      const sr = clean.slice(splitIdx).trim();
      return {
        displayTitle: titleCase(sr),
        subtitle: original
      };
    }
    return {
      displayTitle: titleCase(clean),
      subtitle: ''
    };
  }

  function toolConfig(page){
    switch(page){
      case 'ai': return {
        icon:'🤖',
        title:'AI Upitnik',
        subtitle:'Standardizovan SINET ekran za unos simptoma, cilja i MKB konteksta.'
      };
      case 'ds': return {
        icon:'🧾',
        title:'DS Generator',
        subtitle:'Jedinstven izgled i brze akcije za vodič, protokol i SharePack.'
      };
      case 'iv': return {
        icon:'🌿',
        title:'Integrativni vodič',
        subtitle:'Isti SINET sloj za MKB, profil i akcije kroz ceo sistem.'
      };
      case 'anam': return {
        icon:'🩺',
        title:'Anamneza',
        subtitle:'Referentni SINET ekran za MKB, profile, povezivanje i izvoz.'
      };
      default: return {
        icon:'🌐',
        title:'SINET alat',
        subtitle:'Standardizovan izgled i navigacija.'
      };
    }
  }

  function currentPage(){
    if(document.getElementById('ai_prompt')) return 'ai';
    if(document.getElementById('generatorForm')) return 'ds';
    if(document.getElementById('contentToCopy') && document.getElementById('icdInput')) return 'iv';
    if(document.getElementById('mainView') && document.getElementById('searchICD')) return 'anam';
    return 'other';
  }

  function basePrefix(){
    return currentPage() === 'iv' ? '../' : './';
  }

  function styleTag(){
    if(document.getElementById('sinet-ui-standards-style')) return;
    const st = document.createElement('style');
    st.id = 'sinet-ui-standards-style';
    st.textContent = `
      .sinet-std-card{background:#fff;border:1px solid #dfe8f1;border-radius:16px;padding:14px 16px;box-shadow:0 4px 16px rgba(14,48,74,0.06);margin:12px 0;}
      .sinet-std-title{font-weight:900;color:#1e4660;margin:0 0 8px 0;display:flex;align-items:center;gap:8px;}
      .sinet-std-muted{color:#567;font-size:.95rem;}
      .sinet-std-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .sinet-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eef6ff;border:1px solid #cfe0f5;font-weight:700;color:#1e4660;font-size:.9rem;}
      .sinet-btn{border:none;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;background:#1e4660;color:#fff;}
      .sinet-btn.ghost{background:#fff;color:#1e4660;border:1px solid #cfe0f5;}
      .sinet-btn.soft{background:#eef6ff;color:#1e4660;border:1px solid #cfe0f5;}
      .sinet-mkb-search{width:100%;padding:11px 12px;border:1px solid #d8e2ec;border-radius:12px;margin:8px 0 10px 0;}
      .sinet-mkb-results{max-height:240px;overflow:auto;border:1px solid #ebf0f5;border-radius:12px;background:#fff;}
      .sinet-mkb-item{display:block;width:100%;text-align:left;border:none;background:#fff;padding:10px 12px;border-bottom:1px solid #eef2f6;cursor:pointer;}
      .sinet-mkb-item:last-child{border-bottom:none;}
      .sinet-mkb-item:hover{background:#f7fbff;}
      .sinet-mkb-code{display:inline-block;min-width:70px;font-weight:900;color:#0d6efd;}
      .sinet-mkb-title{display:block;font-weight:800;color:#163d56;}
      .sinet-mkb-subtitle{display:block;color:#70879a;font-size:.85rem;margin-top:2px;}
      .sinet-mkb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px;}
      .sinet-mkb-chip{border:1px solid #d8e2ec;background:#fff;border-radius:12px;padding:10px;cursor:pointer;text-align:left;font-weight:700;}
      .sinet-mkb-chip:hover{background:#f7fbff;}
      .sinet-mkb-chip small{display:block;color:#567;font-weight:500;margin-top:4px;}
      .sinet-compact{margin-top:10px;}
      .sinet-field{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin:6px 0 10px 0;}
      .sinet-tool-shell{border:1px solid #d7e5f2;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);}
      .sinet-tool-header-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;}
      .sinet-tool-label{font-size:.8rem;font-weight:900;color:#5d7890;text-transform:uppercase;letter-spacing:.04em;}
      .sinet-tool-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
      .sinet-action-btn{border:1px solid #cfe0f5;background:#eef6ff;color:#1e4660;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;}
      .sinet-action-btn:hover{background:#e4f0fb;}
      .sinet-action-btn.primary{background:#1e4660;color:#fff;border-color:#1e4660;}
    `;
    document.head.appendChild(st);
  }

  async function loadMkbEntries(){
    if(mkbEntriesPromise) return mkbEntriesPromise;
    mkbEntriesPromise = (async () => {
      for(const url of MKB_URLS){
        try{
          const res = await fetch(url, {cache:'no-store'});
          if(!res.ok) continue;
          const raw = await res.json();
          let arr = [];
          if(Array.isArray(raw)) arr = raw;
          else if(Array.isArray(raw?.entries)) arr = raw.entries;
          arr = arr.filter(Boolean).map(x => {
            const code = String(x.code || x.sifra || '').trim().toUpperCase();
            const rawTitle = String(x.title || x.naziv || x.opis || '').trim();
            const parsed = parseMkbTitle(rawTitle);
            return {
              code,
              rawTitle,
              title: parsed.displayTitle || rawTitle,
              subtitle: parsed.subtitle || '',
              searchText: norm(`${code} ${rawTitle} ${parsed.displayTitle || ''} ${parsed.subtitle || ''}`)
            };
          }).filter(x => x.code);
          if(arr.length) return arr;
        }catch(_){ }
      }
      return [];
    })();
    return mkbEntriesPromise;
  }

  function getProfile(kind){
    const core = window.SINET_ProfilesCore;
    if(!core) return null;
    return kind === 'default' ? (core.getDefaultProfile ? core.getDefaultProfile() : null) : (core.getActiveProfile ? core.getActiveProfile() : null);
  }

  function derivePrimaryIcd(p){
    if(!p) return '';
    return String(p.primaryIcd || p.mkb10 || p.mkb || '').trim();
  }

  function profileBits(p){
    if(!p) return [];
    const bits = [];
    const icd = derivePrimaryIcd(p);
    if(icd) bits.push(`MKB: ${icd}`);
    if(p.primaryDiagnosis) bits.push(p.primaryDiagnosis);
    if(p.sex) bits.push(p.sex);
    const age = p.approxAge || (window.SINET_ProfilesCore?.snapshot ? (window.SINET_ProfilesCore.snapshot(p)||{}).approxAge : '');
    if(age) bits.push(`~${age} god.`);
    return bits;
  }

  function fillIfEmpty(id, value){
    const el = document.getElementById(id);
    if(el && !String(el.value || '').trim() && String(value || '').trim()) el.value = String(value);
  }

  function setValue(id, value){
    const el = document.getElementById(id);
    if(el){
      el.value = String(value || '');
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function applyProfileToPage(kind){
    const p = getProfile(kind);
    if(!p) return;
    const page = currentPage();
    const icd = derivePrimaryIcd(p);
    if(page === 'ai'){
      fillIfEmpty('ai_age', p.approxAge || '');
      if(document.getElementById('ai_sex') && (document.getElementById('ai_sex').value === 'nebitno' || !document.getElementById('ai_sex').value)) setValue('ai_sex', p.sex || 'nebitno');
      fillIfEmpty('ai_med', [p.primaryDiagnosis, p.meds, p.allergies ? `Alergije: ${p.allergies}` : '', p.chronic ? `Hronično: ${p.chronic}` : ''].filter(Boolean).join(' · '));
      fillIfEmpty('ai_goal', p.reason || p.primaryDiagnosis || '');
      fillIfEmpty('ai_mkb', icd || p.primaryDiagnosis || '');
      if(!document.getElementById('ai_symptom')?.value) fillIfEmpty('ai_symptom', p.primaryDiagnosis || p.currentCondition || p.reason || '');
    } else if(page === 'ds'){
      fillIfEmpty('ime', [p.firstName||'', p.lastName||''].filter(Boolean).join(' ').trim());
      fillIfEmpty('mkb', icd || p.primaryDiagnosis || '');
      fillIfEmpty('bolest', p.primaryDiagnosis || p.currentCondition || p.reason || '');
      fillIfEmpty('opisBolesti', p.currentCondition || p.reason || '');
      fillIfEmpty('alergije', p.allergies || '');
      fillIfEmpty('hronika', p.chronic || p.personalHistory || '');
      fillIfEmpty('terapijeLista', p.meds || '');
      fillIfEmpty('fokus', p.reason || p.primaryDiagnosis || '');
    } else if(page === 'iv'){
      fillIfEmpty('icdInput', icd || p.primaryDiagnosis || '');
    }
    try{
      window.SINET_SharedContext?.refreshSharedContext?.('ui_standards', {
        currentState:{
          source:`apply_${kind}_profile`,
          symptom: document.getElementById('bolest')?.value || document.getElementById('ai_symptom')?.value || '',
          notes: document.getElementById('opisBolesti')?.value || document.getElementById('ai_desc')?.value || ''
        }
      });
    }catch(_){ }
    initDelayed();
  }

  function renderProfileHeader(mount){
    const a = getProfile('active');
    const d = getProfile('default');
    const same = a && d && a.id === d.id;
    mount.innerHTML = `
      <div class="sinet-std-card">
        <div class="sinet-std-title">🧾 SINET profilni kontekst</div>
        <div class="sinet-std-row" style="margin-bottom:8px;">
          <span class="sinet-pill">DEFAULT: ${esc(d ? ((window.SINET_ProfilesCore?.profileLabel ? window.SINET_ProfilesCore.profileLabel(d) : d.displayName) || 'Profil') : 'nije postavljen')}</span>
          ${same ? '' : `<span class="sinet-pill">AKTIVNI: ${esc(a ? ((window.SINET_ProfilesCore?.profileLabel ? window.SINET_ProfilesCore.profileLabel(a) : a.displayName) || 'Profil') : 'nije postavljen')}</span>`}
        </div>
        <div class="sinet-std-muted">${esc(profileBits(a || d).join(' · ') || 'Profil će pomoći da svi alati rade u istom SINET kontekstu.')}</div>
        <div class="sinet-std-row sinet-compact">
          <button type="button" class="sinet-btn soft" data-sinet-prof="default">Preuzmi DEFAULT profil</button>
          <button type="button" class="sinet-btn soft" data-sinet-prof="active">Preuzmi AKTIVNI profil</button>
          <button type="button" class="sinet-btn ghost" data-sinet-prof="refresh">Osveži zajednički kontekst</button>
          <button type="button" class="sinet-btn ghost" data-sinet-prof="anam">Otvori Anamnezu</button>
        </div>
      </div>`;
    qsa('[data-sinet-prof]', mount).forEach(btn => btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-sinet-prof');
      if(act === 'anam'){
        window.location.href = `${basePrefix()}anamneza.html`;
        return;
      }
      if(act === 'refresh'){
        try{ window.SINET_SharedContext?.refreshSharedContext?.('ui_standards', { currentState:{ source:'manual_refresh' } }); }catch(_){ }
        initDelayed();
        return;
      }
      applyProfileToPage(act);
    }));
  }

  function ensureAiMkbField(){
    if(document.getElementById('ai_mkb')) return;
    const desc = document.getElementById('ai_desc');
    if(!desc || !desc.parentNode) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <label style="font-weight:bold;">MKB-10 (opciono, ali preporučeno)</label>
      <input id="ai_mkb" class="sinet-field" placeholder="npr. I10, M54.5 ili naziv stanja" />
      <div id="sinet-ai-mkb-picker"></div>`;
    desc.parentNode.insertBefore(wrap, desc.nextSibling ? (desc.nextSibling.nextSibling || desc.nextSibling) : null);
  }

  function renderMkbPicker(mount, targetInputId, opts){
    if(!mount || mount.dataset.sinetMkbReady === '1') return;
    mount.dataset.sinetMkbReady = '1';
    mount.innerHTML = `
      <div class="sinet-std-card">
        <div class="sinet-std-title">🧭 SINET MKB Picker</div>
        <div class="sinet-std-muted">Šifra + srpski prikaz + stručni/originalni naziv po potrebi.</div>
        <input class="sinet-mkb-search" type="text" placeholder="Pretraži MKB-10 šifru ili naziv..." />
        <div class="sinet-mkb-results"></div>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;font-weight:800;">Poglavlja MKB-10</summary>
          <div class="sinet-mkb-grid"></div>
        </details>
      </div>`;
    const search = qs('.sinet-mkb-search', mount);
    const results = qs('.sinet-mkb-results', mount);
    const grid = qs('.sinet-mkb-grid', mount);

    function pick(code, title, subtitle){
      const target = document.getElementById(targetInputId);
      if(!target) return;
      target.value = code;
      target.dispatchEvent(new Event('input', {bubbles:true}));
      target.dispatchEvent(new Event('change', {bubbles:true}));
      if(opts && typeof opts.onPick === 'function') opts.onPick(code, title, subtitle);
      results.innerHTML = `
        <button type="button" class="sinet-mkb-item">
          <span class="sinet-mkb-code">${esc(code)}</span>
          <span class="sinet-mkb-title">${esc(title || 'Izabrano')}</span>
          ${subtitle ? `<span class="sinet-mkb-subtitle">${esc(subtitle)}</span>` : ''}
        </button>`;
    }

    loadMkbEntries().then(entries => {
      function renderHits(q){
        const nq = norm(q);
        const hits = !nq
          ? entries.slice(0, 10)
          : entries.filter(e => e.searchText.includes(nq)).slice(0, 20);
        results.innerHTML = hits.map(e => `
          <button type="button" class="sinet-mkb-item" data-code="${esc(e.code)}" data-title="${esc(e.title)}" data-subtitle="${esc(e.subtitle)}">
            <span class="sinet-mkb-code">${esc(e.code)}</span>
            <span class="sinet-mkb-title">${esc(e.title || '')}</span>
            ${e.subtitle ? `<span class="sinet-mkb-subtitle">${esc(e.subtitle)}</span>` : ''}
          </button>`).join('') || `<div class="sinet-std-muted" style="padding:10px 12px;">Nema pogodaka.</div>`;
        qsa('.sinet-mkb-item[data-code]', results).forEach(btn => btn.addEventListener('click', () => pick(btn.getAttribute('data-code'), btn.getAttribute('data-title'), btn.getAttribute('data-subtitle'))));
      }
      renderHits('');
      search.addEventListener('input', () => renderHits(search.value));
      grid.innerHTML = CHAPTERS.map(ch => `<button type="button" class="sinet-mkb-chip" data-prefix="${ch[0].slice(0,1)}"><strong>${esc(ch[0])}–${esc(ch[1])}</strong><small>${esc(ch[2])}</small></button>`).join('');
      qsa('.sinet-mkb-chip', grid).forEach(btn => btn.addEventListener('click', () => {
        const pref = btn.getAttribute('data-prefix');
        search.value = pref;
        search.dispatchEvent(new Event('input', {bubbles:true}));
      }));
    });
  }

  function triggerAction(action){
    const page = currentPage();
    const base = basePrefix();
    if(action === 'home'){
      window.location.href = `${base}index.html`;
      return;
    }
    if(action === 'queue'){
      if(page === 'ai' && typeof window.nav === 'function'){ try{ window.nav('playlist'); return; }catch(_){ } }
      window.location.href = `${base}index.html?nav=playlist`;
      return;
    }
    if(action === 'protocols'){
      if(page === 'ai' && typeof window.nav === 'function'){ try{ window.nav('protocols'); return; }catch(_){ } }
      window.location.href = `${base}index.html?nav=protocols`;
      return;
    }
    if(action === 'sharepack'){
      if(typeof window.sinetDownloadSharePack === 'function'){ window.sinetDownloadSharePack(); return; }
      const btn = document.getElementById('downloadPackBtn') || document.getElementById('btnJSON');
      if(btn){ btn.click(); return; }
      alert('SharePack nije dostupan na ovom ekranu. Otvori Anamnezu, DS Generator ili Integrativni vodič.');
      return;
    }
    if(action === 'print'){
      window.print();
    }
  }

  function renderToolShell(mount){
    const cfg = toolConfig(currentPage());
    mount.innerHTML = `
      <div class="sinet-std-card sinet-tool-shell">
        <div class="sinet-tool-header-top">
          <div>
            <div class="sinet-tool-label">SINET standardizovani ekran</div>
            <div class="sinet-std-title">${esc(cfg.icon)} ${esc(cfg.title)}</div>
            <div class="sinet-std-muted">${esc(cfg.subtitle)}</div>
          </div>
          <div class="sinet-pill">MKB + Profil + Akcije</div>
        </div>
        <div class="sinet-tool-actions">
          <button type="button" class="sinet-action-btn primary" data-sinet-action="home">🏠 Početna</button>
          <button type="button" class="sinet-action-btn" data-sinet-action="queue">🎵 Queue</button>
          <button type="button" class="sinet-action-btn" data-sinet-action="protocols">🧩 Protokoli</button>
          <button type="button" class="sinet-action-btn" data-sinet-action="sharepack">📦 SharePack</button>
          <button type="button" class="sinet-action-btn" data-sinet-action="print">🖨️ Štampaj</button>
        </div>
      </div>`;
    qsa('[data-sinet-action]', mount).forEach(btn => btn.addEventListener('click', () => triggerAction(btn.getAttribute('data-sinet-action'))));
  }

  function mountToolShellForPage(){
    const page = currentPage();
    let box = document.getElementById('sinetToolShellMount');
    if(box){ renderToolShell(box); return; }

    box = document.createElement('div');
    box.id = 'sinetToolShellMount';

    if(page === 'ai'){
      const titleRow = document.querySelector('#page-ai > div');
      if(titleRow && titleRow.parentNode) titleRow.parentNode.insertBefore(box, titleRow.nextSibling);
    } else if(page === 'ds'){
      const form = document.getElementById('generatorForm');
      const h1 = document.getElementById('main-title');
      const anchor = h1 || form;
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
    } else if(page === 'iv'){
      const warning = document.querySelector('.warning-box');
      if(warning && warning.parentNode) warning.parentNode.insertBefore(box, warning.nextSibling);
      else {
        const card = document.querySelector('.card.no-print');
        if(card && card.parentNode) card.parentNode.insertBefore(box, card);
      }
    } else if(page === 'anam'){
      const top = document.querySelector('.container-fluid.mt-2.mb-5');
      const row = top?.querySelector('.d-flex.flex-wrap.gap-2.mb-3.no-print');
      if(row && row.parentNode) row.parentNode.insertBefore(box, row);
    }
    renderToolShell(box);
  }

  function mountProfileHeaderForPage(){
    const page = currentPage();
    if(page === 'ai'){
      const box = document.getElementById('ai-active-profile-banner');
      if(box) renderProfileHeader(box);
    } else if(page === 'ds'){
      const box = document.getElementById('activeProfileBanner');
      if(box) renderProfileHeader(box);
    } else if(page === 'iv'){
      let box = document.getElementById('sinetProfileHeaderMount');
      if(!box){
        box = document.createElement('div');
        box.id = 'sinetProfileHeaderMount';
        const warn = document.querySelector('.warning-box');
        if(warn && warn.parentNode) warn.parentNode.insertBefore(box, warn);
      }
      renderProfileHeader(box);
    } else if(page === 'anam'){
      let box = document.getElementById('sinetProfileHeaderMount');
      if(!box){
        box = document.createElement('div');
        box.id = 'sinetProfileHeaderMount';
        const top = document.querySelector('.container-fluid.mt-2.mb-5');
        const row = top?.querySelector('.d-flex.flex-wrap.gap-2.mb-3.no-print');
        if(row && row.parentNode) row.parentNode.insertBefore(box, row.nextSibling);
      }
      renderProfileHeader(box);
    }
  }

  function mountMkbForPage(){
    const page = currentPage();
    if(page === 'ai'){
      ensureAiMkbField();
      renderMkbPicker(document.getElementById('sinet-ai-mkb-picker'), 'ai_mkb');
    } else if(page === 'ds'){
      let mount = document.getElementById('sinet-ds-mkb-picker');
      if(!mount){
        mount = document.createElement('div');
        mount.id = 'sinet-ds-mkb-picker';
        const group = document.getElementById('mkbSuggest')?.parentElement;
        if(group) group.appendChild(mount);
      }
      renderMkbPicker(mount, 'mkb');
    } else if(page === 'iv'){
      let mount = document.getElementById('sinet-iv-mkb-picker');
      if(!mount){
        mount = document.createElement('div');
        mount.id = 'sinet-iv-mkb-picker';
        const card = document.getElementById('mkbSuggest')?.closest('.card.no-print') || document.querySelector('.card.no-print');
        if(card && card.parentNode) card.parentNode.insertBefore(mount, card.nextSibling);
      }
      renderMkbPicker(mount, 'icdInput', { onPick(){ if(typeof window.applyIcdFromInput === 'function'){ setTimeout(() => window.applyIcdFromInput(), 0); } } });
    }
  }

  function init(){
    styleTag();
    mountToolShellForPage();
    mountProfileHeaderForPage();
    mountMkbForPage();
  }

  let t = null;
  function initDelayed(){ clearTimeout(t); t = setTimeout(init, 60); }

  window.SINET_UI_Standards = { init, initDelayed, applyProfileToPage, parseMkbTitle };
  document.addEventListener('DOMContentLoaded', initDelayed);
  window.addEventListener('load', initDelayed);
})();
