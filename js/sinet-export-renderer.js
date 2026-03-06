/* SINET Export Renderer — v16.0.0.18
   Unified print/export helpers for standalone pages and docs.
   Exposes: window.SINET_EXPORT.{print,downloadHTML,downloadJSON}
*/
(function(){
  function ensure(){
    if (window.SINET_EXPORT) return window.SINET_EXPORT;
    var api = {};
    api.print = function(){ try{ window.print(); }catch(_){ } };
    api.downloadHTML = function(filename){
      try{
        filename = filename || (document.title || 'sinet').replace(/[^\w\-]+/g,'_') + '.html';
        var blob = new Blob([document.documentElement.outerHTML], {type:'text/html;charset=utf-8'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.rel = 'noopener';
        a.click();
        setTimeout(function(){ try{ URL.revokeObjectURL(a.href);}catch(_){ } }, 1500);
      }catch(_){ }
    };
    api.downloadJSON = function(obj, filename){
      try{
        filename = filename || (document.title || 'sinet').replace(/[^\w\-]+/g,'_') + '.json';
        var blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json;charset=utf-8'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.rel = 'noopener';
        a.click();
        setTimeout(function(){ try{ URL.revokeObjectURL(a.href);}catch(_){ } }, 1500);
      }catch(_){ }
    };
    window.SINET_EXPORT = api;
    return api;
  }
  ensure();
})();
