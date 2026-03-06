
(function(){
  const STORAGE_KEY = 'SINET_PROFILES_CORE_V1';

  function safeJsonParse(raw, fallback){
    try{ return JSON.parse(raw); }catch(_){ return fallback; }
  }
  function nowIso(){ return new Date().toISOString(); }
  function clone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(_){ return null; } }
  function uid(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  function text(v){ return String(v ?? '').trim(); }
  function ageFromYear(year){
    const y = parseInt(year, 10);
    const cy = new Date().getFullYear();
    if(!y || y < 1900 || y > cy) return null;
    return cy - y;
  }
  function normalizeSex(raw){
    const s = text(raw).toLowerCase();
    if(!s) return '';
    if(s.startsWith('m')) return 'muški';
    if(s.startsWith('ž') || s.startsWith('z') || s.includes('fem')) return 'ženski';
    return s;
  }
  function profileLabel(p){
    if(!p) return 'Profil';
    const nm = [text(p.firstName||p.ime), text(p.lastName||p.prezime)].filter(Boolean).join(' ').trim();
    return nm || text(p.displayName) || text(p.nick) || text(p.diagnosis) || 'Profil';
  }
  function snapshot(p){
    if(!p) return null;
    return {
      profileId: p.id,
      label: profileLabel(p),
      firstName: text(p.firstName||p.ime),
      lastName: text(p.lastName||p.prezime),
      yearOfBirth: text(p.yearOfBirth||p.godina),
      approxAge: p.approxAge ?? ageFromYear(p.yearOfBirth||p.godina),
      sex: text(p.sex||p.pol),
      primaryDiagnosis: text(p.primaryDiagnosis||p.diagnosis),
      noteSummary: text(p.noteSummary||p.reason),
      allergies: text(p.allergies||p.alergije),
      chronic: text(p.chronic||p.hronika),
      meds: text(p.meds||p.lijekovi||p.lekovi),
      primaryIcd: text(p.primaryIcd||p.mkb10||p.mkb)
    };
  }
  function profileFromAnamneza(p){
    if(!p || typeof p !== 'object') return null;
    const o = p.osobni || {};
    const id = text(p.id) || uid('anam');
    const diagnosis = text((p.status||{}).zakljucak || p.razlog || (p.osobna||{}).sadasnja);
    const primaryIcd = text((p.dx && Array.isArray(p.dx.mkb10) && p.dx.mkb10[0] && (p.dx.mkb10[0].code || p.dx.mkb10[0].sifra)) || (p.dx && p.dx.mkb10 && (p.dx.mkb10.code || p.dx.mkb10.sifra)) || p.mkb10 || p.mkb || '');
    return {
      id,
      source: 'anamneza',
      createdAt: p.createdAt || nowIso(),
      updatedAt: nowIso(),
      displayName: [text(o.ime), text(o.prezime)].filter(Boolean).join(' ').trim(),
      firstName: text(o.ime),
      lastName: text(o.prezime),
      yearOfBirth: text(o.godina),
      sex: normalizeSex(o.pol),
      city: text(o.mjesto),
      address: text(o.adresa),
      occupation: text(o.zanimanje),
      maritalStatus: text(o.bracno),
      children: text(o.djeca),
      reason: text(p.razlog),
      familyHistory: text(p.obiteljska),
      personalHistory: text((p.osobna||{}).dosadasnje),
      currentCondition: text((p.osobna||{}).sadasnja),
      allergies: text(p.alergije),
      chronic: text((p.osobna||{}).dosadasnje),
      meds: text(p.lijekovi || p.lekovi),
      primaryDiagnosis: diagnosis,
      primaryIcd: primaryIcd,
      noteSummary: [text(p.razlog), diagnosis].filter(Boolean).join(' · '),
      rawAnamneza: clone(p)
    };
  }
  function readCore(){
    const empty = { version:'1.0', updatedAt: nowIso(), defaultProfileId:null, activeProfileId:null, profiles:[] };
    const core = safeJsonParse(localStorage.getItem(STORAGE_KEY), empty) || empty;
    if(!Array.isArray(core.profiles)) core.profiles = [];
    return core;
  }
  function writeCore(core){
    core.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(core));
    return core;
  }
  function ensureLegacyBootstrap(){
    const core = readCore();
    if(core.profiles.length) return core;
    const last = safeJsonParse(localStorage.getItem('ANAMNEZA_LAST_PATIENT'), null);
    const list = safeJsonParse(localStorage.getItem('anamneza_pacijenti'), []);
    let changed = false;
    if(Array.isArray(list)){
      list.forEach(p=>{
        const prof = profileFromAnamneza(p);
        if(prof && !core.profiles.find(x => x.id === prof.id)){
          core.profiles.push(prof);
          changed = true;
        }
      });
    }
    if(last){
      const prof = profileFromAnamneza(last);
      if(prof){
        const idx = core.profiles.findIndex(x => x.id === prof.id);
        if(idx >= 0) core.profiles[idx] = {...core.profiles[idx], ...prof, updatedAt: nowIso()};
        else core.profiles.push(prof);
        core.activeProfileId = prof.id;
        if(!core.defaultProfileId) core.defaultProfileId = prof.id;
        changed = true;
      }
    }
    if(changed) writeCore(core);
    return core;
  }
  function getProfiles(){ return ensureLegacyBootstrap().profiles || []; }
  function getProfileById(id){ return getProfiles().find(p => p.id === id) || null; }
  function getActiveProfile(){
    const core = ensureLegacyBootstrap();
    return getProfileById(core.activeProfileId) || getProfileById(core.defaultProfileId) || core.profiles[0] || null;
  }
  function getDefaultProfile(){
    const core = ensureLegacyBootstrap();
    return getProfileById(core.defaultProfileId) || core.profiles[0] || null;
  }
  function upsertProfile(profile, options){
    if(!profile || typeof profile !== 'object') return null;
    const core = readCore();
    const item = { ...profile };
    item.id = text(item.id) || uid('profile');
    item.displayName = text(item.displayName) || [text(item.firstName), text(item.lastName)].filter(Boolean).join(' ').trim() || 'Profil';
    item.updatedAt = nowIso();
    const idx = core.profiles.findIndex(p => p.id === item.id);
    if(idx >= 0) core.profiles[idx] = { ...core.profiles[idx], ...item };
    else core.profiles.push(item);
    if(options && options.setActive) core.activeProfileId = item.id;
    if(options && options.setDefault) core.defaultProfileId = item.id;
    if(!core.defaultProfileId) core.defaultProfileId = item.id;
    if(!core.activeProfileId) core.activeProfileId = item.id;
    writeCore(core);
    return core.profiles.find(p => p.id === item.id) || item;
  }
  function upsertProfileFromAnamneza(patient, options){
    const profile = profileFromAnamneza(patient);
    if(!profile) return null;
    return upsertProfile(profile, options || { setActive:true });
  }
  function setActiveProfileById(id){
    const core = readCore();
    if(!getProfileById(id)) return null;
    core.activeProfileId = id;
    writeCore(core);
    emitProfilesChanged('set-active');
    return getProfileById(id);
  }
  function setDefaultProfileById(id){
    const core = readCore();
    if(!getProfileById(id)) return null;
    core.defaultProfileId = id;
    if(!core.activeProfileId) core.activeProfileId = id;
    writeCore(core);
    emitProfilesChanged('set-default');
    return getProfileById(id);
  }
  function getProfileHeaderHtml(profile){
    const p = profile || getActiveProfile();
    if(!p) return '';
    const s = snapshot(p) || {};
    const bits = [];
    if(s.yearOfBirth) bits.push(`rođ. ${s.yearOfBirth}${s.approxAge!=null ? ` (~${s.approxAge} god.)` : ''}`);
    if(s.sex) bits.push(s.sex);
    if(s.primaryDiagnosis) bits.push(s.primaryDiagnosis);
    return `<div class="sinet-profile-banner" style="margin:12px 0; padding:12px 14px; background:#eef6ff; border:1px solid #cfe0f5; border-radius:14px;">
      <div style="font-weight:800; color:#1e4660;">🧾 Aktivni profil: ${escapeHtml(s.label || 'Profil')}</div>
      ${bits.length ? `<div class="small" style="margin-top:6px; color:#456;">${bits.map(escapeHtml).join(' · ')}</div>` : ''}
    </div>`;
  }
  function getProfileSnapshotHtml(profile, options){
    const s = snapshot(profile || getActiveProfile());
    if(!s) return '';
    const tags = [];
    if(s.yearOfBirth) tags.push(`God. rođ.: ${s.yearOfBirth}${s.approxAge!=null ? ` (~${s.approxAge} god.)` : ''}`);
    if(s.sex) tags.push(`Pol: ${s.sex}`);
    if(s.primaryDiagnosis) tags.push(`Fokus: ${s.primaryDiagnosis}`);
    if(s.allergies) tags.push(`Alergije: ${s.allergies}`);
    if(s.meds && !(options && options.hideMeds)) tags.push(`Terapija: ${s.meds}`);
    return `<div class="profile-snapshot card">
      <div style="font-weight:900; margin-bottom:8px;">🧾 Profilni snapshot</div>
      <div><strong>Profil:</strong> ${escapeHtml(s.label || 'Profil')}</div>
      ${tags.length ? `<ul style="margin:10px 0 0 18px;">${tags.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '<div class="small" style="margin-top:8px;">Nema dodatnih profilnih podataka.</div>'}
    </div>`;
  }
  function emitProfilesChanged(reason){
    try{ window.dispatchEvent(new CustomEvent('sinet:profiles-changed', { detail:{ reason: reason || 'update', active: getActiveProfile(), defaultProfile: getDefaultProfile() } })); }catch(_){ }
  }

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.SINET_ProfilesCore = {
    STORAGE_KEY,
    readCore,
    writeCore,
    ensureLegacyBootstrap,
    getProfiles,
    getProfileById,
    getActiveProfile,
    getDefaultProfile,
    upsertProfile,
    upsertProfileFromAnamneza,
    setActiveProfileById,
    setDefaultProfileById,
    profileFromAnamneza,
    snapshot,
    profileLabel,
    getProfileHeaderHtml,
    getProfileSnapshotHtml
  };

  try{ ensureLegacyBootstrap(); }catch(_){}
})();
