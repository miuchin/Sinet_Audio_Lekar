/* SINET Page Nav — v16.0.0.20
   Visible navigation for standalone pages and docs.
   Adds: ⬅ Nazad + 🏠 Početna (+ optional Biblioteka / Dokumentacija)
*/
(function(){
  function qs(sel, el){ return (el||document).querySelector(sel); }
  function safeDecode(s){ try { return decodeURIComponent(s); } catch(_){ return s; } }
  function pathname(){ return (location.pathname||'').replace(/\\/g,'/'); }
  function inPages(){ return pathname().indexOf('/pages/') !== -1; }
  function inDocsProtokoli(){ return pathname().indexOf('/docs/protokoli/') !== -1; }
  function inDocs(){ return pathname().indexOf('/docs/') !== -1; }
  function base(){
    if (inDocsProtokoli()) return '../../';
    if (inDocs()) return '../';
    if (inPages()) return '../';
    return './';
  }
  var RETURN_STACK_KEY = 'sinet_return_stack_v1';
  var RETURN_HINT_KEY = 'sinet_return_hint_v1';
  function currentAbsUrl(){ return String(location.href||'').split('#')[0]; }
  function rememberCurrentPage(){
    try{
      var raw = sessionStorage.getItem(RETURN_STACK_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      var entry = { url: currentAbsUrl(), page: 'standalone', ts: Date.now() };
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
      if (!target || target.split('#')[0] === currentAbsUrl()) return '';
      return target;
    }catch(_){ return ''; }
  }
  function getStackBackTarget(){
    try{
      var raw = sessionStorage.getItem(RETURN_STACK_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      var here = currentAbsUrl();
      while (stack.length && String((stack[stack.length-1]||{}).url||'') === here) stack.pop();
      var target = stack.pop() || null;
      sessionStorage.setItem(RETURN_STACK_KEY, JSON.stringify(stack));
      return target && target.url ? target.url : '';
    }catch(_){ return ''; }
  }
  function sameOriginReferrer(){
    try{
      if (!document.referrer) return '';
      var ref = new URL(document.referrer, location.href);
      if (ref.origin !== location.origin) return '';
      if (ref.pathname === location.pathname && ref.search === location.search) return '';
      return ref.href;
    }catch(_){ return ''; }
  }
  function getBackTarget(){
    try{
      var p = new URLSearchParams(location.search || '');
      var b = p.get('back');
      if (b) return safeDecode(b);
    }catch(_){ }
    return sameOriginReferrer();
  }
  function goBack(ev){
    if (ev) ev.preventDefault();
    var target = getBackTarget() || getHintTarget() || getStackBackTarget();
    if (target) { location.href = target; return false; }
    try { if (history.length > 1) { history.back(); return false; } } catch(_){ }
    location.href = base() + 'index.html';
    return false;
  }
  function ensureStyles(){
    if (qs('#sinet-page-nav-style')) return;
    var st = document.createElement('style');
    st.id = 'sinet-page-nav-style';
    st.textContent = [
      '.sinet-page-nav{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px;padding:12px 14px;border:1px solid rgba(15,118,110,.18);border-radius:16px;background:linear-gradient(180deg,#ffffff 0%,#f8fffd 100%);box-shadow:0 8px 22px rgba(15,23,42,.05);}',
      '.sinet-page-nav-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;padding:10px 14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:800;line-height:1.2;min-height:42px;}',
      '.sinet-page-nav-btn.primary{background:#0f766e;border-color:#0f766e;color:#fff;}',
      '.sinet-page-nav-btn.secondary{background:#334155;border-color:#334155;color:#fff;}',
      '.sinet-page-nav-note{font-size:.92rem;color:#475569;margin-left:auto;}',
      '@media (max-width:640px){.sinet-page-nav{padding:10px;gap:8px}.sinet-page-nav-btn{flex:1 1 calc(50% - 8px);padding:11px 12px}.sinet-page-nav-note{width:100%;margin-left:0}}'
    ].join('');
    document.head.appendChild(st);
  }
  function isIntegrativeStandalone(){
    var p = pathname().toLowerCase();
    return /\/(akupunktura|disanje|mindfulness|termoterapija|san|kretanje|pokret|masaza|relaksacija|tai_chi|narodne_metode)\.html$/.test(p);
  }
  function annotateLibraryLinks(){
    try{
      var p = pathname().toLowerCase();
      if (!/\/integrativna_biblioteka\.html$/.test(p)) return;
      var here = (location.href||'').split('#')[0];
      Array.prototype.slice.call(document.querySelectorAll('a[href$=".html"], a[href*=".html?"]')).forEach(function(a){
        try{
          var raw = a.getAttribute('href') || '';
          if (!raw || /^https?:/i.test(raw)) return;
          var url = new URL(raw, location.href);
          if (url.origin !== location.origin) return;
          if (!/\/(pages|docs)\//.test(url.pathname)) return;
          if (!url.searchParams.get('back')) url.searchParams.set('back', here);
          a.setAttribute('href', makeRelativeHref(url.pathname, url.search, url.hash));
        }catch(_){ }
      });
    }catch(_){ }
  }

  function isSameOrigin(u){
    try{ return (new URL(u, location.href)).origin === location.origin; }catch(_){ return false; }
  }
  function isHtmlLink(href){
    return /\.html(\?|#|$)/i.test(href||'');
  }
  function normalizePathForRelative(path){
    var out = [];
    String(path||'').split('/').forEach(function(part){
      if (!part || part === '.') return;
      if (part === '..') { if (out.length) out.pop(); return; }
      out.push(part);
    });
    return out;
  }
  function makeRelativeHref(targetPathname, targetSearch, targetHash){
    try{
      var fromDir = pathname().replace(/[^\/]*$/, '');
      var fromSeg = normalizePathForRelative(fromDir);
      var toSeg = normalizePathForRelative(targetPathname || '');
      while (fromSeg.length && toSeg.length && fromSeg[0] === toSeg[0]) {
        fromSeg.shift();
        toSeg.shift();
      }
      var relParts = [];
      for (var i = 0; i < fromSeg.length; i++) relParts.push('..');
      relParts = relParts.concat(toSeg);
      var rel = relParts.join('/');
      if (!rel) rel = './';
      if (targetSearch) rel += targetSearch;
      if (targetHash) rel += targetHash;
      return rel;
    }catch(_){
      return (targetPathname || '').replace(/^\//,'') + (targetSearch||'') + (targetHash||'');
    }
  }
  function normalizeInternalLinks(){
    try{
      var here = (location.href||'').split('#')[0];
      Array.prototype.slice.call(document.querySelectorAll('a[href]')).forEach(function(a){
        try{
          var raw = a.getAttribute('href') || '';
          if (!raw || raw.charAt(0) === '#') return;
          if (/^mailto:|^tel:|^javascript:/i.test(raw)) return;
          if (!isHtmlLink(raw)) return;

          var u = new URL(raw, location.href);
          if (u.origin !== location.origin) return;

          var linkPath = (u.pathname || '').replace(/\\/g,'/');
          var isInternalSinet = /\/(pages|docs)\//.test(linkPath) || /\/index(?:-nosw)?\.html$/i.test(linkPath) || /\/anamneza\.html$/i.test(linkPath) || /\/admin\.html$/i.test(linkPath) || /\/DS-Generator\.html$/i.test(linkPath);
          if (!isInternalSinet) return;

          if ((a.getAttribute('target')||'').toLowerCase() === '_blank') {
            a.setAttribute('target','_self');
            a.removeAttribute('rel');
          }

          if (!u.searchParams.get('back')) u.searchParams.set('back', here);
          a.setAttribute('href', makeRelativeHref(u.pathname, u.search, u.hash));
        }catch(_){ }
      });
    }catch(_){ }
  }
  function getWrap(targetId){
    if (targetId){
      var el = (typeof targetId === 'string') ? (qs('#' + String(targetId).replace(/^#/,'')) || qs(String(targetId))) : targetId;
      if (el) return el;
    }
    return qs('.wrap') || qs('.container-fluid') || qs('.container') || qs('.card') || document.body;
  }

  function mount(targetId){
    annotateLibraryLinks();
    normalizeInternalLinks();
    if (qs('[data-sinet-page-nav]')) return;
    ensureStyles();
    var wrap = getWrap(targetId);
    if (!wrap) return;

    var nav = document.createElement('nav');
    nav.className = 'sinet-page-nav';
    nav.setAttribute('data-sinet-page-nav', '1');

    var back = document.createElement('a');
    back.className = 'sinet-page-nav-btn';
    back.href = '#';
    back.textContent = '⬅ Nazad';
    back.title = 'Povratak na prethodnu stranicu';
    back.addEventListener('click', goBack);
    nav.appendChild(back);

    var home = document.createElement('a');
    home.className = 'sinet-page-nav-btn primary';
    home.href = base() + 'index.html';
    home.textContent = '🏠 Početak';
    home.title = 'Povratak na početnu stranicu / POČETAK';
    nav.appendChild(home);

    // Unified Print / Export (available everywhere, minimal)
    var exp = window.SINET_EXPORT;
    if (!exp){
      // try load once (non-blocking)
      try{
        var s = document.createElement('script');
        s.src = base() + 'js/sinet-export-renderer.js?v=16.0.0.19';
        s.defer = true;
        document.head.appendChild(s);
      }catch(_){ }
    }
    var btnPrint = document.createElement('a');
    btnPrint.className = 'sinet-page-nav-btn';
    btnPrint.href = '#';
    btnPrint.textContent = '🖨 Print';
    btnPrint.title = 'Štampaj / Sačuvaj kao PDF';
    btnPrint.addEventListener('click', function(ev){ ev.preventDefault(); try{ (window.SINET_EXPORT||{}).print ? window.SINET_EXPORT.print() : window.print(); }catch(_){ } });
    nav.appendChild(btnPrint);

    var btnHtml = document.createElement('a');
    btnHtml.className = 'sinet-page-nav-btn';
    btnHtml.href = '#';
    btnHtml.textContent = '⬇ HTML';
    btnHtml.title = 'Preuzmi ovu stranicu kao HTML';
    btnHtml.addEventListener('click', function(ev){ ev.preventDefault(); try{ (window.SINET_EXPORT||{}).downloadHTML && window.SINET_EXPORT.downloadHTML(); }catch(_){ } });
    nav.appendChild(btnHtml);

    if (isIntegrativeStandalone()){
      var lib = document.createElement('a');
      lib.className = 'sinet-page-nav-btn secondary';
      lib.href = base() + 'pages/integrativna_biblioteka.html';
      lib.textContent = '🧭 Biblioteka';
      lib.title = 'Povratak u Integrativnu biblioteku';
      nav.appendChild(lib);
    }

    if (inDocsProtokoli()){
      var docs = document.createElement('a');
      docs.className = 'sinet-page-nav-btn secondary';
      docs.href = '../../docs/protokoli/00_TUTOR_VODICI_INDEX_v1.0_SR.html';
      docs.textContent = '📚 Dokumentacija';
      docs.title = 'Povratak na indeks dokumentacije';
      nav.appendChild(docs);
    }

    var note = document.createElement('div');
    note.className = 'sinet-page-nav-note';
    note.textContent = getBackTarget() ? 'Povratak vodi na prethodno otvoreni SINET ekran.' : 'Uvek dostupno: Nazad ili Početna.';
    nav.appendChild(note);

    if (wrap.firstChild) wrap.insertBefore(nav, wrap.firstChild);
    else wrap.appendChild(nav);
  }

  function mountWithRetry(n, targetId){
    try{ mount(targetId); }catch(_){ }
    if (n>0){ setTimeout(function(){ try{ mount(targetId); }catch(_){ } }, 300); setTimeout(function(){ try{ mount(targetId); }catch(_){ } }, 900); }
  }
  try{ rememberCurrentPage(); }catch(_){ }
  window.SINET_PAGE_NAV = { mount: function(targetId){ mountWithRetry(2, targetId); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ mountWithRetry(2); });
  else mountWithRetry(2);
  try{ window.addEventListener('load', function(){ mountWithRetry(1); }); }catch(_){ }
})();
