
(function(){
  class SinetAuditService {
    constructor(store){ this.store = store; }
    async log(module, action, entityType, entityId, details, status){
      return this.store.appendAudit({
        module: module || 'unknown',
        action: action || 'unknown_action',
        entity_type: entityType || 'unknown',
        entity_id: entityId || '',
        details: details || {},
        status: status || 'success'
      });
    }
    async list(){ return this.store.getCollection('audit_events_active'); }
    async getRetentionRules(){ return this.store.get('retention_rules'); }
  }
  window.SinetAuditService = SinetAuditService;
})();
