/* SINET Anamneza Bridge — v15.7.6.8
 * Loads:
 *   /data/sinet_dx_index.json
 *   /data/SINET_STL.json
 * Allows:
 *   - click ICD badge to show candidate SINET items
 *   - generate SharePack (protocol + guide html)
 *   - insert to SINET via DS bridge (localStorage SINET_DS_BRIDGE)
 */
(function(){
  const $ = (id)=>document.getElementById(id);

  function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function escAttr(s){ return String(s??'').replace(/["'<>]/g,''); }

  
  function bestName(it){
    if(!it) return '';
    const n = String(it.naziv ?? '').trim();
    const o = String(it.opis ?? '').trim();
    const s = String(it.simptom ?? '').trim();
    const isGeneric = /^Simptom\s*\d+$/i.test(n) || /^Simptom\s*\d+$/i.test(s);
    if(o && (isGeneric || !n)) return o;
    // fallback: prettify id if name is missing/generic
    const id = String(it.id||'').trim();
    const pretty = id
      ? id.replace(/[-_]+/g,' ').replace(/\s+/g,' ').replace(/^\w/, c=>c.toUpperCase())
      : '';
    return (s || n || o || pretty || id).trim();
  }

let dxIndex = {};
  let catalog = [];
  let byId = {};
  let selectedICD = null;
  let selectedICDLabel = '';
  let selectedIds = new Set();
  let lastGuideHtml = '';

  async function loadJson(url){
    try{
      const r = await fetch(url, { cache:'no-store' });
      if(!r.ok) return null;
      return await r.json();
    }catch(_){
      return null;
    }
  }


  function getOverrideJson(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      const j = JSON.parse(raw);
      return j;
    }catch(_){ return null; }
  }

  async function loadJsonFirst(urls){
    for(const u of urls){
      const j = await loadJson(u);
      if(j!=null) return j;
    }
    return null;
  }

  async function init(){
    const dxOvr = getOverrideJson('SINET_DX_INDEX_OVERRIDE');
    if(dxOvr && typeof dxOvr==='object'){
      dxIndex = dxOvr;
    } else {
      const dx = await loadJsonFirst(['/data/sinet_dx_index.json','./data/sinet_dx_index.json','../data/sinet_dx_index.json']);
      if(dx && typeof dx === 'object') dxIndex = dx;
    }

    const catOvr = getOverrideJson('SINET_STL_OVERRIDE');
    let cat = catOvr;
    if(!cat){
      cat = await loadJsonFirst(['/data/SINET_STL.json','./data/SINET_STL.json','../data/SINET_STL.json','/data/sinet_stl.json','./data/sinet_stl.json']);
    }
    if(Array.isArray(cat)) catalog = cat;
    else if(cat && Array.isArray(cat.simptomi)) catalog = cat.simptomi;
    else if(cat && Array.isArray(cat.items)) catalog = cat.items;
    byId = {};
    for(const it of (catalog||[])){
      if(it && it.id!=null) byId[String(it.id)] = it;
    }

    const st = $('sinetLinkStatus');
    if(st) st.textContent = `SINET bridge: dx_index=${Object.keys(dxIndex||{}).length} • katalog=${(catalog||[]).length}`;

    // Quick help list (Brza pomoć + Hitno/Akutno)
    try{ renderQuickHelp(); }catch(_){ /* ignore */ }
    try{ renderIntegrativeSuggestions(); }catch(_){ /* ignore */ }

    // Event delegation: click ICD badge in the MKB list
    const icdList = $('icdList');
    if(icdList){
      icdList.addEventListener('click', (ev)=>{
        const t = ev.target;
        if(t && t.classList && t.classList.contains('icd-badge')){
          const code = (t.textContent||'').trim();
          // label = code + text after badge in parent
          const parent = t.parentElement;
          let label = code;
          if(parent){
            const txt = parent.textContent || '';
            label = txt.replace(/\s+/g,' ').trim();
          }
          selectICD(code, label);
        }
      });
    }
  }

  function isQuickHelpItem(it){
    const id = String(it?.id||'').toLowerCase();
    if(!id) return false;
    return id.includes('-sos') || id.startsWith('sys-hitno-') || id.startsWith('akutne-povrede-');
  }

  function groupQuickHelp(it){
    const id = String(it?.id||'').toLowerCase();
    if(id.startsWith('sys-hitno-')) return 'Hitno';
    if(id.startsWith('akutne-povrede-')) return 'Akutno';
    if(id.includes('-sos')) return 'SOS';
    return 'Ostalo';
  }

  function renderQuickHelp(){
    const host = $('sinetQuickList');
    if(!host) return;
    if(!catalog || !catalog.length){
      host.innerHTML = '<div class="text-muted">Katalog nije učitan.</div>';
      return;
    }
    const quick = catalog.filter(isQuickHelpItem);
    const st = $('sinetQuickStatus');
    if(st) st.textContent = quick.length ? `Brza pomoć stavke: ${quick.length}` : 'Nema quick stavki u katalogu.';
    if(!quick.length){
      host.innerHTML = '<div class="text-muted">Nema quick stavki (očekujem id: *-sos, sys-hitno-*, akutne-povrede-*).</div>';
      return;
    }
    const groups = { Hitno:[], SOS:[], Akutno:[], Ostalo:[] };
    for(const it of quick){ groups[groupQuickHelp(it)].push(it); }
    for(const k of Object.keys(groups)){
      groups[k].sort((a,b)=>bestName(a).localeCompare(bestName(b), 'sr'));
    }
    host.innerHTML = Object.entries(groups).filter(([,arr])=>arr.length).map(([g, arr])=>{
      const rows = arr.map(it=>{
        const id = String(it.id);
        const title = bestName(it);
        return `
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div style="min-width:0">
              <div><strong>${esc(title)}</strong></div>
              <div class="text-muted" style="font-size:0.82rem;">${esc(id)}</div>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-secondary" type="button" onclick="window.sinetQuickSelect('${escAttr(id)}')">Izaberi</button>
              <button class="btn btn-sm btn-danger" type="button" onclick="window.sinetQuickInsert('${escAttr(id)}')">🎵 Ubaci</button>
            </div>
          </div>`;
      }).join('');
      return `
        <details open style="margin-bottom:10px;">
          <summary><strong>${esc(g)}</strong> <span class="text-muted">(${arr.length})</span></summary>
          <div style="margin-top:8px;">${rows}</div>
        </details>`;
    }).join('');
  }

  function getLastPatient(){
    try{ return JSON.parse(localStorage.getItem('ANAMNEZA_LAST_PATIENT') || 'null'); }catch(_){ return null; }
  }

  function buildIntegrativeInput(){
    const patient = getLastPatient();
    const notes = patient ? [
      patient.razlog,
      patient?.osobna?.sadasnja,
      patient?.osobna?.dosadasnje,
      patient?.status?.zakljucak,
      patient?.lijekovi || patient?.lekovi,
      patient?.alergije
    ].filter(Boolean).join(' | ') : '';
    return {
      icd: selectedICD || '',
      label: selectedICDLabel || selectedICD || '',
      notes,
      diagnosis: patient?.status?.zakljucak || '',
      goal: patient?.razlog || ''
    };
  }

  async function renderIntegrativeSuggestions(){
    const host = $('sinetIntegrativeSuggestions');
    if(!host) return;
    if(!(window.SINET_IntegrativeEngine && window.SINET_IntegrativeEngine.renderBundleHtml)){
      host.innerHTML = '<div class="text-muted">Integrativni engine nije dostupan.</div>';
      return;
    }
    try{
      await (window.SINET_IntegrativeEngine.preload ? window.SINET_IntegrativeEngine.preload() : Promise.resolve());
      const html = window.SINET_IntegrativeEngine.renderBundleHtml(buildIntegrativeInput(), {
        compact: true,
        heading: '🌿 Integrativni predlog iz Anamneze',
        intro: 'Na osnovu aktivnog MKB-a i poslednjeg anamneza profila, ovo su najlogičnije dopunske grane biblioteke.',
        basePrefix: './'
      });
      host.innerHTML = html;
    }catch(e){
      host.innerHTML = `<div class="text-muted">Ne mogu da prikažem integrativni predlog (${esc(e?.message || 'greška')}).</div>`;
    }
  }

  function selectICD(code, label){
    selectedICD = String(code||'').trim();
    selectedICDLabel = String(label||selectedICD);
    selectedIds = new Set();
    lastGuideHtml = '';

    const box = $('sinetSelectedIcd');
    if(box){
      const rest = selectedICDLabel.replace(selectedICD,'').trim();
      box.innerHTML = selectedICD ? `<span class="badge bg-success">${esc(selectedICD)}</span> <span class="text-muted">${esc(rest)}</span>` : '';
    }

    let rec = (dxIndex && selectedICD && dxIndex[selectedICD]) ? dxIndex[selectedICD] : null;
    // fallback: ako nema tačan match, probaj parent (pre tačke), npr. E00.0 -> E00
    if(!rec && selectedICD && selectedICD.includes('.')){
      const parent = selectedICD.split('.')[0];
      if(dxIndex && dxIndex[parent]) rec = dxIndex[parent];
    }
    let refs = rec && Array.isArray(rec.sinet_refs) ? rec.sinet_refs.slice() : [];
    let keywords = rec && Array.isArray(rec.keywords) ? rec.keywords.slice() : [];

    if((!refs || refs.length===0) && catalog && catalog.length){
      const needle = (selectedICDLabel||'').toLowerCase();
      const parts = needle.split(/\s+/).filter(x=>x.length>=4).slice(0,6);
      refs = [];
      for(const it of catalog){
        const hay = (String(it.simptom||'')+' '+String(it.naziv||'')+' '+String(it.opis||'')).toLowerCase();
        const ok = parts.some(p=>hay.includes(p));
        if(ok) refs.push(String(it.id));
        if(refs.length>=24) break;
      }
    }

    for(const id of refs) selectedIds.add(String(id));
    renderCandidates(refs, keywords);
    try{ renderIntegrativeSuggestions(); }catch(_){ }
  }

  function selectQuick(id){
    const qid = String(id||'').trim();
    if(!qid) return;
    selectedICD = 'BRZA';
    selectedICDLabel = 'Brza pomoć';
    selectedIds = new Set([qid]);
    lastGuideHtml = '';
    const box = $('sinetSelectedIcd');
    if(box) box.innerHTML = `<span class="badge bg-danger">BRZA</span> <span class="text-muted">Brza pomoć</span>`;
    renderCandidates([qid], []);
    try{ renderIntegrativeSuggestions(); }catch(_){ }
    const st = $('sinetLinkStatus');
    if(st) st.textContent = `Brza pomoć izabrana: ${qid}`;
  }

  function renderCandidates(refs, keywords){
    const el = $('sinetCandidates');
    if(!el) return;
    if(!selectedICD){
      el.innerHTML = '<div class="text-muted">Nije izabrana MKB-10 šifra.</div>';
      return;
    }

    const items = (refs||[]).map(id=>{
      const it = byId[String(id)];
      const title = it ? bestName(it) : id;
      const opis = it ? String(it.opis || '') : '';
      return { id:String(id), title:String(title), opis:String(opis) };
    });

    const kwLine = (keywords && keywords.length)
      ? `<div class="text-muted mb-2">keywords: ${keywords.slice(0,12).map(k=>`<code>${esc(k)}</code>`).join(' ')}</div>`
      : '';

    el.innerHTML = kwLine + (items.map(x=>`
      <label class="d-flex gap-2 align-items-start mb-1" style="cursor:pointer;">
        <input type="checkbox" ${selectedIds.has(x.id)?'checked':''} onchange="window.__toggleSinetRef('${escAttr(x.id)}', this.checked)">
        <div>
          <div><strong>${esc(x.title)}</strong></div>
          <div class="text-muted" style="font-size:0.82rem;">${esc(x.opis).slice(0,160)}${x.opis.length>160?'…':''}</div>
        </div>
      </label>
    `).join('')) || '<div class="text-muted">Nema predloga za ovaj ICD.</div>';
  }

  function buildProtocol(){
    if(!selectedICD) throw new Error('Nije izabran ICD.');
    const ids = Array.from(selectedIds);
    if(!ids.length) throw new Error('Nema izabranih SINET stavki.');

    const steps = [];
    for(const id of ids){
      const it = byId[String(id)];
      if(!it) continue;
      const freqs = Array.isArray(it.frekvencije) ? it.frekvencije : [];
      const perMinRaw = Number(it.trajanjePoFrekvencijiMin || it.trajanjeMin || 5) || 5;
      const perMin = Math.max(1, isFinite(perMinRaw) ? perMinRaw : 5);
      for(const f of freqs){
        if(!f || f.enabled === false) continue;
        const hz = Number(f.value ?? f.hz) || 0;
        if(!hz) continue;
        const obj = JSON.parse(JSON.stringify(f));
        obj.value = hz; obj.hz = hz;
        obj._from = { symptomId: it.id, symptom: bestName(it) };
        steps.push({ freq: obj, minutes: perMin });
      }
    }
    if(!steps.length) throw new Error('Izabrane stavke nemaju frekvencije.');

    const now = Date.now();
    const symptomOpis = ids.map(id=>{
      const it = byId[String(id)];
      return it ? (it.opis || it.naziv || it.simptom || it.id) : id;
    }).filter(Boolean).join(' | ');

    const list = ids.map(id=>{
      const it = byId[String(id)];
      const t = it ? bestName(it) : id;
      const o = it ? (it.opis || '') : '';
      return `<li><b>${esc(t)}</b><br><span style="color:#555">${esc(o)}</span></li>`;
    }).join('');

    const guideHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Anamneza – ${esc(selectedICD)}</title></head>
    <body style="font-family:system-ui,Segoe UI,Arial; padding:20px;">
      <h2>Anamneza – povezivanje sa SINET</h2>
      <p><b>MKB-10:</b> ${esc(selectedICDLabel)}</p>
      <h3>Izabrane SINET stavke</h3>
      <ol>${list}</ol>
      <hr><p style="font-size:12px;color:#666">Generisano iz Anamneze (SINET).</p>
    </body></html>`;

    lastGuideHtml = guideHtml;

    const integrativeRecommendations = (window.SINET_IntegrativeEngine && window.SINET_IntegrativeEngine.computeRecommendations)
      ? window.SINET_IntegrativeEngine.computeRecommendations(buildIntegrativeInput(), { basePrefix:'./' })
      : null;
    const integrativePlan = (window.SINET_IntegrativeEngine && window.SINET_IntegrativeEngine.computePlan)
      ? window.SINET_IntegrativeEngine.computePlan(buildIntegrativeInput(), { basePrefix:'./' })
      : null;

    const protocol = {
      id: `ANAM_${now}`,
      name: `Anamneza – ${selectedICD}`,
      steps,
      loopCount: 1,
      createdAt: now,
      updatedAt: now,
      _meta: { mkb10: selectedICD, dxLabel: selectedICDLabel, symptomOpis, integrativeRecommendations, integrativePlan },
      _guideHtml: guideHtml
    };

    const sharedContext = (window.SINET_SharedContext && window.SINET_SharedContext.refreshSharedContext)
      ? window.SINET_SharedContext.refreshSharedContext('anamneza_bridge', { currentState:{ source:'anamneza_bridge', symptom: selectedICDLabel || selectedICD || '', notes: symptomOpis || '' } })
      : null;
    const pack = { format:'SINET_SHAREPACK_v1', createdAt: now, protocol, sharedContext };
    return { pack, guideHtml, protocol, sharedContext };
  }

  window.selectICDFromAnamneza = selectICD;

  // Public functions for buttons
  window.__toggleSinetRef = (id, on)=>{
    const k = String(id);
    if(on) selectedIds.add(k); else selectedIds.delete(k);
  };

  window.sinetOpenGuidePreview = ()=>{
  try{
    if(!selectedICD) throw new Error('Nije izabrana MKB-10 šifra.');
    const refs = encodeURIComponent(Array.from(selectedIds).join(','));
    const url = `pages/integrativni_vodic.html?icd=${encodeURIComponent(selectedICD)}&label=${encodeURIComponent(selectedICDLabel||selectedICD)}&refs=${refs}&back=${encodeURIComponent(location.href)}`;
    window.open(url, '_blank', 'noopener');
  }catch(e){
    // fallback: old blob preview
    try{
      if(!lastGuideHtml) lastGuideHtml = buildProtocol().guideHtml;
      const blob = new Blob([String(lastGuideHtml)], {type:'text/html;charset=utf-8'});
      const u = URL.createObjectURL(blob);
      window.open(u, '_blank', 'noopener');
      setTimeout(()=>{ try{ URL.revokeObjectURL(u);}catch(_){} }, 60000);
    }catch(_){
      alert(e.message || 'Ne mogu da otvorim vodič.');
    }
  }
};

  window.sinetDownloadSharePack = ()=>{
    try{
      const { pack } = buildProtocol();
      const blob = new Blob([JSON.stringify(pack, null, 2)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SINET_SHAREPACK_ANAM_${selectedICD}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>{ try{ URL.revokeObjectURL(url);}catch(_){} }, 30000);
      const st = $('sinetLinkStatus'); if(st) st.textContent = 'SharePack preuzet ✅';
    }catch(e){ alert(e.message || 'Ne mogu da napravim SharePack.'); }
  };

  window.sinetCreateProtocolAndInsert = ()=>{
    try{
      const { protocol } = buildProtocol();
      const sharedContext = (window.SINET_SharedContext && window.SINET_SharedContext.refreshSharedContext)
        ? window.SINET_SharedContext.refreshSharedContext('anamneza_bridge', { currentState:{ source:'anamneza_insert_sinet', symptom: selectedICDLabel || selectedICD || '', notes: symptomOpis || '' } })
        : null;
      const bridge = { format:'SINET_DS_TO_PROTOCOL_v1', protocol, guideHtml: protocol._guideHtml, meta: protocol._meta, sharedContext };
      localStorage.setItem('SINET_DS_BRIDGE', JSON.stringify(bridge));
      location.href = 'index.html?dsimport=1';
    }catch(e){ alert(e.message || 'Ne mogu da ubacim u SINET.'); }
  };

  // Quick help public API
  window.sinetQuickSelect = (id)=>{ try{ selectQuick(id); }catch(e){ alert(e.message||'Ne mogu da izaberem.'); } };
  window.sinetQuickInsert = (id)=>{ try{ selectQuick(id); window.sinetCreateProtocolAndInsert(); }catch(e){ alert(e.message||'Ne mogu da ubacim.'); } };

  document.addEventListener('DOMContentLoaded', init);
})();
