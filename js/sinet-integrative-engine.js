(function(){
  let manifest = null;
  let rules = null;

  function candidateUrls(rel){
    const p = String((location && location.pathname) || '');
    if (p.includes('/docs/protokoli/')) return ['../../' + rel, '../' + rel, './' + rel, '/' + rel];
    if (p.includes('/pages/')) return ['../' + rel, './' + rel, '/' + rel];
    return ['./' + rel, '../' + rel, '/' + rel];
  }

  const MANIFEST_URLS = candidateUrls('data/integrative_methods/library_manifest_v1.json');
  const RULE_URLS = candidateUrls('data/bridge/integrative_routing_rules_v1.json');

  function text(v){ return String(v ?? '').trim(); }
  function norm(v){
    return text(v).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9čćžšđ]+/gi,' ')
      .replace(/[čć]/g,'c').replace(/ž/g,'z').replace(/[š]/g,'s').replace(/[đ]/g,'dj')
      .replace(/\s+/g,' ')
      .trim();
  }
  function uniq(arr){ return Array.from(new Set((arr||[]).filter(Boolean))); }
  function firstNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function cap(v){ const s = text(v); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  async function loadJsonFirst(urls){
    for(const u of urls){
      try{
        const r = await fetch(u, {cache:'no-store'});
        if(!r.ok) continue;
        return await r.json();
      }catch(_){ }
    }
    return null;
  }
  function inferBasePrefix(){
    try{
      const p = String(location.pathname || '');
      return p.includes('/pages/') ? '../' : './';
    }catch(_){ return './'; }
  }
  function resolvePath(path, basePrefix){
    const p = text(path);
    if(!p) return '#';
    if(/^https?:/i.test(p)) return p;
    if(p.startsWith('./') || p.startsWith('../') || p.startsWith('/')) return p;
    return (basePrefix || inferBasePrefix()) + p;
  }

  async function preload(){
    if(!manifest) manifest = await loadJsonFirst(MANIFEST_URLS);
    if(!rules) rules = await loadJsonFirst(RULE_URLS);
    return { manifest, rules };
  }

  function getActiveProfile(){
    try{ return window.SINET_ProfilesCore && window.SINET_ProfilesCore.getActiveProfile ? window.SINET_ProfilesCore.getActiveProfile() : null; }catch(_){ return null; }
  }
  function getSharedContext(){
    try{ return window.SINET_SharedContext && window.SINET_SharedContext.getSharedContext ? window.SINET_SharedContext.getSharedContext() : null; }catch(_){ return null; }
  }

  function buildContext(input){
    const ctxShared = getSharedContext() || {};
    const profile = input?.profile || getActiveProfile() || null;
    const profileSnap = input?.profileSnapshot || ctxShared.profileSnapshot || (window.SINET_ProfilesCore && window.SINET_ProfilesCore.snapshot ? window.SINET_ProfilesCore.snapshot(profile) : null) || null;
    const icd = text(input?.icd || input?.mkb10 || input?.code || ctxShared.currentState?.icd || '');
    const label = text(input?.label || input?.title || input?.symptom || ctxShared.currentState?.symptom || profileSnap?.primaryDiagnosis || '');
    const notes = text(input?.notes || input?.reason || input?.opis || input?.description || input?.status || ctxShared.currentState?.notes || profileSnap?.noteSummary || '');
    const goal = text(input?.goal || input?.fokus || ctxShared.currentState?.goal || '');
    const diagnosis = text(input?.diagnosis || profileSnap?.primaryDiagnosis || '');
    const meds = text(input?.meds || profileSnap?.meds || '');
    const chronic = text(input?.chronic || profileSnap?.chronic || '');
    const approxAge = firstNumber(input?.approxAge ?? profileSnap?.approxAge);
    const healthTags = uniq([...(input?.tags || []), ...((ctxShared && Array.isArray(ctxShared.tags)) ? ctxShared.tags : [])]);
    const hay = [icd, label, diagnosis, notes, goal, meds, chronic, text(input?.extraText)].join(' | ');
    return {
      icd,
      icdPrefix: icd ? icd.split('.')[0].toUpperCase() : '',
      label,
      diagnosis,
      notes,
      goal,
      meds,
      chronic,
      approxAge,
      healthTags,
      profile,
      profileSnapshot: profileSnap,
      haystackRaw: hay,
      haystack: norm(hay),
      sharedContext: ctxShared,
      seniorMode: Number.isFinite(approxAge) && approxAge >= 65,
      cardioCare: healthTags.includes('cardio') || /^I\d{2}/.test(icd),
      lowEnergyMode: /umor|iscrpljen|slaba forma|zamor|malaksal|nesanica/.test(norm(hay)),
      sleepNeed: /san|spavanje|nesanica|tesko uspavljivanje|budjenje nocu|umor/.test(norm(hay)),
      stressLoad: /stres|anksioz|preplavljen|napet|nemir|ruminacija|panik/.test(norm(hay))
    };
  }

  function methodMap(){
    const list = (manifest && Array.isArray(manifest.publishedMethods)) ? manifest.publishedMethods : [];
    const out = {};
    list.forEach(m => { if(m && m.id) out[m.id] = m; });
    return out;
  }
  function ruleMap(){
    const list = (rules && Array.isArray(rules.methods)) ? rules.methods : [];
    const out = {};
    list.forEach(r => { if(r && r.id) out[r.id] = r; });
    return out;
  }

  function collectMatches(haystack, patterns, maxCount){
    const hits = [];
    (patterns || []).forEach(p => {
      const n = norm(p);
      if(n && haystack.includes(n) && !hits.includes(p)) hits.push(p);
    });
    return typeof maxCount === 'number' ? hits.slice(0, maxCount) : hits;
  }

  function collectForSymptomsMatches(ctx, method){
    const hay = ctx.haystack;
    const hits = [];
    (method.forSymptoms || []).forEach(p => {
      const np = norm(p);
      if(!np) return;
      if(hay.includes(np)) { hits.push(p); return; }
      const words = np.split(' ').filter(w => w.length >= 4);
      const matchedWords = words.filter(w => hay.includes(w));
      if(words.length >= 2 && matchedWords.length >= Math.min(2, words.length)) hits.push(p);
    });
    return uniq(hits).slice(0, 3);
  }

  function computeRecommendations(input, options){
    const ctx = buildContext(input || {});
    const methodsById = methodMap();
    const rulesById = ruleMap();
    const redFlags = collectMatches(ctx.haystack, (rules && rules.globalRedFlags) || [], 12);
    const items = [];
    const basePrefix = (options && options.basePrefix) || inferBasePrefix();

    Object.keys(methodsById).forEach(id => {
      const method = methodsById[id];
      const rule = rulesById[id] || {};
      let score = 0;
      const why = [];
      const cautions = [];

      const keywordHits = collectMatches(ctx.haystack, rule.matchAny || [], rule.maxKeywords || 3);
      if(keywordHits.length){
        score += keywordHits.length * Number(rule.weightKeyword || 1.5);
        why.push(`poklapanje simptoma/teksta: ${keywordHits.join(', ')}`);
      }

      const forSymHits = collectForSymptomsMatches(ctx, method);
      if(forSymHits.length){
        score += Math.min(3, forSymHits.length) * 1.1;
        why.push(`biblioteka sugeriše: ${forSymHits.join(', ')}`);
      }

      const icdMatches = uniq((rule.icdPrefixes || []).filter(prefix => ctx.icdPrefix && ctx.icdPrefix.startsWith(String(prefix).toUpperCase())));
      if(icdMatches.length){
        score += icdMatches.length * Number(rule.weightIcd || 2.5);
        why.push(`MKB-10 obrazac: ${icdMatches.join(', ')}`);
      }

      const tagHits = uniq((rule.boostHealthTags || []).filter(tag => ctx.healthTags.includes(tag)));
      if(tagHits.length){
        score += tagHits.length * 0.8;
        why.push(`profil / tagovi: ${tagHits.join(', ')}`);
      }

      if(Number.isFinite(ctx.approxAge) && ctx.approxAge >= 65 && (rule.boostHealthTags || []).includes('senior')){
        score += 0.5;
        why.push('senior profil: kretati nežno i postepeno');
      }

      const avoidHits = collectMatches(ctx.haystack, rule.avoidIfAny || [], 4);
      if(avoidHits.length){
        score = Math.max(0, score - 2.2);
        cautions.push(`oprez zbog: ${avoidHits.join(', ')}`);
      }

      if(redFlags.length){
        if(id !== 'acupuncture') score = Math.max(0, score - 1.4);
        cautions.push('prvo proveri red flags; samopomoć ne sme da odlaže pregled');
      }

      if(method.id === 'acupuncture') cautions.push('profesionalni modul - nije kućna primena');
      if(method.id === 'thermotherapy') cautions.push('ne stavljati toplotu/hladnoću direktno na oštećenu kožu');

      if(score > 0){
        items.push({
          id: method.id,
          title: method.title,
          emoji: method.emoji || '🌿',
          category: method.category || '',
          evidenceTier: method.evidenceTier || '',
          status: method.status || 'published',
          summary: method.summary || '',
          forSymptoms: method.forSymptoms || [],
          page: resolvePath(method.page, basePrefix),
          doc: resolvePath(method.doc, basePrefix),
          seed: resolvePath(method.seed, basePrefix),
          score: Number(score.toFixed(2)),
          why: uniq(why).slice(0, 3),
          cautions: uniq(cautions).slice(0, 3),
          sourceIds: method.sources || []
        });
      }
    });

    items.sort((a,b) => b.score - a.score || String(a.title).localeCompare(String(b.title), 'sr'));
    let recommendations = items.slice(0, 6);

    if(!recommendations.length){
      const fb = ((rules && rules.fallbackOrder) || []).map(id => methodsById[id]).filter(Boolean);
      recommendations = fb.slice(0, 4).map((method, idx) => ({
        id: method.id,
        title: method.title,
        emoji: method.emoji || '🌿',
        category: method.category || '',
        evidenceTier: method.evidenceTier || '',
        status: method.status || 'published',
        summary: method.summary || '',
        forSymptoms: method.forSymptoms || [],
        page: resolvePath(method.page, basePrefix),
        doc: resolvePath(method.doc, basePrefix),
        seed: resolvePath(method.seed, basePrefix),
        score: Number((2 - idx * 0.15).toFixed(2)),
        why: ['bazna lifestyle / self-care podrška kada nema jačeg poklapanja'],
        cautions: redFlags.length ? ['postoje red flags - ne odlagati pregled'] : [],
        sourceIds: method.sources || []
      }));
    }

    return {
      generatedAt: new Date().toISOString(),
      context: {
        icd: ctx.icd,
        label: ctx.label,
        diagnosis: ctx.diagnosis,
        goal: ctx.goal,
        approxAge: ctx.approxAge,
        healthTags: ctx.healthTags,
        profileLabel: text(ctx.profileSnapshot && ctx.profileSnapshot.label)
      },
      redFlags,
      recommendations
    };
  }

  function levelForScore(score){
    if(score >= 7) return 'Visok prioritet';
    if(score >= 4) return 'Dobra podudarnost';
    return 'Šira podrška';
  }

  function recommendationsToBadges(data){
    const recs = (data && Array.isArray(data.recommendations)) ? data.recommendations : [];
    return recs.slice(0,4).map(r => `${r.emoji || '🌿'} ${r.title}`).join(' · ');
  }

  function classifyMethod(id){
    const map = {
      breathing:'reset',
      mindfulness:'reset',
      relaxation_guided:'reset',
      sleep_hygiene:'recovery',
      movement:'movement',
      yoga_tai_chi_qigong:'movement',
      thermotherapy:'body',
      massage_manual:'body',
      acupuncture:'professional'
    };
    return map[id] || 'support';
  }

  function baseMethodPlan(id, ctx, rec){
    const gentle = ctx.seniorMode || !!((rec && rec.cautions || []).length) || ctx.lowEnergyMode;
    const safeWalkMin = gentle ? 8 : 15;
    const safeMindMin = gentle ? 4 : 6;
    const safeBodyMin = gentle ? 8 : 12;
    const plans = {
      breathing: {
        slot:'jutro',
        durationMin: safeMindMin,
        cadence:'1–2× dnevno',
        title:'Sporo terapijsko disanje',
        instruction:`Udah ${gentle ? '4' : '4–5'} s, izdah ${gentle ? '6' : '6–8'} s; ramena opuštena, bez forsiranja.`,
        progression:'Dodaj još 1 kratak ciklus popodne ako prija.',
        caution:'Prekini ako se javi vrtoglavica, gušenje ili bol u grudima.',
        kind:'self_care'
      },
      mindfulness: {
        slot:'podne / veče',
        durationMin: gentle ? 5 : 8,
        cadence:'1× dnevno',
        title:'Kratki mindfulness reset',
        instruction:'5–8 minuta usmeri pažnju na disanje, telo i okolinu bez procenjivanja.',
        progression:'Od 3. dana produži za 2–3 minuta ako te ne zamara.',
        caution:'Ako pojačava unutrašnji nemir, skrati trajanje i vrati se na disanje.',
        kind:'self_care'
      },
      relaxation_guided: {
        slot:'veče',
        durationMin: gentle ? 8 : 10,
        cadence:'1× dnevno',
        title:'Relaksacija / PMR',
        instruction:'Prođi glavne mišićne grupe: nežno zategni 2–3 s, pa opusti 8–10 s.',
        progression:'Od 2–3. dana uvedi i vođenu maštu ili umirujući audio zapis.',
        caution:'Ne steži bolno područje snažno; cilj je opuštanje, ne napor.',
        kind:'self_care'
      },
      sleep_hygiene: {
        slot:'pred spavanje',
        durationMin: 20,
        cadence:'svako veče',
        title:'Ritual za san',
        instruction:'20 min ranije ugasi ekrane, priguši svetlo, topliji napitak bez kofeina ili tiha rutina.',
        progression:'Drži isto vreme odlaska na spavanje kroz svih 7 dana.',
        caution:'Ako se javljaju noćno gušenje, jaka bol ili konfuzija, traži procenu.',
        kind:'self_care'
      },
      movement: {
        slot:'prepodnevni ili rani popodnevni termin',
        durationMin: safeWalkMin,
        cadence:'1× dnevno',
        title:'Šetnja / blago kretanje',
        instruction:`Lagano hodanje ili kruženje po stanu ${safeWalkMin}–${safeWalkMin + (gentle ? 4 : 8)} min, tempom pri kom možeš da govoriš.`,
        progression:'Povećaj za 2–3 min od 3–4. dana ako nema pogoršanja.',
        caution:'Preskoči tog dana kod temperature, sveže traume, nesvestice ili teškog disanja.',
        kind:'self_care'
      },
      yoga_tai_chi_qigong: {
        slot:'podne / rani večernji termin',
        durationMin: gentle ? 6 : 10,
        cadence:'1× dnevno ili svaki drugi dan',
        title:'Nežan mind-body pokret',
        instruction:'Biraj spore prelaze, ravnotežu uz oslonac i pokrete bez bola.',
        progression:'Od 4. dana dodaj 1–2 nežne serije ili malo duži tok.',
        caution:'Izostavi ako se javljaju nestabilnost, padanje ili jaka vrtoglavica.',
        kind:'self_care'
      },
      thermotherapy: {
        slot:'popodne / veče',
        durationMin: safeBodyMin,
        cadence:'1–2× dnevno',
        title:'Blaga toplota ili hladnoća',
        instruction:'Toplota za ukočenost/spazam, hladnoća za svežu oteklinu; uvek preko tkanine.',
        progression:'Zadrži kratko i proveri kožu posle svake primene.',
        caution:'Ne koristiti na oštećenoj koži, infekciji, utrnulom području ili uz jako crvenilo.',
        kind:'self_care'
      },
      massage_manual: {
        slot:'popodne',
        durationMin: gentle ? 5 : 8,
        cadence:'po potrebi 1× dnevno',
        title:'Kratka blaga samomasaža',
        instruction:'Oko vrata/ramena ili bolne muskulature radi nežne kružne pokrete, bez agresivnog pritiskanja.',
        progression:'Ako prija, spoji sa toplom oblogom ili relaksacijom.',
        caution:'Ne masirati svežu traumu, jače crvenilo, sumnju na trombozu ili infekciju.',
        kind:'self_care'
      },
      acupuncture: {
        slot:'tokom nedelje',
        durationMin: 0,
        cadence:'po dogovoru sa stručnjakom',
        title:'Profesionalna konsultacija za akupunkturu',
        instruction:'Ako je već preporučena i stanje je stabilno, razmotri pregled kod obučenog profesionalca.',
        progression:'Nije kućna tehnika; samo stručno izvođenje.',
        caution:'Ne uvoditi kao zamenu za standardnu obradu ili kad postoje red flags.',
        kind:'professional'
      }
    };
    const base = plans[id] || {
      slot:'tokom dana',
      durationMin: 6,
      cadence:'1× dnevno',
      title: rec?.title || 'Integrativna podrška',
      instruction:'Sprovesti nežno i kratko, u skladu sa tolerancijom.',
      progression:'Pojačavati tek kada je prethodni nivo dobro podnet.',
      caution:'Prekini ako se simptomi pogoršavaju.',
      kind:'self_care'
    };
    return {
      ...base,
      methodId: id,
      methodTitle: rec?.title || base.title,
      emoji: rec?.emoji || '🌿',
      evidenceTier: rec?.evidenceTier || '',
      score: rec?.score || 0,
      link: rec?.page || '#',
      doc: rec?.doc || '#'
    };
  }

  function selectPlanMethods(recommendations){
    const recs = Array.isArray(recommendations) ? recommendations : [];
    const groups = { reset: [], movement: [], body: [], recovery: [], professional: [], support: [] };
    recs.forEach(r => {
      const key = classifyMethod(r.id);
      (groups[key] || groups.support).push(r);
    });
    const selected = [];
    const addTop = (arr) => { if(arr && arr.length) selected.push(arr[0]); };
    addTop(groups.reset);
    addTop(groups.movement);
    addTop(groups.body);
    addTop(groups.recovery);
    if(groups.professional.length && groups.professional[0].score >= 7) selected.push(groups.professional[0]);
    recs.forEach(r => { if(selected.length >= 5) return; if(!selected.find(x => x.id === r.id)) selected.push(r); });
    return selected.slice(0, 5);
  }

  function nonProfessionalItems(items){ return (items || []).filter(x => x.kind !== 'professional'); }
  function totalMinutes(items){ return nonProfessionalItems(items).reduce((sum, it) => sum + Number(it.durationMin || 0), 0); }

  function buildTodayPlan(ctx, selectedRecs){
    const items = selectedRecs.map(rec => baseMethodPlan(rec.id, ctx, rec));
    const precautions = [];
    if(ctx.seniorMode) precautions.push('Senior profil: sve raditi sporije, kraće i uz pauzu.');
    if(ctx.lowEnergyMode) precautions.push('Nizak energetski nivo: drži ukupno kratko i raspoređeno.');
    if(ctx.stressLoad) precautions.push('Ako si preplavljen, prva stanica neka bude disanje / relaksacija.');
    return {
      title:'Plan za danas',
      totalMinutes: totalMinutes(items),
      style: ctx.seniorMode ? 'nežan tempo' : 'umeren, postepen tempo',
      checkin:[
        'Ujutru i uveče oceni simptom 0–10.',
        'Ako se stanje pogorša 2+ poena, skrati plan i proveri uzrok.',
        'Pij dovoljno tečnosti i napravi kratke pauze između blokova.'
      ],
      precautions: uniq(precautions),
      items
    };
  }

  function cloneDayItem(base, factor, dayNumber, ctx){
    const isProfessional = base.kind === 'professional';
    const durationMin = isProfessional ? 0 : Math.max(3, Math.round(Number(base.durationMin || 0) * factor));
    let instruction = base.instruction;
    if(!isProfessional){
      if(dayNumber >= 4) instruction += ' Ako je tolerancija dobra, dodaj 1–2 min ili još jedan kratak ciklus.';
      if(dayNumber === 7) instruction += ' Dan 7 koristi i za mirniju proveru šta ti je najviše prijalo.';
    }
    return {
      ...base,
      durationMin,
      instruction,
      microGoal: isProfessional ? 'organizuj konsultaciju samo ako ima smisla za tvoje stanje' : (ctx.seniorMode ? 'bez žurbe i bez provociranja simptoma' : 'blaga progresija bez forsiranja')
    };
  }

  function buildWeekPlan(ctx, selectedRecs){
    const base = selectedRecs.map(rec => baseMethodPlan(rec.id, ctx, rec));
    const patterns = ctx.seniorMode || ctx.lowEnergyMode
      ? [0.9, 0.9, 1.0, 1.0, 1.05, 1.05, 0.85]
      : [1.0, 1.0, 1.1, 1.15, 1.2, 1.2, 0.9];
    const focuses = [
      'smirivanje i tolerancija',
      'ponovi isti lagani ritam',
      'blaga stabilizacija',
      'mala progresija',
      'održavanje i ritam',
      'najbolja kombinacija iz prethodnih dana',
      'laganiji dan + procena efekta'
    ];
    const days = patterns.map((factor, idx) => {
      const dayNumber = idx + 1;
      const items = base
        .filter(it => !(it.kind === 'professional' && dayNumber !== (ctx.seniorMode ? 5 : 3)))
        .map(it => cloneDayItem(it, factor, dayNumber, ctx));
      return {
        dayNumber,
        label:`Dan ${dayNumber}`,
        focus: focuses[idx],
        totalMinutes: totalMinutes(items),
        items,
        eveningCheck:'Uveče kratko zabeleži: simptom, energija, san, šta je prijalo / nije prijalo.'
      };
    });
    return {
      title:'Plan za 7 dana',
      rhythm: ctx.seniorMode ? 'nežna sedmodnevna progresija' : 'postepena sedmodnevna progresija',
      days,
      rule:'Ako bilo koji blok jasno pogoršava simptome, skrati ga ili ga preskoči sledeći dan.',
      pauseRule:'Posle 7 dana napravi mini pregled efekta i odluči da li ide ista nedelja, lakša verzija ili pauza.'
    };
  }

  function computePlan(input, options){
    const ctx = buildContext(input || {});
    const recommendationsData = computeRecommendations(input, options);
    const selectedRecs = selectPlanMethods(recommendationsData.recommendations);
    const today = buildTodayPlan(ctx, selectedRecs);
    const week = buildWeekPlan(ctx, selectedRecs);
    const globalNotes = [];
    if(recommendationsData.redFlags.length) globalNotes.push('Postoje red flags — plan je samo pomoćni, pregled ima prioritet.');
    if(ctx.seniorMode) globalNotes.push('Za senior profil biraj kraće blokove i više sedenja/odmora između aktivnosti.');
    if(ctx.cardioCare) globalNotes.push('Kod kardiovaskularnih tegoba drži tempo u kome možeš normalno da govoriš.');
    return {
      generatedAt: new Date().toISOString(),
      context: recommendationsData.context,
      redFlags: recommendationsData.redFlags,
      basedOn: selectedRecs.map(r => ({ id:r.id, title:r.title, score:r.score, evidenceTier:r.evidenceTier })),
      style: today.style,
      globalNotes: uniq(globalNotes),
      today,
      week
    };
  }

  function renderSummaryHtml(input, options){
    const data = computeRecommendations(input, options);
    const compact = !!(options && options.compact);
    const heading = text(options && options.heading) || '🌿 Integrativni predlog za ovaj profil';
    const intro = text(options && options.intro) || 'Biblioteka predlaže sledeće dopunske grane na osnovu MKB-a, simptoma i aktivnog profila.';
    const cards = data.recommendations.map(item => `
      <article style="background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:${compact ? '12px' : '14px'}; box-shadow:0 8px 18px rgba(15,23,42,.05);">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <div style="font-weight:800; color:#0f766e;">${escapeHtml(item.emoji || '🌿')} ${escapeHtml(item.title)}</div>
            <div style="font-size:.85rem; color:#475569; margin-top:4px;">${escapeHtml(levelForScore(item.score))} · Evidence ${escapeHtml(item.evidenceTier || '-')} · ${escapeHtml(item.category || '')}</div>
          </div>
          <div style="font-size:.85rem; color:#334155; background:#ecfeff; border:1px solid #bae6fd; border-radius:999px; padding:5px 10px;">score ${escapeHtml(item.score)}</div>
        </div>
        <p style="margin:10px 0 8px; color:#334155;">${escapeHtml(item.summary || '')}</p>
        ${item.why && item.why.length ? `<div style="font-size:.92rem; color:#475569;"><strong>Zašto:</strong> ${escapeHtml(item.why.join(' · '))}</div>` : ''}
        ${item.cautions && item.cautions.length ? `<div style="font-size:.92rem; color:#92400e; margin-top:6px;"><strong>Oprez:</strong> ${escapeHtml(item.cautions.join(' · '))}</div>` : ''}
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <a href="${escapeHtml(item.page)}" style="text-decoration:none; padding:8px 10px; border-radius:10px; background:#0f766e; color:#fff; font-weight:700;">Otvori modul</a>
          <a href="${escapeHtml(item.doc)}" style="text-decoration:none; padding:8px 10px; border-radius:10px; background:#334155; color:#fff; font-weight:700;">Dokumentacija</a>
        </div>
      </article>`).join('');

    const flagsHtml = data.redFlags && data.redFlags.length
      ? `<div style="margin:10px 0 14px; padding:12px 14px; border-radius:14px; background:#fff7ed; border-left:5px solid #ea580c; color:#9a3412;"><strong>Prvo proveri alarmantne znake:</strong> ${escapeHtml(data.redFlags.join(', '))}. Integrativna samopomoć ne sme da odloži pregled.</div>`
      : '';

    return `
      <section class="sinet-integrative-summary" style="margin:14px 0;">
        <div style="background:#f8fafc; border:1px solid #dbeafe; border-radius:20px; padding:16px; box-shadow:0 10px 24px rgba(15,23,42,.05);">
          <div style="font-weight:900; color:#1e4660; font-size:${compact ? '1rem' : '1.05rem'};">${escapeHtml(heading)}</div>
          <div style="color:#475569; margin-top:6px;">${escapeHtml(intro)}</div>
          ${flagsHtml}
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(${compact ? '220px' : '250px'},1fr)); gap:12px; margin-top:12px;">${cards}</div>
        </div>
      </section>`;
  }

  function renderPlanHtml(input, options){
    const data = computePlan(input, options);
    const compact = !!(options && options.compact);
    const heading = text(options && options.heading) || '🗓️ Plan za danas i 7 dana';
    const intro = text(options && options.intro) || 'Nežan kombinovani raspored koji spaja najlogičnije integrativne grane, bez forsiranja.';
    const noteHtml = data.globalNotes.length ? `<div style="margin:10px 0 12px; padding:12px 14px; border-radius:14px; background:#fefce8; border-left:5px solid #ca8a04; color:#854d0e;"><strong>Napomena:</strong> ${escapeHtml(data.globalNotes.join(' · '))}</div>` : '';
    const todayItems = data.today.items.map(it => `
      <li style="margin:0 0 10px 0;">
        <strong>${escapeHtml(it.emoji || '🌿')} ${escapeHtml(cap(it.slot))} — ${escapeHtml(it.title)}</strong>
        ${it.durationMin ? `<span style="color:#0f766e; font-weight:700;"> · ${escapeHtml(it.durationMin)} min</span>` : ''}
        <div style="color:#334155; margin-top:4px;">${escapeHtml(it.instruction)}</div>
        <div style="font-size:.9rem; color:#475569; margin-top:3px;"><strong>Ritam:</strong> ${escapeHtml(it.cadence)} · <strong>Napredak:</strong> ${escapeHtml(it.progression)}</div>
        ${it.caution ? `<div style="font-size:.9rem; color:#92400e; margin-top:3px;"><strong>Oprez:</strong> ${escapeHtml(it.caution)}</div>` : ''}
      </li>`).join('');
    const weekCards = data.week.days.map(day => `
      <details ${compact && day.dayNumber === 1 ? 'open' : (!compact && day.dayNumber <= 2 ? 'open' : '')} style="background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:12px 14px;">
        <summary style="cursor:pointer; font-weight:800; color:#0f766e;">${escapeHtml(day.label)} · ${escapeHtml(day.focus)} · ${escapeHtml(day.totalMinutes)} min</summary>
        <ul style="margin:10px 0 0 18px; padding:0; color:#334155;">
          ${day.items.map(it => `<li style="margin:0 0 8px 0;"><strong>${escapeHtml(it.title)}</strong>${it.durationMin ? ` — ${escapeHtml(it.durationMin)} min` : ''}<br><span style="color:#475569;">${escapeHtml(it.microGoal)} · ${escapeHtml(it.instruction)}</span></li>`).join('')}
        </ul>
        <div style="font-size:.9rem; color:#475569; margin-top:8px;">${escapeHtml(day.eveningCheck)}</div>
      </details>`).join('');

    return `
      <section class="sinet-integrative-plan" style="margin:14px 0;">
        <div style="background:#f8fafc; border:1px solid #dbeafe; border-radius:20px; padding:16px; box-shadow:0 10px 24px rgba(15,23,42,.05);">
          <div style="font-weight:900; color:#1e4660; font-size:${compact ? '1rem' : '1.05rem'};">${escapeHtml(heading)}</div>
          <div style="color:#475569; margin-top:6px;">${escapeHtml(intro)}</div>
          ${noteHtml}
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(${compact ? '260px' : '320px'},1fr)); gap:14px; margin-top:12px; align-items:start;">
            <article style="background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:14px; box-shadow:0 8px 18px rgba(15,23,42,.05);">
              <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
                <div style="font-weight:800; color:#0f766e;">📅 ${escapeHtml(data.today.title)}</div>
                <div style="font-size:.85rem; color:#334155; background:#ecfeff; border:1px solid #bae6fd; border-radius:999px; padding:5px 10px;">≈ ${escapeHtml(data.today.totalMinutes)} min</div>
              </div>
              <div style="font-size:.92rem; color:#475569; margin-top:6px;">${escapeHtml(data.today.style)}</div>
              <ul style="margin:12px 0 0 18px; padding:0;">${todayItems}</ul>
              ${data.today.checkin && data.today.checkin.length ? `<div style="margin-top:10px; font-size:.9rem; color:#475569;"><strong>Check-in:</strong> ${escapeHtml(data.today.checkin.join(' · '))}</div>` : ''}
            </article>
            <article style="background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:14px; box-shadow:0 8px 18px rgba(15,23,42,.05);">
              <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
                <div style="font-weight:800; color:#0f766e;">🗓️ ${escapeHtml(data.week.title)}</div>
                <div style="font-size:.85rem; color:#334155; background:#ecfeff; border:1px solid #bae6fd; border-radius:999px; padding:5px 10px;">${escapeHtml(data.week.rhythm)}</div>
              </div>
              <div style="font-size:.92rem; color:#475569; margin-top:6px;">${escapeHtml(data.week.rule)}</div>
              <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-top:12px;">${weekCards}</div>
              <div style="margin-top:10px; font-size:.9rem; color:#475569;"><strong>Posle 7 dana:</strong> ${escapeHtml(data.week.pauseRule)}</div>
            </article>
          </div>
        </div>
      </section>`;
  }

  function renderBundleHtml(input, options){
    return `${renderSummaryHtml(input, options)}${renderPlanHtml(input, options)}`;
  }

  window.SINET_IntegrativeEngine = {
    preload,
    buildContext,
    computeRecommendations,
    computePlan,
    renderSummaryHtml,
    renderPlanHtml,
    renderBundleHtml,
    recommendationsToBadges,
    inferBasePrefix,
    resolvePath
  };

  try{ preload(); }catch(_){ }
})();
