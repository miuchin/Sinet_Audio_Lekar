(function(){
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function ensureStyle(){
    if (document.getElementById('sinet-item-shell-style')) return;
    const st = document.createElement('style');
    st.id = 'sinet-item-shell-style';
    st.textContent = `
      .sinet-item-shell{background:#fff;border:1px solid #dfe8f1;border-radius:16px;padding:14px 16px;box-shadow:0 4px 16px rgba(14,48,74,0.06);margin:12px 0;}
      .sinet-item-shell h4{margin:0 0 8px 0;color:#1e4660;}
      .sinet-item-meta{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px 0;}
      .sinet-item-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#f3f8fd;border:1px solid #d5e4f3;color:#244d68;font-weight:800;font-size:.88rem;}
      .sinet-freq-table{width:100%;border-collapse:collapse;}
      .sinet-freq-table th,.sinet-freq-table td{padding:9px 8px;border-bottom:1px solid #edf2f7;vertical-align:top;text-align:left;}
      .sinet-freq-table th{color:#5d7890;font-size:.82rem;text-transform:uppercase;letter-spacing:.03em;}
      .sinet-freq-name{font-weight:800;color:#163d56;display:block;}
      .sinet-freq-note{color:#60798b;font-size:.86rem;display:block;margin-top:3px;}
      .sinet-freq-editor-row{border:1px solid #e3ecf4;border-radius:14px;padding:10px;background:#fbfdff;margin:8px 0;}
      .sinet-freq-editor-grid{display:grid;grid-template-columns:110px 1fr;gap:8px;}
      .sinet-freq-editor-row input,.sinet-freq-editor-row textarea{width:100%;padding:10px 11px;border:1px solid #d7e0e8;border-radius:10px;box-sizing:border-box;}
      .sinet-freq-editor-row textarea{min-height:74px;resize:vertical;}
      @media (max-width: 680px){ .sinet-freq-editor-grid{grid-template-columns:1fr;} }
    `;
    document.head.appendChild(st);
  }

  function renderMetaRibbon(item, options){
    const meta = [];
    const area = String(item?.oblast || '').trim();
    const mkb = String(options?.mkbText || '').trim();
    const freqCount = Array.isArray(item?.frekvencije) ? item.frekvencije.length : 0;
    if (area) meta.push(`<span class="sinet-item-chip">🗂 ${esc(area)}</span>`);
    if (mkb) meta.push(`<span class="sinet-item-chip">🏷 ${esc(mkb)}</span>`);
    if (freqCount) meta.push(`<span class="sinet-item-chip">🎵 ${freqCount} frekv.</span>`);
    return meta.length ? `<div class="sinet-item-meta">${meta.join('')}</div>` : '';
  }

  function renderFrequencyCollection(freqs, options){
    ensureStyle();
    const arr = Array.isArray(freqs) ? freqs : [];
    const perMin = Number(options?.perMin || 0) || '';
    const title = options?.title || `Frekvencije (${arr.length})`;
    const emptyText = options?.emptyText || 'Nema frekvencija.';
    const head = options?.head !== false;
    const rows = arr.map((f, i) => {
      const prefix = typeof options?.rowPrefix === 'function' ? options.rowPrefix(f, i) : '';
      const suffix = typeof options?.rowSuffix === 'function' ? options.rowSuffix(f, i) : '';
      const hz = f?.hz || f?.value || '';
      const name = String(f?.naziv || '').trim();
      const description = String(f?.opis || '').trim();
      const functionText = String(f?.funkcija || f?.svrha || '').trim();
      const source = String(f?.izvor || f?.izvor_obj?.text || '').trim();
      const duration = Number(f?.trajanje_min || perMin || 0) || '';
      return `<tr>
        <td>${prefix}${hz ? `<b>${esc(hz)} Hz</b>` : '<span style="color:#8093a2;">-</span>'}${suffix}</td>
        <td>
          ${name ? `<span class="sinet-freq-name">${esc(name)}</span>` : ''}
          ${functionText ? `<span>${esc(functionText)}</span>` : '<span style="color:#8093a2;">(nema funkcije)</span>'}
          ${description ? `<span class="sinet-freq-note">${esc(description)}</span>` : ''}
        </td>
        <td>${source ? esc(source) : '<span style="color:#8093a2;">-</span>'}</td>
        <td>${duration ? `${esc(duration)} min` : '<span style="color:#8093a2;">-</span>'}</td>
      </tr>`;
    }).join('');
    return `<div class="sinet-item-shell"><h4>🎵 ${esc(title)}</h4>${head ? `<table class="sinet-freq-table"><thead><tr><th>Hz</th><th>Naziv / opis / funkcija</th><th>Izvor</th><th>Trajanje</th></tr></thead><tbody>${rows || `<tr><td colspan="4">${esc(emptyText)}</td></tr>`}</tbody></table>` : rows || `<div>${esc(emptyText)}</div>`}</div>`;
  }

  function renderFrequencyEditorRows(freqs){
    ensureStyle();
    const arr = (Array.isArray(freqs) && freqs.length) ? freqs : [{}];
    return arr.map((f, i) => `
      <div class="sinet-freq-editor-row">
        <div class="sinet-freq-editor-grid">
          <div>
            <label style="font-weight:800; display:block; margin-bottom:6px;">Hz</label>
            <input data-fhz="${i}" placeholder="npr. 432" value="${esc(f?.hz ?? f?.value ?? '')}">
          </div>
          <div>
            <label style="font-weight:800; display:block; margin-bottom:6px;">Naziv frekvencije</label>
            <input data-fnm="${i}" placeholder="Kratak naziv (opciono)" value="${esc(f?.naziv || '')}">
          </div>
        </div>
        <div style="margin-top:8px;">
          <label style="font-weight:800; display:block; margin-bottom:6px;">Opis / funkcija</label>
          <textarea data-fdc="${i}" placeholder="Čemu služi, kako se koristi, glavni efekat">${esc(f?.funkcija || f?.svrha || f?.opis || '')}</textarea>
        </div>
        <div style="margin-top:8px;">
          <label style="font-weight:800; display:block; margin-bottom:6px;">Izvor</label>
          <input data-fsrc="${i}" placeholder="Link ili tekstualni izvor" value="${esc(f?.izvor || f?.izvor_obj?.text || '')}">
        </div>
      </div>`).join('');
  }

  window.SINET_ItemShell = {
    ensureStyle,
    renderMetaRibbon,
    renderFrequencyCollection,
    renderFrequencyEditorRows
  };
})();
