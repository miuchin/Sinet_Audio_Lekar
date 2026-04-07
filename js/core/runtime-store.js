(function(){
  const FILE_MAP = {
    manifest: 'data/runtime/manifest.json',
    settings: 'data/runtime/settings.json',
    source_documents: 'data/runtime/source_documents.json',
    medical_extracts: 'data/runtime/medical_extracts.json',
    generated_reports: 'data/runtime/generated_reports.json',
    anamneza_entries: 'data/runtime/anamneza_entries.json',
    audit_events_active: 'data/runtime/audit_events_active.json',
    retention_rules: 'data/runtime/retention_rules.json',
    backup_manifests: 'data/runtime/backup_manifests.json',
    restore_jobs: 'data/runtime/restore_jobs.json'
  };
  const STATE_PREFIX = 'medical_runtime_';

  class SinetMedicalRuntimeStore {
    constructor(){
      this.db = window.db || null;
      this.ready = false;
      this.bootstrapInfo = null;
      this.manifest = null;
      this.idService = null;
      this.bridge = window.SinetBridgeRuntime ? new window.SinetBridgeRuntime() : null;
    }

    async _ensureDb(){
      if (!this.db && window.db) this.db = window.db;
      if (!this.db) throw new Error('SINET DB nije dostupan.');
      if (typeof this.db.init === 'function') await this.db.init();
      return this.db;
    }

    async _getState(key){
      const db = await this._ensureDb();
      if (typeof db._get === 'function') return db._get('state', STATE_PREFIX + key);
      if (typeof db.getState === 'function') return db.getState(STATE_PREFIX + key);
      throw new Error('DB state API nije dostupna.');
    }

    async _putState(key, value){
      const db = await this._ensureDb();
      const payload = { key: STATE_PREFIX + key, data: value, updatedAt: Date.now() };
      if (typeof db._put === 'function') return db._put('state', payload);
      if (typeof db.putState === 'function') return db.putState(payload.key, value);
      throw new Error('DB state write API nije dostupna.');
    }

    async _fetchJson(path){
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Ne mogu da učitam ${path}`);
      return r.json();
    }

    async ensureBootstrap(){
      await this._ensureDb();
      let manifest = await this._getState('manifest');
      if (!manifest) {
        const loaded = {};
        for (const [key, path] of Object.entries(FILE_MAP)) {
          loaded[key] = await this._fetchJson(path);
          await this._putState(key, loaded[key]);
        }
        manifest = loaded.manifest;
        this.bootstrapInfo = { bootstrapped: true, at: new Date().toISOString() };
      } else {
        this.bootstrapInfo = { bootstrapped: false, at: new Date().toISOString() };
      }
      this.ready = true;
      this.manifest = manifest;
      this.idService = new window.SinetIdService(manifest || {});
      return manifest;
    }

    async get(key){
      await this.ensureBootstrap();
      return this._getState(key);
    }

    async put(key, value){
      await this.ensureBootstrap();
      await this._putState(key, value);
      return value;
    }

    async getCollection(key){
      const value = await this.get(key);
      if (Array.isArray(value)) return value;
      return value || null;
    }

    async getStats(){
      await this.ensureBootstrap();
      const [docs, extracts, reports, anamneza, audit, backups, restores] = await Promise.all([
        this.getCollection('source_documents'),
        this.getCollection('medical_extracts'),
        this.getCollection('generated_reports'),
        this.getCollection('anamneza_entries'),
        this.getCollection('audit_events_active'),
        this.getCollection('backup_manifests'),
        this.getCollection('restore_jobs')
      ]);
      return {
        documents: Array.isArray(docs) ? docs.length : 0,
        extracts: Array.isArray(extracts) ? extracts.length : 0,
        reports: Array.isArray(reports) ? reports.length : 0,
        anamneza: Array.isArray(anamneza) ? anamneza.length : 0,
        audit: Array.isArray(audit) ? audit.length : 0,
        backups: Array.isArray(backups) ? backups.length : 0,
        restores: Array.isArray(restores) ? restores.length : 0
      };
    }

    async getStorageStatus(){
      await this.ensureBootstrap();
      if (!this.bridge) return { available:false, mode:'indexeddb_blob_fallback', writable:false };
      return this.bridge.getStatus();
    }

    async appendAudit(event){
      const list = await this.getCollection('audit_events_active') || [];
      const entry = Object.assign({
        audit_id: this.idService.next('audit'),
        timestamp: new Date().toISOString(),
        actor_type: 'user',
        actor_id: 'local_user',
        append_only: true,
        status: 'success'
      }, event || {});
      list.push(entry);
      await this.put('audit_events_active', list);
      return entry;
    }

    _safeName(name){
      return String(name || 'attachment.bin').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g,'_').replace(/^_+|_+$/g,'') || 'attachment.bin';
    }

    _guessDocumentType(file){
      const name = String(file?.name || '').toLowerCase();
      const type = String(file?.type || '').toLowerCase();
      if (/otpus|epikriz|discharge/.test(name)) return 'otpusna_lista';
      if (/terap|therapy/.test(name)) return 'terapija';
      if (/recept|rx/.test(name)) return 'recept';
      if (/radiolog|ct|mri|rtg|ultra/.test(name)) return 'radiologija';
      if (/lab|cbc|biohem|krv|urin/.test(name)) return 'lab_nalaz';
      if (type.includes('image/')) return 'sken_fotografija';
      return 'medicinski_dokument';
    }

    async _sha256FromFile(file){
      if (!file || !window.crypto?.subtle) return '';
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    async _writeRuntimeText(relativePath, content){
      if (this.bridge) {
        const status = await this.bridge.getStatus();
        if (status && status.available) {
          try {
            const res = await this.bridge.writeText(relativePath, content);
            return Object.assign({ saved:true, mode:'bridge_disk' }, res || {});
          } catch (_) {}
        }
      }
      return { saved:false, mode:'inline_only', relative_path: relativePath };
    }

    async _writeRuntimeJson(relativePath, payload){
      if (this.bridge) {
        const status = await this.bridge.getStatus();
        if (status && status.available) {
          try {
            const res = await this.bridge.writeJson(relativePath, payload);
            return Object.assign({ saved:true, mode:'bridge_disk' }, res || {});
          } catch (_) {}
        }
      }
      return { saved:false, mode:'inline_only', relative_path: relativePath };
    }

    async _persistAttachment(documentId, file){
      const db = await this._ensureDb();
      const safeName = this._safeName(file?.name || `${documentId}.bin`);
      const relativePath = `data/runtime/attachments/documents/${documentId}__${safeName}`;
      if (this.bridge) {
        const status = await this.bridge.getStatus();
        if (status && status.available) {
          try {
            const saved = await this.bridge.saveAttachment({ document_id: documentId, file, subdir:'documents' });
            return {
              storage_mode: 'bridge_disk',
              storage_path: saved.relative_path || relativePath,
              file_url: saved.file_url || saved.relative_path || relativePath,
              attachment_key: '',
              size_bytes: Number(saved.size_bytes || file.size || 0),
              sha256: saved.sha256 || ''
            };
          } catch (_) {}
        }
      }
      const attachmentKey = `attachment_${documentId}`;
      if (typeof db.putAttachment === 'function') {
        await db.putAttachment(attachmentKey, {
          document_id: documentId,
          name: file?.name || safeName,
          mime_type: file?.type || 'application/octet-stream',
          size_bytes: Number(file?.size || 0),
          blob: file,
          created_at: new Date().toISOString()
        });
      }
      return {
        storage_mode: 'indexeddb_blob',
        storage_path: relativePath,
        file_url: '',
        attachment_key: attachmentKey,
        size_bytes: Number(file?.size || 0),
        sha256: ''
      };
    }

    _inferFlag(value, refText){
      const numeric = Number(String(value).replace(',', '.'));
      if (!Number.isFinite(numeric) || !refText) return 'unknown';
      const m = String(refText).replace(/,/g,'.').match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
      if (!m) return 'unknown';
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 'unknown';
      if (numeric < lo) return 'low';
      if (numeric > hi) return 'high';
      return 'normal';
    }

    _parameterLabelMap(){
      return [
        ['glukoza','Glukoza'], ['hemoglobin','Hemoglobin'], ['eritrociti','Eritrociti'], ['leukociti','Leukociti'],
        ['trombociti','Trombociti'], ['crp','CRP'], ['sedimentacija','Sedimentacija'], ['urea','Urea'],
        ['kreatinin','Kreatinin'], ['ast','AST'], ['alt','ALT'], ['bilirubin','Bilirubin'],
        ['holesterol','Holesterol'], ['hdl','HDL'], ['ldl','LDL'], ['trigliceridi','Trigliceridi'],
        ['tsh','TSH'], ['ft4','FT4'], ['vitamin d','Vitamin D'], ['feritin','Feritin'], ['gvozdje','Gvožđe'],
        ['kalijum','Kalijum'], ['natrijum','Natrijum'], ['albumin','Albumin'], ['ureja','Urea'], ['mcv','MCV'], ['mch','MCH'], ['mchc','MCHC'], ['hematokrit','Hematokrit'], ['hba1c','HbA1c'], ['insulin','Insulin'], ['t3','T3'], ['ft3','FT3'], ['asto','ASTO'], ['fibrinogen','Fibrinogen'], ['d-dimer','D-dimer'], ['bilirubin ukupni','Bilirubin ukupni'], ['bilirubin direktni','Bilirubin direktni']
      ];
    }

    _normalizeLabel(label){
      const raw = String(label || '').trim();
      const lower = raw.toLowerCase();
      const found = this._parameterLabelMap().find(([k]) => lower.includes(k));
      if (found) return found[1];
      return raw || 'Parametar';
    }

    _parseStructuredParameters(text){
      const src = String(text || '');
      const lines = src.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const params = [];
      const used = new Set();
      const pushParam = (labelRaw, valueRaw, unitRaw, refRaw, hintFlag) => {
        const label = this._normalizeLabel(labelRaw);
        const value = String(valueRaw || '').replace(',', '.').trim();
        const unit = String(unitRaw || '').trim();
        const ref = String(refRaw || '').trim();
        const flag = hintFlag || this._inferFlag(value, ref);
        const key = `${label}|${value}|${unit}|${ref}|${flag}`;
        if (!label || !value || used.has(key)) return;
        used.add(key);
        params.push({ name: label, value, unit, reference_range: ref, flag });
      };

      const compactStatus = (line) => {
        if (/[↑⇧]/.test(line) || /\bhigh\b|\bvisoko\b|\bpoviš/i.test(line)) return 'high';
        if (/[↓⇩]/.test(line) || /\blow\b|\bnisko\b|\bsniž/i.test(line)) return 'low';
        if (/\bnormal\b|\buredno\b/i.test(line)) return 'normal';
        if (/\bH\b/.test(line)) return 'high';
        if (/\bL\b/.test(line)) return 'low';
        return '';
      };

      const regexes = [
        /^([A-Za-zČĆŽŠĐčćžšđ0-9 .%()/_+-]{2,90}?)\s*[:=-]\s*([<>]?-?\d+(?:[.,]\d+)?)\s*([A-Za-z%µμ\/\.0-9]*)\s*(?:\(?\s*(?:ref|rr|range|opseg)?\s*[:]?\s*(-?\d+(?:[.,]\d+)?\s*[-–]\s*-?\d+(?:[.,]\d+)?(?:\s*[A-Za-z%µμ\/\.0-9]*)?)\s*\)?)?\s*([A-Za-z↑↓]*)?$/i,
        /^([A-Za-zČĆŽŠĐčćžšđ0-9 .%()/_+-]{2,90}?)\s+([<>]?-?\d+(?:[.,]\d+)?)\s+([A-Za-z%µμ\/\.0-9]+)\s+(-?\d+(?:[.,]\d+)?\s*[-–]\s*-?\d+(?:[.,]\d+)?(?:\s*[A-Za-z%µμ\/\.0-9]*)?)\s*([A-Za-z↑↓]*)?$/i,
        /^([A-Za-zČĆŽŠĐčćžšđ0-9 .%()/_+-]{2,90}?)\s+([<>]?-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?\s*[-–]\s*-?\d+(?:[.,]\d+)?)(?:\s+([A-Za-z%µμ\/\.0-9]+))?\s*([A-Za-z↑↓]*)?$/i
      ];

      for (const line of lines) {
        let matched = false;
        for (let idx = 0; idx < regexes.length; idx++) {
          const rx = regexes[idx];
          const m = line.match(rx);
          if (!m) continue;
          matched = true;
          const label = m[1];
          const value = m[2];
          let unit = '';
          let ref = '';
          let status = compactStatus(line);
          if (idx === 0) { unit = m[3] || ''; ref = m[4] || ''; status = status || compactStatus(m[5] || ''); }
          else if (idx === 1) { unit = m[3] || ''; ref = m[4] || ''; status = status || compactStatus(m[5] || ''); }
          else { ref = m[3] || ''; unit = m[4] || ''; status = status || compactStatus(m[5] || ''); }
          pushParam(label, value, unit, ref, status);
          break;
        }
        if (matched) continue;

        const cols = line.split(/\t+|\s{2,}/).map(x => x.trim()).filter(Boolean);
        if (cols.length >= 3) {
          const maybeLabel = cols[0];
          const maybeValue = cols[1];
          if (/[<>]?-?\d+(?:[.,]\d+)?/.test(maybeValue)) {
            let unit = '';
            let ref = '';
            let status = compactStatus(line);
            for (let i = 2; i < cols.length; i++) {
              const c = cols[i];
              if (!ref && /-/.test(c) && /\d/.test(c)) { ref = c; continue; }
              if (!unit && /^[A-Za-z%µμ\/\.0-9]+$/.test(c) && !/^(H|L|N)$/i.test(c)) { unit = c; continue; }
              status = status || compactStatus(c);
            }
            pushParam(maybeLabel, maybeValue, unit, ref, status);
          }
        }
      }

      return params;
    }

    _buildKeyFindings(doc, parameters){
      const findings = [];
      findings.push(`Dokument tipa ${doc.document_type || 'medicinski_dokument'} je sačuvan u Zdravstvenom kartonu.`);
      findings.push(`Storage mode: ${doc.storage_mode || 'unknown'}.`);
      if (doc.file_hash_sha256) findings.push('SHA-256 hash je upisan radi deduplikacije.');
      if (doc.last_ocr_mode) findings.push(`OCR/Extract mode: ${doc.last_ocr_mode}.`);
      if (parameters.length) {
        findings.push(`Prepoznato parametara: ${parameters.length}.`);
        const highs = parameters.filter(p => p.flag === 'high').map(p => p.name);
        const lows = parameters.filter(p => p.flag === 'low').map(p => p.name);
        if (highs.length) findings.push(`Povišene vrednosti: ${highs.join(', ')}.`);
        if (lows.length) findings.push(`Snižene vrednosti: ${lows.join(', ')}.`);
        if (!highs.length && !lows.length) findings.push('Trenutno prepoznati parametri deluju bez jasnih odstupanja, ali zahtevaju klinički kontekst.');
      } else {
        findings.push('Još nema prepoznatih numeričkih parametara — moguće je ručno dopuniti OCR tekst.');
      }
      return findings;
    }

    _buildFollowupPlan(parameters){
      const highs = parameters.filter(p => p.flag === 'high').map(p => p.name);
      const lows = parameters.filter(p => p.flag === 'low').map(p => p.name);
      const plan = [
        'Potvrditi čitljivost dokumenta i tačnost OCR sloja.',
        'Proveriti referentne opsege laboratorije koja je izdala nalaz.',
        'Povezati nalaz sa aktivnom anamnezom i simptomima.'
      ];
      if (highs.length || lows.length) {
        plan.push(`Posebno obratiti pažnju na izdvojena odstupanja: ${[...highs, ...lows].join(', ')}.`);
        plan.push('Po potrebi dopuniti OCR tekst i generisati novu verziju reporta.');
      } else {
        plan.push('Ako postoje simptomi uprkos urednim parametrima, dopuniti kontekst kroz anamnezu i druge dokumente.');
      }
      return plan;
    }

    async addDemoDocument(meta){
      const list = await this.getCollection('source_documents') || [];
      const now = new Date();
      const id = this.idService.next('document');
      const item = {
        document_id: id,
        patient_id: 'local_default_patient',
        owner_module: 'zdravstveni_karton',
        document_type: meta?.document_type || 'lab_nalaz',
        document_subtype: meta?.document_subtype || 'demo_unos',
        title: meta?.title || `Novi dokument ${now.toLocaleString('sr-RS')}`,
        original_filename: meta?.title || `${id}.txt`,
        source_type: meta?.source_type || 'manual_demo',
        source_origin: meta?.source_origin || 'zdravstveni_karton_ui',
        document_date: meta?.document_date || now.toISOString().slice(0,10),
        imported_at: now.toISOString(),
        storage_path: `data/runtime/attachments/documents/${id}_pending.txt`,
        file_url: '',
        thumbnail_path: '',
        ocr_raw_path: `data/runtime/attachments/ocr_raw/${id}.txt`,
        ocr_text_inline: meta?.ocr_text_inline || `Glukoza: 6.4 mmol/L (3.9-6.1)\nHemoglobin: 128 g/L (120-160)\nCRP: 3 mg/L (0-5)`,
        mime_type: meta?.mime_type || 'text/plain',
        size_bytes: Number(meta?.size_bytes || 0),
        file_hash_sha256: meta?.file_hash_sha256 || '',
        storage_mode: meta?.storage_mode || 'inline_demo',
        attachment_key: meta?.attachment_key || '',
        ocr_status: 'manual_ready',
        last_ocr_mode: 'demo_inline',
        last_ocr_confidence: null,
        tags: Array.isArray(meta?.tags) ? meta.tags : ['novo'],
        linked_extract_ids: [],
        linked_report_ids: [],
        linked_anamneza_ids: [],
        status: 'active'
      };
      list.unshift(item);
      await this.put('source_documents', list);
      await this._writeRuntimeText(item.ocr_raw_path, item.ocr_text_inline);
      await this.appendAudit({
        module: 'zdravstveni_karton',
        entity_type: 'source_document',
        entity_id: id,
        action: 'source_document_created',
        details: { title: item.title, source_type: item.source_type, persistence: item.storage_mode }
      });
      return item;
    }

    async addDocumentFromFile(file){
      await this.ensureBootstrap();
      if (!file) throw new Error('Fajl nije izabran.');
      const docs = await this.getCollection('source_documents') || [];
      const hash = await this._sha256FromFile(file);
      const existing = docs.find(doc => hash && doc.file_hash_sha256 && String(doc.file_hash_sha256) === String(hash));
      if (existing) {
        await this.appendAudit({
          module: 'zdravstveni_karton',
          entity_type: 'source_document',
          entity_id: existing.document_id,
          action: 'source_document_duplicate_detected',
          details: { title: existing.title, filename: file.name, sha256: hash }
        });
        return { duplicate: true, document: existing };
      }
      const id = this.idService.next('document');
      const persistence = await this._persistAttachment(id, file);
      const ocrPath = `data/runtime/attachments/ocr_raw/${id}.txt`;
      const ocrText = [
        `OCR placeholder za dokument: ${file.name}`,
        `Mime type: ${file.type || 'application/octet-stream'}`,
        `Veličina: ${Number(file.size || 0)} bytes`,
        '',
        'Ovde možeš ručno nalepiti OCR tekst ili laboratorijske vrednosti, npr:',
        'Glukoza: 6.4 mmol/L (3.9-6.1)',
        'Hemoglobin: 128 g/L (120-160)',
        'CRP: 3 mg/L (0-5)'
      ].join('\n');
      await this._writeRuntimeText(ocrPath, ocrText);
      const doc = {
        document_id: id,
        patient_id: 'local_default_patient',
        owner_module: 'zdravstveni_karton',
        document_type: this._guessDocumentType(file),
        document_subtype: file.type && file.type.includes('pdf') ? 'pdf_upload' : 'image_or_file_upload',
        title: file.name || `Dokument ${id}`,
        original_filename: file.name || `${id}.bin`,
        source_type: 'file_picker',
        source_origin: 'zdravstveni_karton_upload',
        document_date: new Date().toISOString().slice(0,10),
        imported_at: new Date().toISOString(),
        storage_path: persistence.storage_path,
        file_url: persistence.file_url || persistence.storage_path,
        thumbnail_path: '',
        ocr_raw_path: ocrPath,
        ocr_text_inline: ocrText,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: persistence.size_bytes,
        file_hash_sha256: hash || persistence.sha256 || '',
        storage_mode: persistence.storage_mode,
        attachment_key: persistence.attachment_key || '',
        ocr_status: 'placeholder_ready',
        last_ocr_mode: 'placeholder_seed',
        last_ocr_confidence: null,
        tags: ['upload', persistence.storage_mode === 'bridge_disk' ? 'disk-runtime' : 'indexeddb-fallback'],
        linked_extract_ids: [],
        linked_report_ids: [],
        linked_anamneza_ids: [],
        status: 'active'
      };
      docs.unshift(doc);
      await this.put('source_documents', docs);
      await this.appendAudit({
        module: 'zdravstveni_karton',
        entity_type: 'source_document',
        entity_id: id,
        action: 'source_document_file_saved',
        details: { filename: doc.original_filename, storage_mode: doc.storage_mode, size_bytes: doc.size_bytes, sha256: doc.file_hash_sha256 }
      });
      return { duplicate: false, document: doc };
    }

    async getDocumentById(documentId){
      const docs = await this.getCollection('source_documents') || [];
      return docs.find(doc => String(doc.document_id) === String(documentId)) || null;
    }

    async getReportsForDocument(documentId){
      const reports = await this.getCollection('generated_reports') || [];
      return reports.filter(r => String(r.document_id) === String(documentId)).sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    }

    async getLatestReportForDocument(documentId){
      const reports = await this.getReportsForDocument(documentId);
      return reports.find(r => r.is_latest) || reports[0] || null;
    }

    async getLatestExtractForDocument(documentId){
      const extracts = await this.getCollection('medical_extracts') || [];
      return extracts.filter(x => String(x.document_id) === String(documentId)).sort((a,b) => Number(b.extract_version||0) - Number(a.extract_version||0))[0] || null;
    }

    async openDocument(documentId){
      const doc = await this.getDocumentById(documentId);
      if (!doc) throw new Error('Dokument nije pronađen.');
      if (doc.storage_mode === 'bridge_disk' && doc.storage_path) {
        const url = doc.file_url || doc.storage_path;
        window.open(url, '_blank', 'noopener');
        return { opened:true, mode:'bridge_disk', url };
      }
      const db = await this._ensureDb();
      if (doc.attachment_key && typeof db.getAttachment === 'function') {
        const attachment = await db.getAttachment(doc.attachment_key);
        if (attachment && attachment.blob) {
          const url = URL.createObjectURL(attachment.blob);
          window.open(url, '_blank', 'noopener');
          return { opened:true, mode:'indexeddb_blob', url };
        }
      }
      throw new Error('Prilog nije dostupan za otvaranje.');
    }

    async getOcrText(documentId){
      const doc = await this.getDocumentById(documentId);
      if (!doc) throw new Error('Dokument nije pronađen.');
      if (doc.ocr_text_inline) return doc.ocr_text_inline;
      if (doc.ocr_raw_path) {
        try {
          const res = await fetch(doc.ocr_raw_path, { cache:'no-store' });
          if (res.ok) return res.text();
        } catch(_) {}
      }
      return 'OCR sadržaj još nije dostupan.';
    }

    async saveOcrText(documentId, text, meta){
      const docs = await this.getCollection('source_documents') || [];
      const doc = docs.find(d => String(d.document_id) === String(documentId));
      if (!doc) throw new Error('Dokument nije pronađen.');
      doc.ocr_text_inline = String(text || '').trim();
      doc.ocr_status = meta?.ocr_status || (doc.ocr_text_inline ? 'manual_ready' : 'empty');
      doc.last_ocr_mode = meta?.mode || doc.last_ocr_mode || '';
      doc.last_ocr_confidence = Number.isFinite(Number(meta?.confidence)) ? Number(meta.confidence) : (doc.last_ocr_confidence ?? null);
      doc.updated_at = new Date().toISOString();
      await this.put('source_documents', docs);
      if (doc.ocr_raw_path) await this._writeRuntimeText(doc.ocr_raw_path, doc.ocr_text_inline || '');
      await this.appendAudit({
        module: 'lab_bookpro',
        entity_type: 'source_document',
        entity_id: documentId,
        action: 'ocr_text_saved',
        details: { length: doc.ocr_text_inline.length, status: doc.ocr_status, mode: doc.last_ocr_mode || '', confidence: doc.last_ocr_confidence }
      });
      return doc;
    }

    async runSmartOcrExtract(documentId){
      const doc = await this.getDocumentById(documentId);
      if (!doc) throw new Error('Dokument nije pronađen.');
      let extracted = '';
      let mode = 'manual_placeholder';
      let confidence = null;
      if (this.bridge && doc.storage_mode === 'bridge_disk' && doc.storage_path) {
        try {
          const res = await this.bridge.extractTextFromRuntimeFile({
            relative_path: doc.storage_path,
            mime_type: doc.mime_type || '',
            filename: doc.original_filename || doc.title || ''
          });
          if (res && res.ok && typeof res.text === 'string') {
            extracted = String(res.text || '').trim();
            mode = res.mode || 'bridge_extract';
            confidence = Number.isFinite(Number(res.confidence)) ? Number(res.confidence) : null;
          }
        } catch (_) {}
      }
      if (!extracted && doc.attachment_key) {
        const db = await this._ensureDb();
        if (typeof db.getAttachment === 'function') {
          const item = await db.getAttachment(doc.attachment_key);
          if (item && item.blob) {
            const type = String(item.mime_type || doc.mime_type || '').toLowerCase();
            if (/json|text|xml|html|csv/.test(type) || /\.(txt|md|json|csv|html)$/i.test(String(item.name || ''))) {
              extracted = String(await item.blob.text()).trim();
              mode = 'indexeddb_text_extract';
            }
          }
        }
      }
      if (!extracted) {
        extracted = [
          `Automatski OCR nije dostupan za ovaj tip dokumenta (${doc.mime_type || 'unknown'}).`,
          'Nalepi ili dopuni tekst ručno u OCR zoni, pa pokreni extract.',
          '',
          doc.ocr_text_inline || ''
        ].join('\n').trim();
      }
      await this.saveOcrText(documentId, extracted, { mode, confidence, ocr_status: extracted ? 'smart_ready' : 'manual_required' });
      await this.appendAudit({
        module: 'lab_bookpro',
        entity_type: 'source_document',
        entity_id: documentId,
        action: 'smart_ocr_extract_completed',
        details: { mode, chars: extracted.length, mime_type: doc.mime_type, confidence }
      });
      const extract = await this.createExtractFromDocument(documentId, { forceNewVersion: true });
      return { document: await this.getDocumentById(documentId), extract: extract.extract, mode, confidence, text: extracted };
    }

    _buildExtractForDocument(doc, extracts, extId, now, ocrText){
      const nextVersion = extracts.filter(x => x.document_id === doc.document_id).length + 1;
      const parameters = this._parseStructuredParameters(ocrText);
      const keyFindings = this._buildKeyFindings(doc, parameters);
      const followupPlan = this._buildFollowupPlan(parameters);
      const abnormal = parameters.filter(p => p.flag === 'high' || p.flag === 'low');
      return {
        extract_id: extId,
        document_id: doc.document_id,
        owner_module: 'lab_bookpro',
        extract_version: nextVersion,
        created_at: now,
        ocr_status: doc.ocr_status || 'placeholder_ready',
        parser_status: parameters.length ? 'parsed' : 'scaffold_ready',
        parser_version: 'lab_extract_1.4_runtime_image_ocr',
        ocr_text_path: doc.ocr_raw_path || '',
        normalized_text: String(ocrText || '').trim(),
        entities: {
          document_kind: doc.document_type,
          source_origin: doc.source_origin,
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          ocr_mode: doc.last_ocr_mode || '',
          ocr_confidence: doc.last_ocr_confidence ?? null
        },
        parameters,
        key_findings: keyFindings,
        follow_up_plan: followupPlan,
        abnormal_flags: abnormal,
        diagnostic_candidates: [],
        warnings: parameters.length ? ['Potrebna je klinička interpretacija u kontekstu laboratorije, simptoma i anamneze.'] : ['Numerički parametri nisu prepoznati. Proveri OCR tekst ili ručno nalepi vrednosti.'],
        confidence_map: { overall: parameters.length ? 0.84 : 0.62, parameters: parameters.length ? 0.89 : 0.00 },
        status: 'ready'
      };
    }

    async createExtractFromDocument(documentId, options){
      const docs = await this.getCollection('source_documents') || [];
      const extracts = await this.getCollection('medical_extracts') || [];
      const doc = docs.find(d => String(d.document_id) === String(documentId));
      if (!doc) throw new Error('Dokument nije pronađen.');
      const opts = options || {};
      const existing = extracts.find(x => String(x.document_id) === String(documentId));
      if (existing && !opts.forceNewVersion) return { reused:true, extract: existing, document: doc };
      const now = new Date().toISOString();
      const extId = this.idService.next('extract');
      const ocrText = await this.getOcrText(documentId);
      const extract = this._buildExtractForDocument(doc, extracts, extId, now, ocrText);
      extracts.unshift(extract);
      doc.linked_extract_ids = Array.isArray(doc.linked_extract_ids) ? doc.linked_extract_ids : [];
      doc.linked_extract_ids.unshift(extId);
      doc.ocr_status = extract.parameters.length ? 'parsed_ready' : (doc.ocr_status || 'manual_ready');
      await this.put('medical_extracts', extracts);
      await this.put('source_documents', docs);
      await this.appendAudit({
        module: 'lab_bookpro',
        entity_type: 'medical_extract',
        entity_id: extId,
        action: 'medical_extract_created',
        details: { document_id: doc.document_id, parameters: extract.parameters.length, parser_status: extract.parser_status }
      });
      return { reused:false, extract, document: doc };
    }

    async generateBookProFromDocument(documentId, options){
      const docs = await this.getCollection('source_documents') || [];
      const extracts = await this.getCollection('medical_extracts') || [];
      const reports = await this.getCollection('generated_reports') || [];
      const doc = docs.find(d => String(d.document_id) === String(documentId));
      if (!doc) throw new Error('Dokument nije pronađen.');
      const opts = options || {};
      const existing = reports.find(r => String(r.document_id) === String(documentId) && r.is_latest);
      if (existing && !opts.forceNewVersion) {
        await this.appendAudit({
          module: 'lab_bookpro',
          entity_type: 'generated_report',
          entity_id: existing.report_id,
          action: 'lab_bookpro_report_reused',
          details: { document_id: doc.document_id }
        });
        const existingExtract = extracts.find(x => String(x.extract_id) === String(existing.extract_id)) || null;
        return { reused:true, report: existing, document: doc, extract: existingExtract };
      }
      let extract = await this.getLatestExtractForDocument(documentId);
      if (!extract || opts.forceNewVersion || opts.forceExtract) {
        const created = await this.createExtractFromDocument(documentId, { forceNewVersion: !!opts.forceExtract });
        extract = created.extract;
      }
      const refreshedDocs = await this.getCollection('source_documents') || [];
      const docRef = refreshedDocs.find(d => String(d.document_id) === String(documentId)) || doc;
      const now = new Date().toISOString();
      const repId = this.idService.next('report');
      const reportBase = {
        report_id: repId,
        document_id: docRef.document_id,
        extract_id: extract.extract_id,
        owner_module: 'lab_bookpro',
        report_type: 'lab_bookpro',
        generator_type: 'lab_bookpro',
        generator_version: 'bookpro_runtime_1.3',
        prompt_version: 'lab_bookpro_prompt_runtime_1.3',
        view_mode_default: 'full',
        created_at: now,
        updated_at: now,
        html_full_path: `data/runtime/reports/html/${repId}__full.html`,
        html_doctor_path: `data/runtime/reports/html/${repId}__doctor.html`,
        md_path: `data/runtime/reports/md/${repId}.md`,
        txt_path: `data/runtime/reports/txt/${repId}.txt`,
        pdf_path: `data/runtime/reports/pdf/${repId}.pdf`,
        json_path: `data/runtime/reports/json/${repId}.json`,
        viewer_url: `lab_bookpro_report.html?report_id=${encodeURIComponent(repId)}`,
        is_latest: true,
        summary_short: `Book/Pro runtime izveštaj za: ${docRef.title}`,
        summary_clinical: 'Generisan je Book/Pro report sa Full i Doctor view režimima, parametrima, OCR engine metapodacima i follow-up slojem.',
        status: 'ready'
      };
      const renderer = window.SinetLabBookProRenderer;
      const built = renderer ? renderer.build({ document: docRef, extract, report: reportBase }) : {
        html_full: `<html><body><h1>${docRef.title}</h1></body></html>`,
        html_doctor: `<html><body><h1>${docRef.title}</h1></body></html>`,
        md: `# ${docRef.title}`,
        txt: docRef.title,
        json: { document: docRef, extract },
        summary_short: reportBase.summary_short,
        summary_clinical: reportBase.summary_clinical
      };
      const htmlFullWrite = await this._writeRuntimeText(reportBase.html_full_path, built.html_full);
      const htmlDoctorWrite = await this._writeRuntimeText(reportBase.html_doctor_path, built.html_doctor);
      const mdWrite = await this._writeRuntimeText(reportBase.md_path, built.md);
      const txtWrite = await this._writeRuntimeText(reportBase.txt_path, built.txt);
      const jsonWrite = await this._writeRuntimeJson(reportBase.json_path, built.json);
      const report = Object.assign({}, reportBase, {
        summary_short: built.summary_short || reportBase.summary_short,
        summary_clinical: built.summary_clinical || reportBase.summary_clinical,
        html_full_inline: built.html_full,
        html_doctor_inline: built.html_doctor,
        md_inline: built.md,
        txt_inline: built.txt,
        json_inline: built.json,
        html_full_url: htmlFullWrite.file_url || htmlFullWrite.relative_path || reportBase.html_full_path,
        html_doctor_url: htmlDoctorWrite.file_url || htmlDoctorWrite.relative_path || reportBase.html_doctor_path,
        md_url: mdWrite.file_url || mdWrite.relative_path || reportBase.md_path,
        txt_url: txtWrite.file_url || txtWrite.relative_path || reportBase.txt_path,
        json_url: jsonWrite.file_url || jsonWrite.relative_path || reportBase.json_path,
        persistence_mode: docRef.storage_mode === 'bridge_disk' ? 'bridge_disk' : 'inline_with_optional_bridge_artifacts'
      });

      reports.forEach(r => { if (String(r.document_id) === String(docRef.document_id)) r.is_latest = false; });
      reports.unshift(report);
      docRef.linked_report_ids = Array.isArray(docRef.linked_report_ids) ? docRef.linked_report_ids : [];
      docRef.linked_report_ids.unshift(repId);
      await this.put('generated_reports', reports);
      await this.put('source_documents', refreshedDocs);
      await this.appendAudit({
        module: 'lab_bookpro',
        entity_type: 'generated_report',
        entity_id: repId,
        action: 'lab_bookpro_report_generated',
        details: {
          document_id: docRef.document_id,
          extract_id: extract.extract_id,
          generator_version: report.generator_version,
          persistence_mode: report.persistence_mode,
          parameters: Array.isArray(extract.parameters) ? extract.parameters.length : 0
        }
      });
      return { extract, report, document: docRef, reused:false };
    }

    async getReportById(reportId){
      const reports = await this.getCollection('generated_reports') || [];
      return reports.find(r => String(r.report_id) === String(reportId)) || null;
    }

    async getAnamnezaById(anamnezaId){
      const list = await this.getCollection('anamneza_entries') || [];
      return list.find(x => String(x.anamneza_id) === String(anamnezaId)) || null;
    }

    async createAnamnezaEntry(payload){
      const list = await this.getCollection('anamneza_entries') || [];
      const now = new Date().toISOString();
      const id = this.idService.next('anamneza');
      const entry = {
        anamneza_id: id,
        patient_id: 'local_default_patient',
        owner_module: 'anamneza',
        chief_complaint: String(payload?.chief_complaint || '').trim(),
        symptoms: String(payload?.symptoms || '').split(',').map(x => x.trim()).filter(Boolean),
        timeline: String(payload?.timeline || '').trim(),
        triggers: String(payload?.triggers || '').split(',').map(x => x.trim()).filter(Boolean),
        relief_factors: String(payload?.relief_factors || '').split(',').map(x => x.trim()).filter(Boolean),
        therapies: String(payload?.therapies || '').split(',').map(x => x.trim()).filter(Boolean),
        free_notes: String(payload?.free_notes || '').trim(),
        linked_document_ids: Array.isArray(payload?.linked_document_ids) ? payload.linked_document_ids.filter(Boolean) : [],
        linked_report_ids: Array.isArray(payload?.linked_report_ids) ? payload.linked_report_ids.filter(Boolean) : [],
        linked_dx_ids: Array.isArray(payload?.linked_dx_ids) ? payload.linked_dx_ids.filter(Boolean) : [],
        created_at: now,
        updated_at: now,
        status: 'active'
      };
      list.unshift(entry);
      await this.put('anamneza_entries', list);
      await this.appendAudit({
        module: 'anamneza',
        entity_type: 'anamneza_entry',
        entity_id: id,
        action: 'anamneza_entry_created',
        details: { chief_complaint: entry.chief_complaint, linked_documents: entry.linked_document_ids.length, linked_reports: entry.linked_report_ids.length }
      });
      for (const docId of entry.linked_document_ids) await this.linkDocumentToAnamneza(docId, id, { silentAudit:true });
      for (const repId of entry.linked_report_ids) await this.linkReportToAnamneza(repId, id, { silentAudit:true });
      return entry;
    }

    async linkDocumentToAnamneza(documentId, anamnezaId, options){
      const docs = await this.getCollection('source_documents') || [];
      const list = await this.getCollection('anamneza_entries') || [];
      const doc = docs.find(d => String(d.document_id) === String(documentId));
      const anam = list.find(a => String(a.anamneza_id) === String(anamnezaId));
      if (!doc || !anam) throw new Error('Dokument ili anamneza nisu pronađeni.');
      doc.linked_anamneza_ids = Array.isArray(doc.linked_anamneza_ids) ? doc.linked_anamneza_ids : [];
      anam.linked_document_ids = Array.isArray(anam.linked_document_ids) ? anam.linked_document_ids : [];
      if (!doc.linked_anamneza_ids.includes(anamnezaId)) doc.linked_anamneza_ids.unshift(anamnezaId);
      if (!anam.linked_document_ids.includes(documentId)) anam.linked_document_ids.unshift(documentId);
      anam.updated_at = new Date().toISOString();
      await this.put('source_documents', docs);
      await this.put('anamneza_entries', list);
      if (!options?.silentAudit) {
        await this.appendAudit({ module: 'anamneza', entity_type: 'anamneza_link', entity_id: `${anamnezaId}:${documentId}`, action: 'document_linked_to_anamneza', details: { document_id: documentId, anamneza_id: anamnezaId } });
      }
      return { document: doc, anamneza: anam };
    }

    async linkReportToAnamneza(reportId, anamnezaId, options){
      const reports = await this.getCollection('generated_reports') || [];
      const list = await this.getCollection('anamneza_entries') || [];
      const report = reports.find(r => String(r.report_id) === String(reportId));
      const anam = list.find(a => String(a.anamneza_id) === String(anamnezaId));
      if (!report || !anam) throw new Error('Report ili anamneza nisu pronađeni.');
      anam.linked_report_ids = Array.isArray(anam.linked_report_ids) ? anam.linked_report_ids : [];
      if (!anam.linked_report_ids.includes(reportId)) anam.linked_report_ids.unshift(reportId);
      anam.updated_at = new Date().toISOString();
      await this.put('anamneza_entries', list);
      if (!options?.silentAudit) {
        await this.appendAudit({ module: 'anamneza', entity_type: 'anamneza_link', entity_id: `${anamnezaId}:${reportId}`, action: 'report_linked_to_anamneza', details: { report_id: reportId, anamneza_id: anamnezaId } });
      }
      return { report, anamneza: anam };
    }

    async createBackupSnapshot(scope){
      const list = await this.getCollection('backup_manifests') || [];
      const id = this.idService.next('backup');
      const item = {
        backup_id: id,
        created_at: new Date().toISOString(),
        backup_type: 'snapshot',
        scope: scope || 'full_runtime',
        created_by: 'local_user',
        manifest_version: 1,
        storage_path: `data/runtime/backups/${id}/`,
        included_files: Object.values(FILE_MAP).map(x => x.replace(/^data\/runtime\//,'')),
        attachment_policy: 'metadata_and_runtime_files',
        checksum: '',
        status: 'valid'
      };
      list.unshift(item);
      await this.put('backup_manifests', list);
      await this.appendAudit({ module:'backup_restore', entity_type:'backup_manifest', entity_id:id, action:'backup_snapshot_created', details:{ scope:item.scope } });
      return item;
    }

    async createRestorePreview(backupId, scope){
      const list = await this.getCollection('restore_jobs') || [];
      const id = this.idService.next('restore');
      const item = {
        restore_job_id: id,
        created_at: new Date().toISOString(),
        created_by: 'local_user',
        source_backup_id: backupId,
        restore_mode: 'preview',
        target_scope: scope || 'full_runtime',
        conflicts_detected: [],
        selected_files: ['source_documents.json','medical_extracts.json','generated_reports.json','anamneza_entries.json'],
        preview_summary: { files_to_restore: 4, overwrite_required: false },
        rollback_backup_id: null,
        status: 'preview'
      };
      list.unshift(item);
      await this.put('restore_jobs', list);
      await this.appendAudit({ module:'backup_restore', entity_type:'restore_job', entity_id:id, action:'restore_preview_created', details:{ backup_id:backupId, scope:item.target_scope } });
      return item;
    }
  }

  window.SinetMedicalRuntimeStore = SinetMedicalRuntimeStore;
})();
