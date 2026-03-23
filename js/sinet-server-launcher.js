(function(){
  const PORT_START = 8130;
  const PORT_END = 8180;
  async function tryJson(url){
    const res = await fetch(url,{headers:{'Content-Type':'application/json'}});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
  async function discoverBridge(){
    for(let port=PORT_START; port<=PORT_END; port++){
      try{ const d = await tryJson(`http://127.0.0.1:${port}/health`); if(d && d.ok) return port; }catch(e){}
    }
    return null;
  }
  function showNote(msg){
    const box=document.getElementById('sinet-server-inline-note');
    if(!box){ alert(msg); return; }
    box.textContent=msg; box.classList.add('is-visible');
  }
  async function openServerCenter(){
    const bridgePort = await discoverBridge();
    if(!bridgePort){
      showNote('Local runtime nije dostupan u ovom režimu. Za lokalni razvoj pokreni ./start.sh, pa zatim klikni ponovo na Server / Operativni centar.');
      return;
    }
    try{
      const status = await tryJson(`http://127.0.0.1:${bridgePort}/status`);
      if(status && status.server_center_url){ window.open(status.server_center_url,'_blank','noopener'); return; }
    }catch(e){}
    window.open(`http://127.0.0.1:${bridgePort-1}/server/index.html`,'_blank','noopener');
  }
  window.openSinetServerCenter = openServerCenter;
})();
