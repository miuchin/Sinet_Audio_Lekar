(function(){
  class SinetBridgeRuntime {
    constructor(){
      this._configPromise = null;
      this._statusPromise = null;
    }

    async getConfig(){
      if (this._configPromise) return this._configPromise;
      this._configPromise = (async () => {
        try {
          const res = await fetch('server/runtime.config.json', { cache: 'no-store' });
          if (!res.ok) throw new Error('config_not_found');
          return (await res.json()) || {};
        } catch(_) {
          const port = Number(window.location.port || 0);
          return {
            host: window.location.hostname || '127.0.0.1',
            server_port: port || 8130,
            bridge_port: port ? (port + 1) : 8131
          };
        }
      })();
      return this._configPromise;
    }

    async getBaseUrl(){
      const cfg = await this.getConfig();
      const host = cfg.host || window.location.hostname || '127.0.0.1';
      const bridgePort = Number(cfg.bridge_port || ((Number(window.location.port || 0) || 8130) + 1));
      return `${window.location.protocol}//${host}:${bridgePort}`;
    }

    async _request(path, options){
      const base = await this.getBaseUrl();
      const res = await fetch(base + path, Object.assign({ cache:'no-store' }, options || {}));
      if (!res.ok) throw new Error(`Bridge error ${res.status}`);
      return res.json();
    }

    async getStatus(force){
      if (!force && this._statusPromise) return this._statusPromise;
      this._statusPromise = (async () => {
        try {
          const data = await this._request('/api/runtime_storage_status');
          return Object.assign({ available: true }, data || {});
        } catch (err) {
          return { available: false, ok: false, error: err.message || 'bridge_unavailable' };
        }
      })();
      return this._statusPromise;
    }

    async isAvailable(){
      const status = await this.getStatus();
      return !!(status && status.available && status.ok !== false);
    }

    async writeText(relativePath, content){
      return this._request('/api/runtime/write_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relative_path: relativePath,
          text_content: String(content == null ? '' : content)
        })
      });
    }

    async writeJson(relativePath, payload){
      return this._request('/api/runtime/write_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relative_path: relativePath, json_content: payload })
      });
    }

    async saveAttachment(options){
      const file = options && options.file;
      if (!file) throw new Error('File is required.');
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      return this._request('/api/runtime/save_attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: options.document_id,
          original_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          base64_data: base64,
          subdir: options.subdir || 'documents'
        })
      });
    }

    async extractTextFromRuntimeFile(options){
      return this._request('/api/runtime/extract_text_from_attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relative_path: options?.relative_path || '',
          mime_type: options?.mime_type || '',
          filename: options?.filename || ''
        })
      });
    }
  }

  window.SinetBridgeRuntime = SinetBridgeRuntime;
})();
