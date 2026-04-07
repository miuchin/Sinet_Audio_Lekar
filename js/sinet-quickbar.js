/* SINET Quickbar — v15.7.7.7
   Author: miuchins & SINET AI
   Injects a high-contrast universal quick navigation bar, now user-configurable.
*/
(function(){
  function qs(sel, el){ return (el||document).querySelector(sel); }
  function qsa(sel, el){ return Array.prototype.slice.call((el||document).querySelectorAll(sel)); }
  function safeDecode(s){ try { return decodeURIComponent(s); } catch(_){ return s; } }
  function currentUrl(){ return (location.href||'').split('#')[0]; }
  function inPages(){ return (location.pathname||'').replace(/\\/g,'/').indexOf('/pages/') !== -1; }
  function base(){ return inPages() ? '../' : ''; }

  var LS_PREFS = 'SINET_QB_PREFS_V1';
  var RETURN_STACK_KEY = 'sinet_return_stack_v1';
  var RETURN_HINT_KEY = 'sinet_return_hint_v1';
  function rememberCurrentPage(){
    try{
      var raw = sessionStorage.getItem(RETURN_STACK_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      var entry = { url: currentUrl(), page: 'quickbar', ts: Date.now() };
      var prev = stack[stack.length-1];
      if (!prev || String(prev.url||'') !== entry.url){
        stack.push(entry);
        while (stack.length > 120) stack.shift();
        sessionStorage.setItem(RETURN_STACK_KEY, JSON.stringify(stack));
      }
    }catch(_){ }
  }
  function getHintTarget(){
    try{
      var raw = localStorage.getItem(RETURN_HINT_KEY);
      if (!raw) return '';
      var payload = JSON.parse(raw);
      if (!payload || !payload.url) return '';
      if (Math.abs(Date.now() - Number(payload.ts || 0)) > 1000*60*60*8) return '';
      var target = String(payload.url||'');
      if (!target || target.split('#')[0] === currentUrl()) return '';
      return target;
    }catch(_){ return ''; }
  }
  function getStackBackTarget(){
    try{
      var raw = sessionStorage.getItem(RETURN_STACK_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      var here = currentUrl();
      while (stack.length && String((stack[stack.length-1]||{}).url||'') === here) stack.pop();
      var target = stack.pop() || null;
      sessionStorage.setItem(RETURN_STACK_KEY, JSON.stringify(stack));
      return target && target.url ? target.url : '';
    }catch(_){ return ''; }
  }
  var LS_COLLAPSED = 'SINET_QB_COLLAPSED';

  // Elements across the app can opt-in to Quickbar preferences by adding:
  //   data-qb-id="home|anam|ds|guide|anti|spk|ra"
  // And containers can add:
  //   data-qb-container="1" data-qb-empty="Text shown when empty"
  function applyPrefsToPage(){
    var prefs = loadPrefs();
    var set = Object.create(null);
    (prefs||[]).forEach(function(id){ set[id]=true; });

    // Show/hide individual elements
    qsa('[data-qb-id]').forEach(function(el){
      var id = (el.getAttribute('data-qb-id')||'').trim();
      if (!id) return;
      if (!el.dataset.qbOrigDisplay) {
        // Preserve original display style
        el.dataset.qbOrigDisplay = el.style.display || '';
      }
      var visible = !!set[id];
      el.style.display = visible ? el.dataset.qbOrigDisplay : 'none';
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });

    // Handle "empty" containers
    qsa('[data-qb-container]').forEach(function(box){
      var items = qsa('[data-qb-id]', box);
      var anyVisible = items.some(function(el){ return el.style.display !== 'none'; });
      var note = qs('.qb-empty-note', box);
      if (!anyVisible){
        if (!note){
          note = document.createElement('div');
          note.className = 'qb-empty-note';
          box.appendChild(note);
        }
        note.textContent = box.getAttribute('data-qb-empty') || 'Nema izabranih prečica. Klikni ⚙️ u “⚡ Brzo” da podesiš.';
        note.style.display = 'block';
      } else if (note){
        note.style.display = 'none';
      }
    });

    // Broadcast for pages that want to react
    try{ window.dispatchEvent(new CustomEvent('sinet-qb-change', { detail: { items: prefs } })); }catch(_){ }
  }

  function addBack(url){
    if (!url || /^https?:\/\//i.test(url)) return url;
    var sep = (url.indexOf('?') !== -1) ? '&' : '?';
    return url + sep + 'back=' + encodeURIComponent(currentUrl());
  }

  function getBackTarget(){
    var p = new URLSearchParams(location.search||'');
    var b = p.get('back');
    if (b) return safeDecode(b);
    return '';
  }

  function getAvailable(){
    var b = base();
    return [
      { id:'home',  href: b + 'index.html', label:'🏠 Početna', required:true },
      { id:'anam',  href: b + 'anamneza.html', label:'🩺 Anamneza' },
      { id:'ds',    href: b + 'DS-Generator.html', label:'✨ DS Generator' },
      { id:'guide', href: b + 'pages/integrativni_vodic.html', label:'🧾 Vodič' },
      { id:'anti',  href: b + 'pages/antiparazitski.html', label:'🦠 Antiparazitski' },
      { id:'spk',   href: b + 'pages/speaker_clean_proof.html', label:'🔊 Zvučnik' },
      { id:'ra',    href: b + 'pages/integrativni_vodic_RA_sake.html', label:'🧩 RA šake' },
      { id:'occ',   href: b + 'pages/occipitalna_neuralgija.html', label:'🧠 Okcipitalna' },
      { id:'lib',   href: b + 'pages/integrativna_biblioteka.html', label:'🧭 Biblioteka' }
    ];
  }

  function defaultPrefs(){
    return getAvailable().map(function(x){ return x.id; });
  }

  function loadPrefs(){
    try{
      var raw = localStorage.getItem(LS_PREFS);
      if (!raw) return defaultPrefs();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return defaultPrefs();
      return normalizePrefs(parsed.items);
    }catch(_){
      return defaultPrefs();
    }
  }

  function savePrefs(ids){
    ids = normalizePrefs(ids);
    localStorage.setItem(LS_PREFS, JSON.stringify({ v:1, items: ids }));
  }

  function normalizePrefs(ids){
    var avail = getAvailable().map(function(x){ return x.id; });
    var set = Object.create(null);
    var out = [];
    // always include required item(s)
    getAvailable().forEach(function(x){
      if (x.required){ set[x.id]=true; out.push(x.id); }
    });
    (ids||[]).forEach(function(id){
      if (avail.indexOf(id) === -1) return;
      if (set[id]) return;
      set[id]=true; out.push(id);
    });
    return out;
  }

  function humanSelectedLabels(ids){
    var map = Object.create(null);
    getAvailable().forEach(function(it){ map[it.id]=it.label; });
    return (ids||[]).map(function(id){ return map[id] || id; });
  }

  function updateSettingsPreview(){
    var box = qs('#qb-settings-preview');
    if (!box) return;
    var ids = loadPrefs();
    var labels = humanSelectedLabels(ids);
    box.innerHTML = '';
    labels.forEach(function(lab){
      var chip = document.createElement('span');
      chip.textContent = lab;
      chip.className = 'qb-chip';
      box.appendChild(chip);
    });
  }

  function mount(){
    if (qs('#sinetQuickbar')) { updateSettingsPreview(); return; }

    var bar = document.createElement('div');
    bar.id = 'sinetQuickbar';
    bar.className = 'sinet-quickbar';

    try{ rememberCurrentPage(); }catch(_){ }
    var isMobile = (window.matchMedia && window.matchMedia('(max-width: 520px)').matches);
    var collapsed = (localStorage.getItem(LS_COLLAPSED) === '1');
    // Mobile: always start collapsed (saves space); user can expand when needed
    if (isMobile) { collapsed = true; localStorage.setItem(LS_COLLAPSED, '1'); }
    if (collapsed) bar.classList.add('collapsed');

    var row = document.createElement('div');
    row.className = 'qb-row';

    var btnToggle = document.createElement('button');
    btnToggle.className = 'qb-toggle';
    btnToggle.type = 'button';
    btnToggle.title = collapsed ? (isMobile ? 'Otvori meni' : 'Proširi Brzo') : (isMobile ? 'Sakrij meni' : 'Sklopi Brzo');
    btnToggle.textContent = isMobile ? '☰' : '⚡';
    btnToggle.addEventListener('click', function(){
      bar.classList.toggle('collapsed');
      var isCol = bar.classList.contains('collapsed');
      localStorage.setItem(LS_COLLAPSED, isCol ? '1' : '0');
      btnToggle.title = isCol ? (isMobile ? 'Otvori meni' : 'Proširi Brzo') : (isMobile ? 'Sakrij meni' : 'Sklopi Brzo');
    });

    var btnBack = document.createElement('a');
    btnBack.className = 'qb-btn qb-primary';
    btnBack.href = '#';
    btnBack.textContent = isMobile ? '⬅' : '⬅ Nazad';
    btnBack.title = 'Nazad';
    btnBack.addEventListener('click', function(ev){
      ev.preventDefault();
      var target = getBackTarget() || getHintTarget() || getStackBackTarget();
      if (target) { location.href = target; return; }
      if (history.length > 1) { history.back(); return; }
      location.href = base() + 'index.html';
    });

var btnHome = document.createElement('a');
btnHome.className = 'qb-btn qb-secondary';
btnHome.href = base() + 'index.html';
btnHome.textContent = isMobile ? '🏠' : '🏠 Početak';
btnHome.title = 'Početak';

    var links = document.createElement('div');
    links.className = 'qb-links';

    var spacer = document.createElement('div');
    spacer.className = 'qb-spacer';

    var btnConfig = document.createElement('button');
    btnConfig.className = 'qb-btn qb-muted qb-config';
    btnConfig.type = 'button';
    btnConfig.title = 'Podesi Brzo';
    btnConfig.textContent = '⚙️';
    btnConfig.addEventListener('click', function(){
      openConfigModal();
    });

    var help = document.createElement('a');
    help.className = 'qb-btn qb-muted';
    // NOTE (iOS / UX): when Quickbar is used INSIDE index.html, linking to
    // `index.html?nav=help` causes a full page reload which:
    //  - stops audio playback
    //  - resets current Queue/List session
    // So on index-like pages we intercept the click and switch screens via SPA nav.
    help.href = addBack(base() + 'index.html?nav=help');
    help.textContent = isMobile ? '❓' : '❓ Help';
    help.title = 'Korisničko uputstvo';
    help.addEventListener('click', function(ev){
      try{
        var p = String(location.pathname||'').toLowerCase();
        var isIndex = p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('/index-nosw.html');
        if (isIndex) {
          // Prevent reload: use in-app navigation if available.
          ev.preventDefault();
          try{
            if (window.app && typeof window.app.nav === 'function') window.app.nav('help');
            else if (typeof window.nav === 'function') window.nav('help');
          }catch(_){ }
          return false;
        }
      }catch(_){ }
      // Non-index pages: default anchor navigation is OK (keeps back=...).
    });

    row.appendChild(btnToggle);
    row.appendChild(btnBack);
    row.appendChild(btnHome);
    row.appendChild(links);
    row.appendChild(spacer);
    row.appendChild(btnConfig);
    row.appendChild(help);
    bar.appendChild(row);

    // Insert at top of body (works with most layouts)
    if (document.body.firstChild) document.body.insertBefore(bar, document.body.firstChild);
    else document.body.appendChild(bar);

    function renderLinks(){
      links.innerHTML = '';
      var avail = getAvailable();
      var byId = Object.create(null);
      avail.forEach(function(it){ byId[it.id]=it; });

      var prefs = loadPrefs();
      prefs.forEach(function(id){
        var it = byId[id];
        if (!it) return;
        // Avoid link to the same page (reduce clutter)
        try{
          var abs = new URL(it.href, location.href).pathname;
          if (abs === location.pathname) return;
        }catch(_){}
        var a = document.createElement('a');
        a.className = 'qb-btn';
        a.href = addBack(it.href);
        a.textContent = it.label;
        // While audio is playing (especially on iPhone/PWA), navigating to another page
        // kills the current playback/Queue session. For selected "quick pages" we open
        // the target inside the in-app doc modal (iframe) instead.
        a.addEventListener('click', function(ev){
          try{
            var p = String(location.pathname||'').toLowerCase();
            var isIndex = p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('/index-nosw.html');
            if (!isIndex) return;
            var app = window.app;
            var audioActive = !!(app && ((app._rendered && app._rendered.active) || (app.audio && app.audio.isPlaying)));
            if (!audioActive) return;
            // Limit to "external" tools so we don't surprise users by modal-opening core sections.
            var modalIds = { anti:1, spk:1, ra:1, guide:1 };
            if (!modalIds[id]) return;
            if (app && typeof app.openDoc === 'function') {
              ev.preventDefault();
              app.openDoc(a.href, it.label);
              return false;
            }
          }catch(_){ }
        });
        links.appendChild(a);
      });

      updateSettingsPreview();
      applyPrefsToPage();
    }

    // Public API for settings page / other UI
    window.SINETQuickbar = window.SINETQuickbar || {};
    window.SINETQuickbar.getPrefs = function(){ return loadPrefs().slice(); };
    window.SINETQuickbar.setPrefs = function(ids){ savePrefs(ids); renderLinks(); applyPrefsToPage(); };
    window.SINETQuickbar.reset = function(){ savePrefs(defaultPrefs()); renderLinks(); applyPrefsToPage(); };
    window.SINETQuickbar.openConfig = function(){ openConfigModal(); };
    window.SINETQuickbar.available = function(){ return getAvailable(); };

    function openConfigModal(){
      // Only one modal instance
      var existing = qs('#qbConfigOverlay');
      if (existing) { existing.classList.add('open'); return; }

      var overlay = document.createElement('div');
      overlay.id = 'qbConfigOverlay';
      overlay.className = 'qb-modal-overlay open';

      var modal = document.createElement('div');
      modal.className = 'qb-modal';

      var header = document.createElement('div');
      header.className = 'qb-modal-header';
      header.innerHTML = '<div style="font-weight:900;">⚡ Brzo — Izaberi dugmad</div>';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'qb-close';
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', function(){
        overlay.classList.remove('open');
      });
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = 'qb-modal-body';

      var p = document.createElement('p');
      p.className = 'qb-modal-note';
      p.textContent = 'Označi koje dugmad želiš u “⚡ Brzo”. Početna je uvek uključena. Promene važe odmah.';
      body.appendChild(p);

      var list = document.createElement('div');
      list.className = 'qb-item-list';
      body.appendChild(list);

      var footer = document.createElement('div');
      footer.className = 'qb-modal-footer';

      var resetBtn = document.createElement('button');
      resetBtn.className = 'qb-btn qb-muted';
      resetBtn.type = 'button';
      resetBtn.textContent = 'Reset';
      resetBtn.addEventListener('click', function(){
        working = defaultPrefs().slice();
        draw();
      });

      var saveBtn = document.createElement('button');
      saveBtn.className = 'qb-btn qb-primary';
      saveBtn.type = 'button';
      saveBtn.textContent = 'Sačuvaj';
      saveBtn.addEventListener('click', function(){
        savePrefs(working);
        renderLinks();
        overlay.classList.remove('open');
      });

      footer.appendChild(resetBtn);
      footer.appendChild(saveBtn);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);

      overlay.appendChild(modal);

      overlay.addEventListener('click', function(ev){
        if (ev.target === overlay) overlay.classList.remove('open');
      });

      document.body.appendChild(overlay);

      var available = getAvailable();
      var working = loadPrefs().slice();

      function isSelected(id){ return working.indexOf(id) !== -1; }
      function move(id, dir){
        var i = working.indexOf(id);
        if (i === -1) return;
        var j = i + dir;
        if (j < 0 || j >= working.length) return;
        var tmp = working[i]; working[i] = working[j]; working[j] = tmp;
      }

      function toggle(id, on){
        var req = available.find(function(x){ return x.id===id; });
        if (req && req.required) return; // cannot change
        if (on){
          if (!isSelected(id)) working.push(id);
        } else {
          working = working.filter(function(x){ return x !== id; });
          // keep required items
          working = normalizePrefs(working);
        }
      }

      function draw(){
        list.innerHTML = '';

        // selected order first, then remaining
        var order = working.slice();
        available.forEach(function(it){
          if (order.indexOf(it.id) === -1) order.push(it.id);
        });

        order.forEach(function(id){
          var it = available.find(function(x){ return x.id===id; });
          if (!it) return;

          var row = document.createElement('div');
          row.className = 'qb-item-row';

          var left = document.createElement('label');
          left.className = 'qb-item-left';

          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isSelected(it.id);
          cb.disabled = !!it.required;
          cb.addEventListener('change', function(){
            toggle(it.id, cb.checked);
            draw();
          });

          var span = document.createElement('span');
          span.className = 'qb-item-label';
          span.textContent = it.label;

          left.appendChild(cb);
          left.appendChild(span);

          var right = document.createElement('div');
          right.className = 'qb-item-right';

          var up = document.createElement('button');
          up.type = 'button';
          up.className = 'qb-mini';
          up.textContent = '↑';
          up.disabled = !isSelected(it.id) || working.indexOf(it.id) <= 0;
          up.addEventListener('click', function(){
            move(it.id, -1);
            draw();
          });

          var dn = document.createElement('button');
          dn.type = 'button';
          dn.className = 'qb-mini';
          dn.textContent = '↓';
          dn.disabled = !isSelected(it.id) || working.indexOf(it.id) === -1 || working.indexOf(it.id) >= working.length-1;
          dn.addEventListener('click', function(){
            move(it.id, +1);
            draw();
          });

          right.appendChild(up);
          right.appendChild(dn);

          row.appendChild(left);
          row.appendChild(right);
          list.appendChild(row);
        });
      }

      draw();
    }

    renderLinks();

    // Mobile UX: when user scrolls down, auto-collapse the quickbar (saves screen space)
    if (isMobile) {
      try {
        var scroller = document.querySelector('main');
        var useWin = !scroller || scroller.scrollHeight <= scroller.clientHeight;
        var lastY = useWin ? (window.scrollY||0) : (scroller.scrollTop||0);
        var onScroll = function(){
          var y = useWin ? (window.scrollY||0) : (scroller.scrollTop||0);
          // only react after a bit of scrolling
          if (y > 60 && y > lastY + 6) {
            if (!bar.classList.contains('collapsed')) {
              bar.classList.add('collapsed');
              btnToggle.title = 'Otvori meni';
            }
          }
          lastY = y;
        };
        (useWin ? window : scroller).addEventListener('scroll', onScroll, { passive:true });
      } catch(_) { /* ignore */ }
    }

    updateSettingsPreview();
    applyPrefsToPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();