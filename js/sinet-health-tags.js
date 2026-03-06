
(function(){
  let catalog = null;
  let mappings = null;

  async function loadJson(url){
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }
  function text(v){ return String(v ?? '').trim(); }
  function norm(v){
    return text(v).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function compute(ctx){
    const hay = [
      text(ctx?.profileSnapshot?.primaryDiagnosis),
      text(ctx?.profileSnapshot?.noteSummary),
      text(ctx?.profileSnapshot?.chronic),
      text(ctx?.profileSnapshot?.meds),
      text(ctx?.currentState?.symptom),
      text(ctx?.currentState?.goal),
      text(ctx?.currentState?.notes)
    ].join(' | ');
    const n = norm(hay);
    const out = [];
    const fallbackMap = {
      diabetes:['low_gi_support','lower_added_sugar','balanced_meals'],
      secer:['low_gi_support','lower_added_sugar'],
      hipertenzija:['lower_salt','balanced_meals'],
      pritisak:['lower_salt'],
      gastritis:['gentle_digestive','avoid_spicy'],
      kandida:['lower_added_sugar'],
      paraziti:['digestive_support'],
      jetra:['liver_gentle','lower_alcohol'],
      psorijaza:['anti_inflammatory_support'],
      bubreg:['renal_caution']
    };
    Object.keys(fallbackMap).forEach(k => {
      if(n.includes(k)) fallbackMap[k].forEach(tag => { if(!out.includes(tag)) out.push(tag); });
    });
    if(Array.isArray(mappings)){
      mappings.forEach(row => {
        const terms = Array.isArray(row.matchAny) ? row.matchAny : [];
        if(terms.some(t => n.includes(norm(t)))){
          (row.tags || []).forEach(tag => { if(!out.includes(tag)) out.push(tag); });
        }
      });
    }
    return out.slice(0, 12);
  }

  async function preload(){
    try{
      catalog = await loadJson('./data/bridge/health_tag_catalog_v1.json').catch(()=>null);
      mappings = await loadJson('./data/bridge/condition_to_health_tags_v1.json').catch(()=>null);
    }catch(_){}
  }

  window.SINET_HealthTags = { compute, preload };
  try{ preload(); }catch(_){}
})();
