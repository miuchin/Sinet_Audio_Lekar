(function(){
  const Store = window.SinetMedicalRuntimeStore;
  if (!Store || !Store.prototype) return;
  const proto = Store.prototype;
  const DESCRIPTORS = [
    { key:'manifest', file:'manifest.json', label:'Manifest', type:'object' },
    { key:'settings', file:'settings.json', label:'Settings', type:'object' },
    { key:'source_documents', file:'source_documents.json', label:'Source documents', type:'collection' },
    { key:'medical_extracts', file:'medical_extracts.json', label:'Medical extracts', type:'collection' },
    { key:'generated_reports', file:'generated_reports.json', label:'Generated reports', type:'collection' },
    { key:'anamneza_entries', file:'anamneza_entries.json', label:'Anamneza entries', type:'collection' },
    { key:'audit_events_active', file:'audit_events_active.json', label:'Audit active', type:'collection' },
    { key:'retention_rules', file:'retention_rules.json', label:'Retention rules', type:'object' },
    { key:'backup_manifests', file:'backup_manifests.json', label:'Backup manifests', type:'collection' },
    { key:'restore_jobs', file:'restore_jobs.json', label:'Restore jobs', type:'collection' },
    { key:'archive_index', file:'archive_index.json', label:'Archive index', type:'object' }
  ];

  proto.getRuntimeFileDescriptors = function(){
    return DESCRIPTORS.map(x => Object.assign({}, x));
  };

  proto._defaultSelectedKeys = function(scope){
    const medical = ['source_documents','medical_extracts','generated_reports','anamneza_entries','audit_events_active','retention_rules'];
    if (scope === 'medical_modules_only') return medical.slice();
    if (scope === 'backup_restore_only') return ['backup_manifests','restore_jobs','archive_index','retention_rules'];
    return DESCRIPTORS.map(x => x.key);
  };

  proto._summarizeRuntimeValue = function(key, value){
    const t = Object.prototype.toString.call(value);
    if (Array.isArray(value)) {
      return { key, kind:'array', count:value.length, empty: value.length === 0 };
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      let nestedCount = keys.length;
      if (Array.isArray(value.batches)) nestedCount = value.batches.length;
      if (Array.isArray(value.rules)) nestedCount = value.rules.length;
      return { key, kind:'object', count:nestedCount, keys };
    }
    return { key, kind: typeof value, count: value ? 1 : 0, rawType: t };
  };

  proto.getArchiveIndex = async function(){
    await this.ensureBootstrap();
    let idx = await this.get('archive_index');
    if (!idx || typeof idx !== 'object' || !Array.isArray(idx.batches)) {
      idx = { version:1, batches:[], updated_at:null };
      await this.put('archive_index', idx);
    }
    return idx;
  };

  proto._saveArchiveIndex = async function(indexData){
    const idx = Object.assign({ version:1, batches:[], updated_at:new Date().toISOString() }, indexData || {});
    idx.updated_at = new Date().toISOString();
    await this.put('archive_index', idx);
    if (typeof this._writeRuntimeJson === 'function') {
      try { await this._writeRuntimeJson('data/runtime/archive_index.json', idx); } catch(_) {}
    }
    return idx;
  };

  proto.getArchiveBatch = async function(batchId){
    const idx = await this.getArchiveIndex();
    return (idx.batches || []).find(x => String(x.batch_id) === String(batchId)) || null;
  };

  proto.runAuditRetentionArchive = async function(ruleId){
    await this.ensureBootstrap();
    const cfg = await this.get('retention_rules') || {};
    const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
    const selectedRuleId = ruleId || cfg.active_rule_id || (rules[0] && rules[0].rule_id) || '';
    const rule = rules.find(r => String(r.rule_id) === String(selectedRuleId)) || null;
    if (!rule) throw new Error('Retention pravilo nije pronađeno.');
    const retentionDays = Math.max(0, Number(rule.retention_days || 0));
    const activeEvents = await this.getCollection('audit_events_active') || [];
    const nowMs = Date.now();
    const cutoffMs = retentionDays > 0 ? nowMs - retentionDays * 86400000 : nowMs;
    const toArchive = [];
    const keep = [];
    for (const ev of activeEvents) {
      const ts = Date.parse(ev.timestamp || ev.created_at || ev.updated_at || '');
      if (Number.isFinite(ts) && ts <= cutoffMs) toArchive.push(ev);
      else keep.push(ev);
    }
    if (!toArchive.length) {
      await this.appendAudit({
        module:'archive', entity_type:'archive_batch', entity_id:selectedRuleId,
        action:'audit_retention_archive_noop', status:'success',
        details:{ rule_id:selectedRuleId, retention_days:retentionDays, active_events:activeEvents.length, archived:0 }
      });
      return { ok:true, moved_count:0, batch:null, rule };
    }
    const sorted = toArchive.slice().sort((a,b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    const batchId = `arch_${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}_${String(sorted.length).padStart(3,'0')}`;
    const batch = {
      batch_id: batchId,
      rule_id: selectedRuleId,
      created_at: new Date().toISOString(),
      retention_days: retentionDays,
      events_count: sorted.length,
      range_from: sorted[0]?.timestamp || sorted[0]?.created_at || '',
      range_to: sorted[sorted.length-1]?.timestamp || sorted[sorted.length-1]?.created_at || '',
      archive_path: `data/runtime/archive/audit/${batchId}.json`,
      status: 'archived',
      events_inline: sorted
    };
    const idx = await this.getArchiveIndex();
    idx.batches = Array.isArray(idx.batches) ? idx.batches : [];
    idx.batches.unshift(batch);
    await this._saveArchiveIndex(idx);
    if (typeof this._writeRuntimeJson === 'function') {
      try { await this._writeRuntimeJson(batch.archive_path, batch); } catch(_) {}
    }
    await this.put('audit_events_active', keep);
    await this.appendAudit({
      module:'archive', entity_type:'archive_batch', entity_id:batchId,
      action:'audit_retention_archived', status:'success',
      details:{ rule_id:selectedRuleId, retention_days:retentionDays, archived_count:sorted.length, remaining_active:keep.length }
    });
    return { ok:true, moved_count:sorted.length, batch, rule };
  };

  proto.getBackupById = async function(backupId){
    const list = await this.getCollection('backup_manifests') || [];
    return list.find(x => String(x.backup_id) === String(backupId)) || null;
  };

  proto.createBackupSnapshot = async function(scope, options){
    await this.ensureBootstrap();
    const list = await this.getCollection('backup_manifests') || [];
    const descriptors = this.getRuntimeFileDescriptors();
    const selectedKeys = Array.isArray(options?.selectedKeys) && options.selectedKeys.length ? options.selectedKeys : this._defaultSelectedKeys(scope || 'full_runtime');
    const uniqueKeys = descriptors.map(x => x.key).filter(k => selectedKeys.includes(k));
    const snapshot_data_inline = {};
    const snapshot_summary = [];
    for (const key of uniqueKeys) {
      const value = await this.get(key);
      snapshot_data_inline[key] = value;
      snapshot_summary.push(this._summarizeRuntimeValue(key, value));
    }
    const id = this.idService && this.idService.next ? this.idService.next('backup') : `bkp_${Date.now()}`;
    const item = {
      backup_id: id,
      created_at: new Date().toISOString(),
      backup_type: 'snapshot',
      scope: scope || 'full_runtime',
      created_by: 'local_user',
      manifest_version: 2,
      storage_path: `data/runtime/backups/${id}/`,
      selected_keys: uniqueKeys,
      included_files: descriptors.filter(x => uniqueKeys.includes(x.key)).map(x => x.file),
      attachment_policy: 'metadata_and_runtime_files',
      checksum: '',
      snapshot_summary,
      snapshot_data_inline,
      status: 'valid'
    };
    list.unshift(item);
    await this.put('backup_manifests', list);
    if (typeof this._writeRuntimeJson === 'function') {
      try { await this._writeRuntimeJson(`${item.storage_path}manifest.json`, item); } catch(_) {}
    }
    await this.appendAudit({ module:'backup_restore', entity_type:'backup_manifest', entity_id:id, action:'backup_snapshot_created', details:{ scope:item.scope, selected_keys:uniqueKeys, files:item.included_files.length } });
    return item;
  };

  proto.createRestorePreview = async function(backupId, mode, options){
    await this.ensureBootstrap();
    const backup = await this.getBackupById(backupId);
    if (!backup) throw new Error('Backup nije pronađen.');
    const list = await this.getCollection('restore_jobs') || [];
    const descriptors = this.getRuntimeFileDescriptors();
    const fallbackKeys = Array.isArray(backup.selected_keys) && backup.selected_keys.length ? backup.selected_keys : this._defaultSelectedKeys('full_runtime');
    const selectedKeys = Array.isArray(options?.selectedKeys) && options.selectedKeys.length ? options.selectedKeys : fallbackKeys;
    const cleanKeys = descriptors.map(x => x.key).filter(k => selectedKeys.includes(k));
    const current_summary = [];
    const conflicts = [];
    let estimatedRecords = 0;
    for (const key of cleanKeys) {
      const currentValue = await this.get(key);
      const curr = this._summarizeRuntimeValue(key, currentValue);
      const backupMeta = Array.isArray(backup.snapshot_summary) ? backup.snapshot_summary.find(x => x.key === key) : null;
      current_summary.push({ key, current: curr, backup: backupMeta || null });
      estimatedRecords += Number((backupMeta && backupMeta.count) || 0);
      if ((curr.count || 0) > 0) {
        conflicts.push({ key, reason:'existing_runtime_data', current_count: curr.count || 0, backup_count: Number((backupMeta && backupMeta.count) || 0) });
      }
    }
    const id = this.idService && this.idService.next ? this.idService.next('restore') : `rst_${Date.now()}`;
    const item = {
      restore_job_id: id,
      created_at: new Date().toISOString(),
      created_by: 'local_user',
      source_backup_id: backupId,
      restore_mode: mode || 'preview',
      target_scope: options?.scope || backup.scope || 'full_runtime',
      conflicts_detected: conflicts,
      selected_keys: cleanKeys,
      selected_files: descriptors.filter(x => cleanKeys.includes(x.key)).map(x => x.file),
      preview_summary: {
        files_to_restore: cleanKeys.length,
        overwrite_required: (mode === 'overwrite'),
        estimated_records: estimatedRecords,
        conflicts_count: conflicts.length
      },
      current_summary,
      rollback_backup_id: null,
      status: 'preview'
    };
    list.unshift(item);
    await this.put('restore_jobs', list);
    await this.appendAudit({ module:'backup_restore', entity_type:'restore_job', entity_id:id, action:'restore_preview_created', details:{ backup_id:backupId, mode:item.restore_mode, selected_keys:cleanKeys, conflicts:conflicts.length } });
    return item;
  };
})();
