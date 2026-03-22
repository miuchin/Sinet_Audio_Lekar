(function(){
  const API = {
    timer: null,
    patchDone: false,
    lastKey: '',
    romanOrder: ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII'],
    quickSearchSeeds: [
      { key:'pain', label:'Bol / Bolovi', query:'bol', icon:'🔥', primary:true, note:'najčešći ulaz u katalog' },
      { key:'head', label:'Glava / Glavobolja', query:'glava', icon:'🧠', note:'glava, migrena, pritisak' },
      { key:'stomach', label:'Stomak / Varenje', query:'stomak', icon:'🍽️', note:'stomak, creva, nadimanje' },
      { key:'skin', label:'Koža', query:'koza', icon:'🧴', note:'osip, svrab, suvoća' },
      { key:'sleep', label:'San / Nesanica', query:'nesanica', icon:'🌙', note:'spavanje i noćni ritam' },
      { key:'breath', label:'Disanje', query:'disanje', icon:'🫁', note:'nos, grlo, disanje' },
      { key:'joints', label:'Zglobovi', query:'zglob', icon:'🦴', note:'zglobovi i pokret' },
      { key:'thyroid', label:'Štitna', query:'stitna', icon:'🧬', note:'štitna i metabolizam' }
    ],
    fmt(n){
      const v = Number(n) || 0;
      try { return new Intl.NumberFormat('sr-RS').format(v); } catch(_) { return String(v); }
    },
    esc(v){
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    pct(part, total){
      const p = Number(part) || 0;
      const t = Number(total) || 0;
      if (!t) return 0;
      return Math.max(0, Math.min(100, (p / t) * 100));
    },
    set(id, value){
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    },
    countQuickLinks(){
      try {
        const ids = new Set();
        document.querySelectorAll('#quick-links .btn-full, #quick-links [data-qb-id]').forEach((el)=>{
          const key = (el.getAttribute('data-qb-id') || el.textContent || '').trim();
          if (key) ids.add(key);
        });
        return ids.size;
      } catch(_) { return 0; }
    },
    countFirstAidEntries(app){
      try {
        const groups = Array.isArray(app?.seniorPresets?.groups) ? app.seniorPresets.groups : [];
        return groups.reduce((acc,g)=> acc + (Array.isArray(g?.entries) ? g.entries.length : 0), 0);
      } catch(_) { return 0; }
    },
    getVisibleCatalogItems(app){
      const items = Array.isArray(app?.catalogItems) ? app.catalogItems : [];
      return items.filter((it)=> it && it.app_record_status !== 'ALIAS_REDIRECT');
    },
    getFreqCount(app, item){
      try {
        const raw = Array.isArray(item?.frekvencije) ? item.frekvencije : [];
        if (window.SINET_FrequencySchema && typeof window.SINET_FrequencySchema.normalizeFrequencies === 'function') {
          return window.SINET_FrequencySchema.normalizeFrequencies(raw).filter(Boolean).length;
        }
        return raw.filter(Boolean).length;
      } catch(_) {
        return Array.isArray(item?.frekvencije) ? item.frekvencije.filter(Boolean).length : 0;
      }
    },
    getChapter(app, item){
      try {
        const direct = String(item?.mkb10_primary_chapter || '').trim();
        if (direct) return direct;
        if (app && typeof app._catalogChapterValue === 'function') {
          return String(app._catalogChapterValue(item) || '').trim();
        }
        if (app && typeof app.getMKB10Code === 'function' && typeof app._catalogChapterFromCode === 'function') {
          const code = String(app.getMKB10Code(item?.mkb10) || '').trim();
          return String(app._catalogChapterFromCode(code) || '').trim();
        }
      } catch(_) {}
      return '';
    },
    chapterLongLabel(code){
      const labels = {
        'I':'I • Zarazne i parazitarne bolesti',
        'II':'II • Neoplazme',
        'III':'III • Krv i krvotvorni organi',
        'IV':'IV • Endokrino i metabolizam',
        'V':'V • Mentalni poremećaji',
        'VI':'VI • Nervni sistem',
        'VII':'VII • Oko i adneksi',
        'VIII':'VIII • Uho i mastoid',
        'IX':'IX • Kardiovaskularni sistem',
        'X':'X • Respiratorni sistem',
        'XI':'XI • Digestivni sistem',
        'XII':'XII • Koža i potkožno tkivo',
        'XIII':'XIII • Mišićno-koštani sistem',
        'XIV':'XIV • Urogenitalni sistem',
        'XV':'XV • Trudnoća i porođaj',
        'XVI':'XVI • Perinatalna stanja',
        'XVII':'XVII • Kongenitalne anomalije',
        'XVIII':'XVIII • Simptomi i znaci',
        'XIX':'XIX • Povrede i posledice',
        'XX':'XX • Spoljni uzroci',
        'XXI':'XXI • Faktori zdravlja i kontakti',
        'XXII':'XXII • Specijalne šifre'
      };
      return labels[String(code || '').trim()] || `MKB ${String(code || '').trim()}`;
    },
    _countMatchesForQuery(app, items, query){
      const rows = Array.isArray(items) ? items : [];
      const q = String(query || '').trim();
      if (!q) return 0;
      try {
        if (app && typeof app._scoreCatalogItemForQuery === 'function') {
          let count = 0;
          for (const it of rows) {
            try {
              const meta = app._scoreCatalogItemForQuery(it, q);
              if (meta && Number(meta.score) > 0) count += 1;
            } catch(_) {}
          }
          return count;
        }
      } catch(_) {}
      const nq = q.toLowerCase();
      return rows.filter((it)=> JSON.stringify(it || {}).toLowerCase().includes(nq)).length;
    },
    buildQuickSearches(app, items){
      const rows = Array.isArray(items) ? items : [];
      const out = this.quickSearchSeeds.map((seed)=>{
        const count = this._countMatchesForQuery(app, rows, seed.query);
        return Object.assign({}, seed, { count, share: this.pct(count, rows.length) });
      }).filter((row)=> row.count > 0);
      return out.sort((a,b)=> {
        if (!!a.primary !== !!b.primary) return a.primary ? -1 : 1;
        if (b.count !== a.count) return b.count - a.count;
        return String(a.label || '').localeCompare(String(b.label || ''), 'sr', { sensitivity:'base' });
      }).slice(0, 8);
    },
    renderQuickSearches(rows){
      const host = document.getElementById('home-quick-searches');
      if (!host) return;
      if (!Array.isArray(rows) || !rows.length) {
        host.innerHTML = '<div class="home-focus-empty">Još nema dovoljno podataka za preporučene brze pretrage.</div>';
        return;
      }
      host.innerHTML = rows.map((row)=> `
        <button type="button" class="home-quicksearch-chip${row.primary ? ' is-primary' : ''}" onclick="window.SINETHomeInsight && window.SINETHomeInsight.openCatalogSearch && window.SINETHomeInsight.openCatalogSearch('${this.esc(row.query)}','${this.esc(row.label)}')">
          <div class="home-quicksearch-chip-top">
            <div class="home-quicksearch-chip-label">${this.esc(row.icon || '🔎')} ${this.esc(row.label)}</div>
            <span class="home-quicksearch-chip-count">${this.fmt(row.count)}</span>
          </div>
          <div class="home-quicksearch-chip-meta">
            <span>${this.esc(row.note || `${row.share.toFixed(1).replace('.', ',')}% kataloga`)}</span>
            <span class="home-quicksearch-chip-cta">Otvori →</span>
          </div>
        </button>`).join('');
    },
    collect(app){
      const items = this.getVisibleCatalogItems(app);
      const symptomCount = items.length;
      const oblasti = new Set();
      const mkbBlocks = new Set();
      const mkbChapters = new Set();
      const oblastCounts = new Map();
      const chapterCounts = new Map();
      let mkbMapped = 0;
      let freqTotal = 0;
      for (const it of items) {
        const oblast = String(it?.effective_oblast_standard || it?.oblast || '').trim();
        if (oblast) {
          oblasti.add(oblast);
          oblastCounts.set(oblast, (oblastCounts.get(oblast) || 0) + 1);
        }

        const mkbCode = String((app && typeof app.getMKB10Code === 'function' ? app.getMKB10Code(it?.mkb10) : '') || '').trim();
        const mkbBlock = String(it?.mkb10_primary_block || mkbCode || '').trim();
        const mkbChapter = this.getChapter(app, it);
        const mkbShort = Array.isArray(it?.mkb10_shortlist) ? it.mkb10_shortlist.filter(Boolean) : [];
        if (mkbBlock || mkbCode || mkbChapter || mkbShort.length) mkbMapped += 1;
        if (mkbBlock) mkbBlocks.add(mkbBlock);
        if (mkbChapter) {
          mkbChapters.add(mkbChapter);
          chapterCounts.set(mkbChapter, (chapterCounts.get(mkbChapter) || 0) + 1);
        }
        freqTotal += this.getFreqCount(app, it);
      }

      const topOblasti = Array.from(oblastCounts.entries())
        .sort((a,b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]), 'sr', { sensitivity:'base' }))
        .slice(0, 5)
        .map(([value, count], index) => ({ value, count, rank: index + 1, share: this.pct(count, symptomCount) }));

      const topMkb = Array.from(chapterCounts.entries())
        .sort((a,b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return this.romanOrder.indexOf(a[0]) - this.romanOrder.indexOf(b[0]);
        })
        .slice(0, 5)
        .map(([value, count], index) => ({ value, count, rank: index + 1, share: this.pct(count, mkbMapped || symptomCount), longLabel: this.chapterLongLabel(value) }));

      const quickSearches = this.buildQuickSearches(app, items);

      const favorites = (app && app._favSet instanceof Set) ? app._favSet.size : 0;
      const playlist = Array.isArray(app?.playlist) ? app.playlist.length : 0;
      const protocols = Array.isArray(app?.protocols) ? app.protocols.length : 0;
      const userSymptoms = Array.isArray(app?.userSymptoms) ? app.userSymptoms.length : 0;
      const quickLinks = this.countQuickLinks();
      const firstAid = this.countFirstAidEntries(app);
      const avgFreq = symptomCount ? (freqTotal / symptomCount) : 0;
      return {
        symptomCount,
        mkbMapped,
        mkbBlocks: mkbBlocks.size,
        mkbChapters: mkbChapters.size,
        freqTotal,
        avgFreq,
        firstAid,
        quickLinks,
        favorites,
        playlist,
        protocols,
        userSymptoms,
        oblasti: oblasti.size,
        topOblasti,
        topMkb,
        quickSearches,
        updatedAt: new Date()
      };
    },
    renderTopList(hostId, rows, kind, totalBase){
      const host = document.getElementById(hostId);
      if (!host) return;
      const total = Number(totalBase) || 0;
      if (!Array.isArray(rows) || !rows.length) {
        host.innerHTML = '<div class="home-focus-empty">Još nema dovoljno podataka za ovaj pregled.</div>';
        return;
      }
      host.innerHTML = rows.map((row)=>{
        const label = kind === 'chapter'
          ? `<span class="home-focus-tag">🧬 ${this.esc(row.value)}</span> <span>${this.esc(row.longLabel || '')}</span>`
          : `<span class="home-focus-tag">🗂 ${this.esc(row.value)}</span>`;
        const shareText = `${row.share.toFixed(1).replace('.', ',')}% prikaza`;
        const metaRight = total ? `${this.fmt(row.count)} / ${this.fmt(total)}` : this.fmt(row.count);
        return `
          <button type="button" class="home-focus-item" onclick="window.SINETHomeInsight && window.SINETHomeInsight.openCatalogFocus && window.SINETHomeInsight.openCatalogFocus('${kind}','${this.esc(row.value)}')">
            <div class="home-focus-item-head">
              <div class="home-focus-label">#${this.esc(row.rank)} • ${label}</div>
              <span class="home-focus-value">${this.fmt(row.count)}</span>
            </div>
            <div class="home-focus-meta">
              <span>${this.esc(shareText)}</span>
              <span>${this.esc(metaRight)}</span>
            </div>
            <div class="home-focus-progress"><span style="width:${Math.max(4, row.share)}%"></span></div>
          </button>`;
      }).join('');
    },
    render(stats){
      this.set('hi-stat-symptoms', this.fmt(stats.symptomCount));
      this.set('hi-meta-symptoms', `vidljivo u katalogu • oblasti: ${this.fmt(stats.oblasti)}`);

      this.set('hi-stat-mkb', this.fmt(stats.mkbMapped));
      this.set('hi-meta-mkb', `mapirano • blokovi: ${this.fmt(stats.mkbBlocks)} • poglavlja: ${this.fmt(stats.mkbChapters)}`);

      this.set('hi-stat-freq', this.fmt(stats.freqTotal));
      this.set('hi-meta-freq', `aktivno u katalogu • prosek: ${stats.avgFreq.toFixed(1)} po simptomu`);

      this.set('hi-stat-firstaid', this.fmt(stats.firstAid));
      this.set('hi-meta-firstaid', `stavki za brzi start • moduli: ${this.fmt(stats.quickLinks)}`);

      this.set('hi-stat-favorites', this.fmt(stats.favorites));
      this.set('hi-meta-favorites', stats.favorites ? 'sačuvane stavke spremne za puštanje' : 'još nema sačuvanih favorita');

      this.set('hi-stat-playlist', this.fmt(stats.playlist));
      this.set('hi-meta-playlist', stats.playlist ? 'trenutni red puštanja je spreman' : 'lista je trenutno prazna');

      this.set('hi-stat-protocols', this.fmt(stats.protocols));
      this.set('hi-meta-protocols', stats.protocols ? 'sačuvane sekvence za ponovnu upotrebu' : 'još nema sačuvanih protokola');

      this.set('hi-stat-user', this.fmt(stats.userSymptoms));
      this.set('hi-meta-user', stats.userSymptoms ? 'ručno dodato / uvezeno u aplikaciju' : 'nema dodatih ličnih simptoma');

      this.set('hi-stat-oblasti', this.fmt(stats.oblasti));
      this.set('hi-meta-oblasti', `aktivne grupe • katalog: ${this.fmt(stats.symptomCount)}`);

      this.set('hi-stat-quicklinks', this.fmt(stats.quickLinks));
      this.set('hi-meta-quicklinks', stats.quickLinks ? 'sistemski moduli i prečice' : 'nema podešenih brzih linkova');

      this.renderQuickSearches(stats.quickSearches);
      this.renderTopList('home-top-oblasti', stats.topOblasti, 'oblast', stats.symptomCount);
      this.renderTopList('home-top-mkb', stats.topMkb, 'chapter', stats.mkbMapped || stats.symptomCount);

      const status = document.getElementById('home-insight-status');
      if (status) {
        const hh = String(stats.updatedAt.getHours()).padStart(2,'0');
        const mm = String(stats.updatedAt.getMinutes()).padStart(2,'0');
        status.innerHTML = `Pregled osvežen u <b>${hh}:${mm}</b> • Prikaz miruje dok ne kliknete <b>Osveži pregled</b>, pa Početna ostaje brža i stabilnija.`;
      }
    },
    setIdleState(){
      const status = document.getElementById('home-insight-status');
      if (status) {
        status.innerHTML = 'Početna je u <b>mirnom režimu</b> radi brzine. Klikni <b>Osveži pregled</b> kada želiš da učitaš brojeve i preglede.';
      }
      const quick = document.getElementById('home-quick-searches');
      if (quick && !quick.dataset.idleFilled) {
        quick.dataset.idleFilled = '1';
        quick.innerHTML = '<div class="home-focus-empty">Brze pretrage se pune tek kada kliknete <b>Osveži pregled</b>.</div>';
      }
      const oblasti = document.getElementById('home-top-oblasti');
      if (oblasti && !oblasti.dataset.idleFilled) {
        oblasti.dataset.idleFilled = '1';
        oblasti.innerHTML = '<div class="home-focus-empty">Top oblasti će se prikazati nakon osvežavanja pregleda.</div>';
      }
      const mkb = document.getElementById('home-top-mkb');
      if (mkb && !mkb.dataset.idleFilled) {
        mkb.dataset.idleFilled = '1';
        mkb.innerHTML = '<div class="home-focus-empty">Top MKB grupe će se prikazati nakon osvežavanja pregleda.</div>';
      }
    },
    refresh(force){
      const app = window.app;
      const panel = document.getElementById('home-insight-panel');
      if (!panel || !app) return false;
      const stats = this.collect(app);
      const key = JSON.stringify(stats);
      if (!force && key === this.lastKey) return true;
      this.lastKey = key;
      this.render(stats);
      return true;
    },
    openCatalogSearch(query, label){
      const app = window.app;
      if (!app) return false;
      const q = String(query || '').trim();
      try {
        if (typeof app.clearCatalogFilters === 'function') app.clearCatalogFilters();
      } catch(_) {}
      try { if (typeof app.nav === 'function') app.nav('catalog'); } catch(_) {}
      const run = ()=>{
        try {
          const input = document.getElementById('search-input');
          if (input) input.value = q;
          if (typeof app.filterCatalog === 'function') app.filterCatalog(q, { submitted: true, source: 'home-quicksearch' });
          const target = document.getElementById('catalog-search-status') || document.getElementById('catalog-list');
          try { target && target.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(_) {}
        } catch(_) {}
      };
      setTimeout(run, 20);
      return false;
    },
    openCatalogFocus(kind, value){
      const app = window.app;
      if (!app) return false;
      try {
        if (typeof app.clearCatalogFilters === 'function') app.clearCatalogFilters();
        else app.catalogFilters = { source:'', oblast:'', chapter:'', freqFamily:'' };
      } catch(_) {}
      try {
        const input = document.getElementById('search-input');
        if (input) input.value = '';
      } catch(_) {}
      const val = String(value || '').trim();
      try {
        if (kind === 'oblast' && val) {
          if (typeof app.setCatalogFilter === 'function') app.catalogFilters.oblast = val;
          app.activeOblast = null;
        } else if (kind === 'chapter' && val) {
          if (typeof app.setCatalogFilter === 'function') app.catalogFilters.chapter = val;
          app.activeOblast = null;
        }
        if (typeof app.renderCatalogFilterBar === 'function') app.renderCatalogFilterBar();
      } catch(_) {}
      try { if (typeof app.nav === 'function') app.nav('catalog'); } catch(_) {}
      setTimeout(()=> {
        try {
          const input = document.getElementById('search-input');
          if (input) input.value = '';
          if (typeof app._rerenderCatalogCurrentView === 'function') app._rerenderCatalogCurrentView();
          else if (typeof app.showCatalogHome === 'function') app.showCatalogHome();
          const target = document.getElementById('catalog-search-status') || document.getElementById('catalog-list');
          try { target && target.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(_) {}
        } catch(_) {}
      }, 20);
      return false;
    },
    wrapAppMethod(name){
      return false;
    },
    patchApp(){
      const app = window.app;
      if (!app || this.patchDone) return;
      this.patchDone = true;
      this.setIdleState();
    },
    boot(){
      const tick = ()=>{
        if (window.app) {
          this.patchApp();
        }
      };
      this.setIdleState();
      tick();
    }
  };
  window.SINETHomeInsight = API;
  API.boot();
})();
