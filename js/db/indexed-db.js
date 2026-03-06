/*
  SINET Audio Lekar — IndexedDB Layer
  File: js/db/indexed-db.js
  Version: 1.3
  Author: miuchins | Co-author: SINET AI
  Notes:
    - Favorites, main playlist, last session resume, audit log (append-only)
*/

const DB_CONFIG = {
  name: "SINET_Audio_DB",
  version: 6,
};

class SinetDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.isReady && this.db) return true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("state")) {
          db.createObjectStore("state", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("protocols")) {
          db.createObjectStore("protocols", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("audit_log")) {
          const s = db.createObjectStore("audit_log", { keyPath: "id", autoIncrement: true });
          try { s.createIndex('ts', 'ts', { unique:false }); } catch(_) {}
          try { s.createIndex('severity', 'severity', { unique:false }); } catch(_) {}
          try { s.createIndex('category', 'category', { unique:false }); } catch(_) {}
        }
        if (!db.objectStoreNames.contains("audit_archive")) {
          const a = db.createObjectStore("audit_archive", { keyPath: "id", autoIncrement: true });
          try { a.createIndex('ts', 'ts', { unique:false }); } catch(_) {}
          try { a.createIndex('severity', 'severity', { unique:false }); } catch(_) {}
          try { a.createIndex('category', 'category', { unique:false }); } catch(_) {}
          try { a.createIndex('batchId', 'batchId', { unique:false }); } catch(_) {}
        } else {
          // v6: add batchId index for fast archive browsing
          try {
            const a = event.target.transaction.objectStore("audit_archive");
            a && a.createIndex && a.createIndex('batchId', 'batchId', { unique:false });
          } catch(_) {}
        }

        if (!db.objectStoreNames.contains("audit_batches")) {
          const b = db.createObjectStore("audit_batches", { keyPath: "id" });
          try { b.createIndex('range_to', 'range_to', { unique:false }); } catch(_) {}
          try { b.createIndex('created_at', 'created_at', { unique:false }); } catch(_) {}
        }

      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        console.log("SINET DB: Ready");
        resolve(true);
      };

      request.onerror = () => {
        console.error("SINET DB: Init error", request.error);
        reject(request.error);
      };
    });
  }

  async _ensure() {
    if (!this.db || !this.isReady) await this.init();
  }

  _tx(storeName, mode) {
    if (!this.db) throw new Error("DB not initialized");
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  _put(storeName, item) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readwrite");
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _getRaw(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.data ?? req.result) : null);
      req.onerror = () => reject(req.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _getAllByIndex(storeName, indexName, key) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._tx(storeName, "readonly");
        const idx = store.index(indexName);
        const req = idx.getAll(key);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (e) {
        // Fallback if index not available (older DB) — return empty
        resolve([]);
      }
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readwrite");
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  /* ---------- Audit (system append-only) ---------- */
  _auditNow() {
    const ts = Date.now();
    return { ts, timestamp: new Date(ts).toISOString() };
  }

  async logAction(category, action, details = "", extra = null) {
    try {
      await this._ensure();
      const now = this._auditNow();
      const row = {
        ...now,
        severity: (extra && extra.severity) ? String(extra.severity) : (category === 'ERROR' ? 'ERROR' : 'INFO'),
        category: String(category || 'INFO'),
        action: String(action || ''),
        details: (typeof details === 'string') ? details : JSON.stringify(details ?? ''),
        entityType: extra?.entityType ? String(extra.entityType) : '',
        entityId: extra?.entityId ? String(extra.entityId) : '',
        source: extra?.source ? String(extra.source) : '',
        meta: extra?.meta ? JSON.stringify(extra.meta) : '',
        userAgent: navigator.userAgent
      };
      await this._put('audit_log', row);
    } catch(e) {}
  }

  async logError(action, err, extra = null) {
    const msg = (err && err.message) ? err.message : String(err || 'Unknown error');
    const stack = (err && err.stack) ? String(err.stack) : '';
    return this.logAction('ERROR', (action || 'Error'), msg, {
      severity: 'ERROR',
      source: extra?.source || 'runtime',
      entityType: extra?.entityType || '',
      entityId: extra?.entityId || '',
      meta: { stack, ...(extra?.meta||{}) }
    });
  }

  async pruneAudit(retentionDays = 7) {
    // Legacy helper: keep by days (v1 behavior)
    return this.rotateAudit({ mode: 'days', keepDays: Number(retentionDays) || 7, policyTag: 'days-legacy' });
  }

  _makeBatchId(prefix = 'AUDIT') {
    const rnd = Math.random().toString(16).slice(2);
    return `${prefix}_${Date.now()}_${rnd}`;
  }

  _iso(ts) {
    try { return new Date(Number(ts || 0)).toISOString(); } catch(_) { return new Date().toISOString(); }
  }

  async rotateAudit(settings = {}) {
    await this._ensure();

    const mode = String(settings.mode || settings.retentionMode || 'days').toLowerCase();
    const keepCount = Number(settings.keepCount ?? settings.count ?? settings.retentionCount ?? 1000);
    const keepDays = Number(settings.keepDays ?? settings.days ?? settings.retentionDays ?? 7);
    const policyTag = String(settings.policyTag || mode || 'days');

    const rows = (await this._getAll('audit_log')) || [];
    if (!rows.length) return { moved: 0, batchId: null };

    const sorted = rows.slice().sort((a,b)=> Number(a.ts||0) - Number(b.ts||0));

    const msDay = 24*60*60*1000;
    const cutoffTs = (Number.isFinite(keepDays) && keepDays > 0) ? (Date.now() - keepDays*msDay) : null;

    // newest N set (for hybrid)
    const newestN = (Number.isFinite(keepCount) && keepCount > 0) ? sorted.slice(Math.max(0, sorted.length - keepCount)) : [];
    const newestIds = new Set(newestN.map(r => r.id).filter(v => v !== undefined && v !== null));

    let toMove = [];
    if (mode === 'count') {
      const n = (Number.isFinite(keepCount) && keepCount > 0) ? keepCount : 1000;
      toMove = sorted.slice(0, Math.max(0, sorted.length - n));
    } else if (mode === 'hybrid') {
      toMove = sorted.filter(r => {
        const ts = Number(r.ts||0);
        const inNewest = newestIds.has(r.id);
        const inDays = (cutoffTs === null) ? true : (ts >= cutoffTs);
        return !(inNewest || inDays);
      });
    } else {
      // days (default)
      toMove = sorted.filter(r => {
        const ts = Number(r.ts||0);
        if (cutoffTs === null) return false;
        return ts < cutoffTs;
      });
    }

    if (!toMove.length) return { moved: 0, batchId: null };

    const minTs = Math.min(...toMove.map(r => Number(r.ts||0) || Date.now()));
    const maxTs = Math.max(...toMove.map(r => Number(r.ts||0) || Date.now()));

    const batchId = this._makeBatchId('AUDIT');
    const batch = {
      id: batchId,
      range_from_ts: minTs,
      range_to_ts: maxTs,
      range_from: this._iso(minTs),
      range_to: this._iso(maxTs),
      count: toMove.length,
      policy_tag: policyTag,
      created_at: Date.now(),
      settings_snapshot: { mode, keepCount, keepDays }
    };

    try { await this._put('audit_batches', batch); } catch(_) {}

    // Move to archive then delete originals
    for (const r of toMove) {
      const copy = { ...r };
      const originalId = copy.id;
      delete copy.id;

      copy.batchId = batchId;
      copy.archive_range_from = batch.range_from;
      copy.archive_range_to = batch.range_to;

      await this._put('audit_archive', copy);
      if (originalId !== undefined && originalId !== null) {
        await this._delete('audit_log', originalId);
      }
    }

    // record archive action (in hot log)
    try {
      await this.logAction('SYSTEM', 'ARCHIVE', `Arhivirano ${toMove.length} zapisa`, {
        entityType: 'audit_batch',
        entityId: batchId,
        source: 'audit',
        meta: batch
      });
    } catch(_) {}

    return { moved: toMove.length, batchId };
  }

  async getAuditStats() {
    await this._ensure();
    const hot = (await this._getAll('audit_log')) || [];
    const arch = (await this._getAll('audit_archive')) || [];
    const batches = (await this._getAll('audit_batches')) || [];
    const lastBatch = batches.slice().sort((a,b)=> Number(a.range_to_ts||0) - Number(b.range_to_ts||0)).slice(-1)[0] || null;
    return {
      hotCount: hot.length,
      archiveCount: arch.length,
      batchCount: batches.length,
      lastBatch
    };
  }

  async getAuditBatches(opts = {}) {
    await this._ensure();
    const limit = Number(opts.limit ?? 50);
    const batches = (await this._getAll('audit_batches')) || [];
    const sorted = batches.slice().sort((a,b)=> Number(b.range_to_ts||0) - Number(a.range_to_ts||0));
    if (Number.isFinite(limit) && limit > 0) return sorted.slice(0, limit);
    return sorted;
  }

  async getAuditArchiveBatch(batchId, opts = {}) {
    await this._ensure();
    const id = String(batchId || '');
    if (!id) return [];
    const limit = Number(opts.limit ?? 5000);

    let rows = await this._getAllByIndex('audit_archive', 'batchId', id);
    if (!rows || !rows.length) {
      // Fallback if index not available
      const all = (await this._getAll('audit_archive')) || [];
      rows = all.filter(r => String(r.batchId||'') === id);
    }

    rows = rows.slice().sort((a,b)=> Number(a.ts||0) - Number(b.ts||0));
    if (Number.isFinite(limit) && limit > 0) rows = rows.slice(Math.max(0, rows.length - limit));
    return rows;
  }


  async getAuditLog(opts = {}) {
    await this._ensure();
    if (typeof opts === 'number') opts = { limit: opts };
    const limit = Number(opts.limit ?? 500);
    const includeArchive = !!opts.includeArchive;
    const sinceDays = (opts.sinceDays === undefined || opts.sinceDays === null) ? null : Number(opts.sinceDays);
    const sinceTs = (sinceDays && Number.isFinite(sinceDays)) ? (Date.now() - sinceDays*24*60*60*1000) : null;

    const cur = (await this._getAll('audit_log')) || [];
    let rows = cur;

    if (includeArchive) {
      const arch = (await this._getAll('audit_archive')) || [];
      rows = arch.concat(cur);
    }

    rows = rows
      .filter(r => !sinceTs || (Number(r.ts||0) >= sinceTs))
      .sort((a,b)=> Number(a.ts||0) - Number(b.ts||0));

    if (Number.isFinite(limit) && limit > 0) {
      rows = rows.slice(Math.max(0, rows.length - limit));
    }
    return rows;
  }

  auditToCsv(rows) {
    const safe = (v) => {
      const s = (v === null || v === undefined) ? '' : String(v);
      const q = s.replace(/"/g,'""');
      return `"${q}"`;
    };
    const header = ['timestamp','severity','category','action','details','entityType','entityId','source'];
    const out = [header.join(',')];
    (Array.isArray(rows)?rows:[]).forEach(r => {
      out.push([
        safe(r.timestamp||''),
        safe(r.severity||''),
        safe(r.category||''),
        safe(r.action||''),
        safe(r.details||''),
        safe(r.entityType||''),
        safe(r.entityId||''),
        safe(r.source||'')
      ].join(','));
    });
    return out.join('\n');
  }

  /* ---------- Favorites ---------- */
  async toggleFavorite(simptomId) {
    await this._ensure();
    const exists = await this._getRaw("favorites", simptomId);
    if (exists) {
      await this._delete("favorites", simptomId);
      this.logAction("USER", "Removed Favorite", simptomId);
      return false;
    }
    await this._put("favorites", { id: simptomId, addedAt: Date.now() });
    this.logAction("USER", "Added Favorite", simptomId);
    return true;
  }

  async getFavorites() {
    await this._ensure();
    return this._getAll("favorites");
  }

  /* ---------- Main playlist ---------- */
  async saveMainPlaylist(items) {
    await this._ensure();
    return this._put("state", { key: "main_playlist", data: Array.isArray(items) ? items : [], updatedAt: Date.now() });
  }

  async getMainPlaylist() {
    await this._ensure();
    const v = await this._get("state", "main_playlist");
    return Array.isArray(v) ? v : [];
  }

  async clearMainPlaylist() {
    await this._ensure();
    return this._delete("state", "main_playlist");
  }

  /* ---------- Resume state ---------- */
  async savePlayerState(stateData) {
    await this._ensure();
    return this._put("state", { key: "last_session", data: stateData || null, updatedAt: Date.now() });
  }

  async getPlayerState() {
    await this._ensure();
    return this._get("state", "last_session");
  }

  async clearPlayerState() {
    await this._ensure();
    return this._delete("state", "last_session");
  }

  /* ===================== Sessions (multi resume) ===================== */

  async getSessions() {
    await this._ensure();
    const r = await this._get('state', 'sessions_v1');
    const v = r ? r.value : null;
    return Array.isArray(v) ? v : [];
  }

  async saveSessions(list) {
    await this._ensure();
    const safe = Array.isArray(list) ? list : [];
    await this._put('state', { key: 'sessions_v1', value: safe });
    return safe;
  }

  async upsertSession(session) {
    await this._ensure();
    if (!session || !session.id) return this.getSessions();
    const list = await this.getSessions();
    const idx = list.findIndex(s => s && s.id === session.id);
    const merged = idx >= 0 ? Object.assign({}, list[idx], session) : session;
    if (idx >= 0) list[idx] = merged;
    else list.push(merged);
    // keep last 200 sessions
    if (list.length > 200) list.splice(0, list.length - 200);
    await this.saveSessions(list);
    return list;
  }

  async deleteSession(sessionId) {
    await this._ensure();
    const id = String(sessionId || '');
    if (!id) return this.getSessions();
    const list = await this.getSessions();
    const next = list.filter(s => s && s.id !== id);
    await this.saveSessions(next);
    return next;
  }




  /* ---------- Protocols (user-defined sequences) ---------- */
  async getProtocols() {
    await this._ensure();
    const rows = await this._getAll("protocols");
    // newest first
    return (Array.isArray(rows) ? rows : []).sort((a,b)=> (Number(b.updatedAt||b.createdAt||0) - Number(a.updatedAt||a.createdAt||0)));
  }

  async getProtocol(id) {
    await this._ensure();
    if (!id) return null;
    const raw = await this._getRaw("protocols", id);
    return raw || null;
  }

  async putProtocol(proto) {
    await this._ensure();
    if (!proto || typeof proto !== "object") throw new Error("Invalid protocol");
    if (!proto.id) throw new Error("Protocol missing id");
    const now = Date.now();
    const row = { ...proto };
    if (!row.createdAt) row.createdAt = now;
    row.updatedAt = now;
    await this._put("protocols", row);
    this.logAction("USER", "Save Protocol", String(row.id));
    return true;
  }

  async deleteProtocol(id) {
    await this._ensure();
    if (!id) return false;
    await this._delete("protocols", id);
    this.logAction("USER", "Delete Protocol", String(id));
    return true;
  }

  /* ---------- Backup / Restore ---------- */
  async exportAll() {
    await this._ensure();
    const state = await this._getAll("state");
    const favorites = await this._getAll("favorites");
    const playlists = await this._getAll("playlists");
    const audit = await this._getAll("audit_log");
    const auditArchive = await this._getAll("audit_archive");
    const auditBatches = await this._getAll("audit_batches");
    const protocols = await this._getAll("protocols");
    return { exportedAt: new Date().toISOString(), state, favorites, playlists, protocols, audit, auditArchive, auditBatches };
  }

  async importAll(payload) {
    await this._ensure();
    if (!payload || typeof payload !== "object") throw new Error("Invalid backup file");

    // Restore includes audit & session history (user request). Large logs are truncated on import.
    const state = Array.isArray(payload.state) ? payload.state : [];
    const favorites = Array.isArray(payload.favorites) ? payload.favorites : [];
    const playlists = Array.isArray(payload.playlists) ? payload.playlists : [];
    const protocols = Array.isArray(payload.protocols) ? payload.protocols : [];
    const audit = Array.isArray(payload.audit) ? payload.audit : [];
    const auditArchive = Array.isArray(payload.auditArchive) ? payload.auditArchive : [];
    const auditBatches = Array.isArray(payload.auditBatches) ? payload.auditBatches : [];

    for (const s of state) {
      if (s && typeof s === "object" && s.key) await this._put("state", s);
    }
    for (const f of favorites) {
      if (f && typeof f === "object" && f.id) await this._put("favorites", f);
    }

    // playlists store uses keyPath "id" (autoIncrement). We import as-is; if ids clash, later import overwrites.
    for (const p of playlists) {
      if (p && typeof p === "object") await this._put("playlists", p);
    }

    // protocols store uses keyPath "id". Import as-is.
    for (const pr of protocols) {
      if (pr && typeof pr === "object" && pr.id) await this._put("protocols", pr);
    }


    // Import audit log (optional but included in backup/restore)
    try {
      if (audit && audit.length) {
        // Clear current audit to avoid id collisions
        await new Promise((resolve) => {
          try { const store = this._tx("audit_log", "readwrite"); const req = store.clear(); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); } catch(e) { resolve(false); }
        });
        const tail = audit.slice(-5000);
        for (const a of tail) {
          if (!a || typeof a !== "object") continue;
          const row = Object.assign({}, a);
          // Let IndexedDB allocate id
          delete row.id;
          await this._put("audit_log", row);
        }
      }
      if (auditArchive && auditArchive.length) {
        await new Promise((resolve) => {
          try { const store = this._tx("audit_archive", "readwrite"); const req = store.clear(); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); } catch(e) { resolve(false); }
        });
        const tailA = auditArchive.slice(-5000);
        for (const a of tailA) {
          if (!a || typeof a !== "object") continue;
          const row = Object.assign({}, a);
          delete row.id;
          await this._put("audit_archive", row);
        }

      if (auditBatches && auditBatches.length) {
        await new Promise((resolve) => {
          try { const store = this._tx("audit_batches", "readwrite"); const req = store.clear(); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); } catch(e) { resolve(false); }
        });
        const tailB = auditBatches.slice(-2000);
        for (const b of tailB) {
          if (!b || typeof b !== "object" || !b.id) continue;
          await this._put("audit_batches", b);
        }
      }
      }
    } catch(_) {}

    this.logAction("USER", "Restore Backup", "Import All");
    return true;
  }
}

window.db = new SinetDB();
console.log("SINET DB: Kreirana globalna instanca window.db");