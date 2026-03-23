(function(){
  const DEFAULTS={host:'127.0.0.1',serverPort:8130,bridgePort:8131,centerPath:'/server/index.html',appEntry:'/index.html'};
  let state={mode:'web',serverRunning:false,bridgeRunning:false,serverPort:DEFAULTS.serverPort,bridgePort:DEFAULTS.bridgePort,appUrl:'',centerUrl:''};
  let observerStarted=false;
  function isLocalHost(){ return location.hostname==='127.0.0.1' || location.hostname==='localhost'; }
  async function jsonFetch(url,opt){ try{ const r=await fetch(url,opt); const t=await r.text(); try{return JSON.parse(t);}catch{return {ok:false,raw:t,status:r.status}; } }catch(e){ return {ok:false,error:String(e)}; } }
  async function detect(){
    if(!isLocalHost()){
      state={...state,mode:(location.protocol==='file:'?'file':'web'),serverRunning:false,bridgeRunning:false,appUrl:location.href,centerUrl:`http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.centerPath}`};
      render(); return state;
    }
    const health=await jsonFetch(`http://${DEFAULTS.host}:${DEFAULTS.bridgePort}/api/health`);
    if(!health.ok){
      state={...state,mode:'local-missing',bridgeRunning:false,serverRunning:false,appUrl:`http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.appEntry}`,centerUrl:`http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.centerPath}`};
      render(); return state;
    }
    const status=await jsonFetch(`http://${DEFAULTS.host}:${DEFAULTS.bridgePort}/api/status`);
    state={...state,mode:'local',bridgeRunning:true,serverRunning:!!status.server_running,serverPort:status.server_port||DEFAULTS.serverPort,bridgePort:status.bridge_port||DEFAULTS.bridgePort,appUrl:status.app_url||`http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.appEntry}`,centerUrl:status.server_center_url||`http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.centerPath}`};
    render(); return state;
  }
  function ensureModal(){
    if(document.getElementById('sinet-runtime-modal')) return;
    const el=document.createElement('div');
    el.id='sinet-runtime-modal'; el.className='sinet-runtime-modal';
    el.innerHTML=`<div class="sinet-runtime-sheet"><div class="sinet-runtime-sheet-top"><div><h3>🖥 Server / Operativni centar</h3><div class="sinet-runtime-note">Lokalni server i bridge za razvoj i test. Aplikacija radi normalno i kada runtime nije pokrenut.</div></div><button class="sinet-runtime-close" type="button">Zatvori</button></div><div class="sinet-runtime-panel" id="sinet-runtime-panel-body"></div></div>`;
    el.addEventListener('click',e=>{ if(e.target===el) close(); });
    el.querySelector('.sinet-runtime-close').addEventListener('click',close);
    document.body.appendChild(el);
  }
  function badgeHtml(){
    if(state.mode==='local' && state.serverRunning) return '<span class="sinet-runtime-badge ok">LOCAL RUN</span>';
    if(state.mode==='local' && !state.serverRunning) return '<span class="sinet-runtime-badge warn">LOCAL STOP</span>';
    if(state.mode==='local-missing') return '<span class="sinet-runtime-badge warn">RUNTIME OFF</span>';
    if(state.mode==='file') return '<span class="sinet-runtime-badge warn">FILE REŽIM</span>';
    return '<span class="sinet-runtime-badge">WEB MODE</span>';
  }
  function openCenterOrModal(){
    if(state.mode==='local'){
      window.open(state.centerUrl || `http://${DEFAULTS.host}:${DEFAULTS.serverPort}${DEFAULTS.centerPath}`,'_blank');
      return;
    }
    open();
  }
  function render(){
    const badgeWrap=document.getElementById('sinet-runtime-badge-wrap');
    if(badgeWrap) badgeWrap.innerHTML=badgeHtml();
    const panel=document.getElementById('sinet-runtime-panel-body');
    if(!panel) return;
    if(state.mode==='local'){
      panel.innerHTML=`<div class="sinet-runtime-help" style="background:#eefaf5;border-color:#bde8d8;color:#166534;">Lokalni runtime je pokrenut. Klikni na dugme ispod za potpuni Server centar.</div><div class="sinet-runtime-minirow"><button class="sinet-runtime-btn primary" id="rtc-open-center">Otvori Server centar</button><button class="sinet-runtime-btn" id="rtc-refresh">Refresh status</button></div>`;
      document.getElementById('rtc-open-center').onclick=()=>window.open(state.centerUrl,'_blank');
      document.getElementById('rtc-refresh').onclick=()=>detect();
      return;
    }
    if(state.mode==='local-missing'){
      panel.innerHTML=`<div class="sinet-runtime-help">Aplikacija radi normalno, ali lokalni runtime trenutno nije pokrenut. Za prvi lokalni start pokreni <strong>./start.sh</strong> iz root foldera projekta, pa zatim klikni ponovo na <strong>Server</strong>.</div><div class="sinet-runtime-minirow"><button class="sinet-runtime-btn" id="rtc-show-command">Prikaži komandu</button><button class="sinet-runtime-btn" id="rtc-refresh-missing">Refresh status</button></div>`;
      document.getElementById('rtc-show-command').onclick=()=>alert('./start.sh');
      document.getElementById('rtc-refresh-missing').onclick=()=>detect();
      return;
    }
    if(state.mode==='file'){
      panel.innerHTML=`<div class="sinet-runtime-help">Aplikacija je otvorena u <strong>file://</strong> režimu. Za lokalni server pokreni <strong>./start.sh</strong>, pa aplikaciju otvori preko <strong>http://127.0.0.1:${DEFAULTS.serverPort}/index.html</strong>.</div>`;
      return;
    }
    panel.innerHTML=`<div class="sinet-runtime-help">Local runtime nije dostupan u ovom režimu. To je očekivano na <strong>Netlify / GitHub</strong> i drugim web hosting varijantama.</div>`;
  }
  function open(){ ensureModal(); render(); document.getElementById('sinet-runtime-modal').classList.add('show'); }
  function close(){ const el=document.getElementById('sinet-runtime-modal'); if(el) el.classList.remove('show'); }
  function cardHtml(){
    return `<div class="sinet-runtime-card-header"><div class="sinet-runtime-card-title">🖥 Server / Operativni centar</div><div id="sinet-runtime-badge-wrap">${badgeHtml()}</div></div><p>Pokreni ili proveri lokalni server i bridge za razvoj i test. Kada runtime nije pokrenut, aplikacija nastavlja da radi normalno.</p><div class="sinet-runtime-actions"><button class="sinet-runtime-btn primary" type="button" id="home-runtime-open">🖥 Server</button><button class="sinet-runtime-btn" type="button" id="home-runtime-refresh">↻ Status</button></div>`;
  }
  function bindCard(card){
    const openBtn=card.querySelector('#home-runtime-open');
    const refreshBtn=card.querySelector('#home-runtime-refresh');
    if(openBtn) openBtn.onclick=openCenterOrModal;
    if(refreshBtn) refreshBtn.onclick=()=>detect();
  }
  function ensureHomeCard(){
    const anchor=document.getElementById('home-entry-selector');
    if(!anchor) return false;
    let card=document.getElementById('home-runtime-card');
    if(!card){
      card=document.createElement('div');
      card.id='home-runtime-card';
      card.className='sinet-runtime-card compact';
      anchor.insertAdjacentElement('afterend', card);
    } else if(card.previousElementSibling !== anchor){
      anchor.insertAdjacentElement('afterend', card);
    }
    card.innerHTML=cardHtml();
    bindCard(card);
    return true;
  }
  function ensureUi(){ ensureModal(); ensureHomeCard(); }
  function startObserver(){
    if(observerStarted) return;
    observerStarted=true;
    const mo=new MutationObserver(()=>ensureUi());
    mo.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',ensureUi);
    window.addEventListener('resize',ensureUi);
    let retries=0;
    const timer=setInterval(()=>{ ensureUi(); retries++; if(document.getElementById('home-runtime-card') && retries>6) clearInterval(timer); if(retries>30) clearInterval(timer); },400);
  }
  document.addEventListener('DOMContentLoaded',()=>{ ensureUi(); startObserver(); detect(); });
  window.SINETRuntimeCenter={open,close,refresh:detect,getState:()=>state,openCenterOrModal};
})();
