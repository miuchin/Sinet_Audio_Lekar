
(function(){
  const STORAGE_KEY = 'SINET_SHARED_CONTEXT_V1';

  function safeJsonParse(raw, fallback){ try{ return JSON.parse(raw); }catch(_){ return fallback; } }
  function nowIso(){ return new Date().toISOString(); }
  function text(v){ return String(v ?? '').trim(); }

  function profileSnapshot(profile){
    try{
      return window.SINET_ProfilesCore && window.SINET_ProfilesCore.snapshot
        ? window.SINET_ProfilesCore.snapshot(profile)
        : null;
    }catch(_){ return null; }
  }
  function getActiveProfile(){
    try{
      return window.SINET_ProfilesCore && window.SINET_ProfilesCore.getActiveProfile
        ? window.SINET_ProfilesCore.getActiveProfile()
        : null;
    }catch(_){ return null; }
  }
  function buildSharedContext(toolName, extra){
    const profile = getActiveProfile();
    const ctx = {
      version: '1.0',
      updatedAt: nowIso(),
      tool: text(toolName) || 'sinet',
      activeProfileId: profile ? profile.id : null,
      defaultProfileId: (window.SINET_ProfilesCore && window.SINET_ProfilesCore.readCore && window.SINET_ProfilesCore.readCore().defaultProfileId) || null,
      profileSnapshot: profileSnapshot(profile),
      currentState: {},
      tags: []
    };
    const lastPatient = safeJsonParse(localStorage.getItem('ANAMNEZA_LAST_PATIENT'), null);
    if(lastPatient) ctx.lastAnamnezaPatientId = text(lastPatient.id);
    if(extra && typeof extra === 'object'){
      ctx.currentState = { ...(extra.currentState || {} ) };
      if(Array.isArray(extra.tags)) ctx.tags = extra.tags.slice();
      for(const [k,v] of Object.entries(extra)){
        if(k === 'currentState' || k === 'tags') continue;
        ctx[k] = v;
      }
    }
    try{
      if(window.SINET_HealthTags && typeof window.SINET_HealthTags.compute === 'function'){
        ctx.tags = window.SINET_HealthTags.compute(ctx);
      }
    }catch(_){}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    return ctx;
  }
  function refreshSharedContext(toolName, extra){ return buildSharedContext(toolName, extra || {}); }
  function getSharedContext(){
    const existing = safeJsonParse(localStorage.getItem(STORAGE_KEY), null);
    if(existing && typeof existing === 'object') return existing;
    return buildSharedContext('sinet');
  }
  function setToolState(toolName, state){
    const ctx = getSharedContext();
    ctx.tool = text(toolName) || ctx.tool || 'sinet';
    ctx.updatedAt = nowIso();
    ctx.currentState = { ...(ctx.currentState || {}), ...(state || {}) };
    try{
      if(window.SINET_HealthTags && typeof window.SINET_HealthTags.compute === 'function'){
        ctx.tags = window.SINET_HealthTags.compute(ctx);
      }
    }catch(_){}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    return ctx;
  }
  function getProfileSnapshotHtml(){
    try{
      return window.SINET_ProfilesCore && window.SINET_ProfilesCore.getProfileSnapshotHtml
        ? window.SINET_ProfilesCore.getProfileSnapshotHtml(getActiveProfile())
        : '';
    }catch(_){ return ''; }
  }
  function getActiveProfileHeaderHtml(){
    try{
      return window.SINET_ProfilesCore && window.SINET_ProfilesCore.getProfileHeaderHtml
        ? window.SINET_ProfilesCore.getProfileHeaderHtml(getActiveProfile())
        : '';
    }catch(_){ return ''; }
  }

  window.SINET_SharedContext = {
    STORAGE_KEY,
    buildSharedContext,
    refreshSharedContext,
    getSharedContext,
    setToolState,
    getProfileSnapshotHtml,
    getActiveProfileHeaderHtml
  };

  try{ getSharedContext(); }catch(_){}
})();
