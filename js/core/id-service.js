
(function(){
  class SinetIdService {
    constructor(manifest){ this.manifest = manifest || {}; }
    _prefix(type){
      const map = (this.manifest && this.manifest.id_prefixes) ? this.manifest.id_prefixes : {};
      return map[type] || 'id_';
    }
    next(type){
      const prefix = this._prefix(type);
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth()+1).padStart(2,'0'),
        String(now.getDate()).padStart(2,'0'),
        String(now.getHours()).padStart(2,'0'),
        String(now.getMinutes()).padStart(2,'0'),
        String(now.getSeconds()).padStart(2,'0')
      ].join('');
      const rand = Math.random().toString(36).slice(2,7);
      return `${prefix}${stamp}_${rand}`;
    }
  }
  window.SinetIdService = SinetIdService;
})();
