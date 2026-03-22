/* SINET_TEMPLATE_v2 — shared HTML wrapper for rich reports
 * Ko-autorstvo: miuchins (Svetozar Miučin) + SINET AI
 * License: project license
 */
(function(){
  const esc = (s)=>String(s??'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  function buildTopbar(opts){
    const backBtn = opts.backUrl ? `<button class="btn" onclick="goBack()">← Nazad u SINET</button>` : '';
    const hasPayload = (opts && ((opts.payloadJson !== undefined && opts.payloadJson !== null) || (opts.anamnezaJson !== undefined && opts.anamnezaJson !== null)));
    const jsonBtns = hasPayload
      ? `<button class="btn" onclick="copyJSON()">🧾 JSON</button><button class="btn" onclick="downloadJSON()">⬇️ JSON</button>`
      : '';
    const extra = opts.extraButtonsHtml || '';
    const badges = `
      <span class="badge">Template: ${esc(opts.templateName||'SINET_TEMPLATE_v2')}</span>
      <span class="badge">Ko-autorstvo: ${esc(opts.coauthor||'miuchins + SINET AI')}</span>
      ${opts.badgesHtml || ''}
    `;
    return `
      <div class="topbar no-print">
        <div class="topbar-left">
          ${backBtn}
          <button class="btn btn-ghost actions-toggle" onclick="toggleActions()">☰ Meni</button>
          <div class="actions" id="sinetActions">
            <button class="btn" onclick="downloadTXT()">TXT</button>
            <button class="btn" onclick="copyMD()">📋 Kopiraj (.md)</button>
            <button class="btn" onclick="downloadHTML()">HTML</button>
            <button class="btn" onclick="window.print()">🖨️ Štampaj</button>
            <button class="btn" onclick="sendEmail()">✉️ E-mail</button>
            ${jsonBtns}
            ${extra}
          </div>
        </div>

        <div class="topbar-right">
          <button class="btn btn-ghost meta-toggle" onclick="toggleMeta()">ℹ️ Info</button>
          <div class="meta" id="sinetMeta">
            ${badges}
          </div>
        </div>
      </div>
    `;
  }

  function baseCss(){
    // high-contrast, readable, RA-inspired
    return `
      *{ box-sizing:border-box; }
      body{
        font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
        line-height:1.6;
        color:#2c3e50;
        max-width:1200px;
        margin:20px auto;
        padding:20px;
        background-color:#faf9f7;
      }
      h1,h2,h3{
        color:#1e4660;
        border-bottom:2px solid #b89e84;
        padding-bottom:8px;
      }
      .topbar{
        display:flex; gap:10px; flex-wrap:wrap;
        justify-content:space-between; align-items:center;
        margin-bottom:16px;
        position:sticky; top:0; z-index:50;
        background:rgba(250,249,247,.92);
        backdrop-filter:blur(6px);
        padding:10px 0;
        border-bottom:1px solid #e8dfd3;
      }
      .topbar-left, .topbar-right{
        display:flex; gap:10px; flex-wrap:wrap; align-items:center;
      }
      .actions{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .meta{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }
      .actions-toggle, .meta-toggle{
        display:none;
      }
      .btn-ghost{
        background: transparent;
        color:#6f4e37;
        border:1px dashed #b8a08c;
        box-shadow:none;
      }
      .btn-ghost:hover{ background: rgba(111,78,55,0.08); transform:none; }
      @media (max-width: 720px){
        /* Mobile UX: prevent the topbar from eating the screen while reading */
        body{ margin: 10px auto; padding: 12px; }
        .topbar{ position: static; padding: 8px 0; }
        .btn{ padding: 9px 12px; font-size: 0.98rem; }
        .badge{ font-size: 0.78rem; }
        .actions-toggle, .meta-toggle{ display:inline-flex; }
        .actions, .meta{ display:none; }
        .actions.open, .meta.open{ display:flex; }
      }

      .btn{
        background-color:#6f4e37;
        color:#fff;
        border:1px solid #5a3e2b;
        padding:10px 14px;
        font-size:1.0rem;
        border-radius:999px;
        cursor:pointer;
        font-weight:700;
        box-shadow:0 4px 12px rgba(111,78,55,0.25);
        transition:all .2s;
      }
      .btn:hover{ background-color:#5a3e2b; transform:translateY(-1px); }
      .badge{
        background-color:#d9c8b2;
        color:#3d2b1c;
        font-weight:700;
        padding:6px 14px;
        border-radius:30px;
        display:inline-block;
        font-size:0.85rem;
      }
      .warning-box{
        background-color:#fff3cd;
        border-left:6px solid #ffc107;
        padding:15px 20px;
        border-radius:8px;
        margin:25px 0;
        box-shadow:0 2px 5px rgba(0,0,0,0.05);
      }
      .danger-box{
        background-color:#ffe4e6;
        border-left:6px solid #b91c1c;
        padding:15px 20px;
        border-radius:8px;
        margin:25px 0;
        box-shadow:0 2px 5px rgba(0,0,0,0.05);
      }
      .info-box{
        background:#eff6ff;
        border-left:6px solid #2563eb;
        padding:15px 20px;
        border-radius:8px;
        margin:25px 0;
      }
      .card{
        background:white;
        border-radius:20px;
        padding:20px;
        box-shadow:0 5px 20px rgba(0,20,30,0.08);
        border:1px solid #e8dfd3;
      }
      .profile-snapshot{
        margin:18px 0;
        background:#f8fbff;
        border-color:#d7e6f7;
      }
      .footer-note{
        font-size:0.9rem;
        color:#5d6d7e;
        text-align:center;
        margin-top:40px;
        border-top:1px solid #d0deeb;
        padding-top:20px;
      }
      pre{
        white-space:pre-wrap; word-break:break-word;
        background:#0b1220; color:#e5e7eb;
        padding:12px; border-radius:12px; border:1px solid #111827;
        overflow:auto;
      }
      code{ background:#f2f2f2; padding:2px 6px; border-radius:6px; }
      .small{ font-size:0.9rem; color:#5d6d7e; }
      .no-print{}
      @media print{ .no-print{ display:none !important; } body{ background:#fff; } .topbar{ position:static; border-bottom:none; } }
    `;
  }

  function buildDoc(opts){
    const title = opts.title || 'SINET izveštaj';
    const subtitle = opts.subtitle || '';
    const patientLine = opts.patientLine ? `<div class="info-box">${opts.patientLine}</div>` : '';
    const profileSnapshotHtml = opts.profileSnapshotHtml || '';
    const warningsHtml = opts.warningsHtml || '';
    const contentHtml = opts.contentHtml || '<div class="card">Nema sadržaja.</div>';
    const payloadObj = (opts.payloadJson !== undefined && opts.payloadJson !== null)
      ? opts.payloadJson
      : ((opts.anamnezaJson !== undefined && opts.anamnezaJson !== null) ? opts.anamnezaJson : null);
    const isAnamneza = (payloadObj !== null) && (opts.payloadJson === undefined || opts.payloadJson === null) && (opts.anamnezaJson !== undefined && opts.anamnezaJson !== null);
    const payloadTitle = isAnamneza
      ? '🧾 Import u SINET Anamnezu (JSON)'
      : (opts.payloadSectionTitle || '🧾 JSON prilog');
    const payloadHelp = isAnamneza
      ? `U aplikaciji: <code>Anamneza</code> → <code>Uvezi JSON</code> → izaberi fajl, ili kopiraj sadržaj ispod.`
      : (opts.payloadHelpText || `Ovaj deo sadrži <b>RAW JSON</b> (za čuvanje, deljenje ili inspekciju).`);
    const importBlock = payloadObj ? `
      <h2 id="sinetPayload">${payloadTitle}</h2>
      <div class="card">
        <p>${payloadHelp}</p>
        <pre id="payloadJson"></pre>
      </div>
    ` : '';

    const footer = opts.footerHtml || `
      <div class="footer-note">
        © SINET • informativni materijal (ne postavlja dijagnozu).<br/>
        Ko-autorstvo: ${esc(opts.coauthor||'miuchins (Svetozar Miučin) + SINET AI')}
      </div>
    `;

    const topbar = buildTopbar(opts);

    return `<!doctype html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>${baseCss()}</style>
  ${opts.extraHeadHtml||''}
</head>
<body>
  ${topbar}
  <h1>${esc(title)}</h1>
  ${subtitle ? `<p><strong>${esc(subtitle)}</strong></p>` : ''}
  ${patientLine}
  ${profileSnapshotHtml}
  ${warningsHtml}
  <div style="text-align:right" class="no-print">
    <button class="btn" onclick="copyPlan()">📋 Kopiraj kompletan plan</button>
  </div>
  <div id="contentToCopy">
    ${contentHtml}
  </div>
  ${importBlock}
  ${footer}

<script>
  const QS = new URLSearchParams(location.search);
  const BACK_URL = ${opts.backUrl ? JSON.stringify(opts.backUrl) : "null"};
  const PAYLOAD_OBJ = ${payloadObj ? JSON.stringify(payloadObj) : "null"};
  // Backward-compat alias
  const ANAMNEZA_OBJ = PAYLOAD_OBJ;
  const PAYLOAD_FILENAME = ${JSON.stringify(opts.payloadFilename || (isAnamneza ? 'ANAMNEZA.json' : 'SINET_payload.json'))};

  function goBack(){
    if(BACK_URL){ location.href = BACK_URL; return; }
    const back = QS.get('back'); if(back){ location.href = back; return; }
    try{ history.back(); }catch(_){ location.href = '../index.html'; }
  }


  function toggleActions(){
    try{
      const el = document.getElementById('sinetActions');
      if(el) el.classList.toggle('open');
    }catch(_){}
  }
  function toggleMeta(){
    try{
      const el = document.getElementById('sinetMeta');
      if(el) el.classList.toggle('open');
    }catch(_){}
  }

  function contentEl(){ return document.getElementById('contentToCopy'); }
  function textContent(){ return contentEl() ? contentEl().innerText : ''; }

  function buildMd(){
    const t = textContent();
    return '# ' + ${JSON.stringify(title)} + '\\n\\n' + t;
  }

  function download(content, filename, mime){
    const blob = new Blob([content], {type: mime||'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){} }, 30000);
  }

  function downloadTXT(){ download(textContent(), 'SINET_IZVESTAJ.txt', 'text/plain;charset=utf-8'); }
  function downloadHTML(){ download(document.documentElement.outerHTML, 'SINET_IZVESTAJ.html', 'text/html;charset=utf-8'); }
  async function copyMD(){ try{ await navigator.clipboard.writeText(buildMd()); alert('✅ Kopirano kao Markdown (.md).'); }catch(e){ alert('Ne mogu da kopiram (dozvole).'); } }

  function sendEmail(){
    const subj = ${JSON.stringify(title)};
    const body = textContent();
    location.href = 'mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  }

  function copyPlan(){
    const el = contentEl(); if(!el) return;
    const htmlContent = el.innerHTML;
    const plainText = el.innerText;
    if(navigator.clipboard && window.ClipboardItem){
      try{
        navigator.clipboard.write([ new ClipboardItem({
          'text/html': new Blob([htmlContent], {type:'text/html'}),
          'text/plain': new Blob([plainText], {type:'text/plain'})
        })]).then(()=>alert('Kompletan plan je kopiran (HTML + tekst)!'));
      }catch(err){
        fallbackCopy(plainText);
      }
    }else{
      fallbackCopy(plainText);
    }
  }
  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Kopiran je običan tekst (HTML opcija nije podržana).');
  }

  function copyJSON(){
    if(!PAYLOAD_OBJ) return alert('Nema JSON podataka.');
    navigator.clipboard.writeText(JSON.stringify(PAYLOAD_OBJ, null, 2)).then(()=>alert('Kopiran JSON.'));
  }
  function downloadJSON(){
    if(!PAYLOAD_OBJ) return alert('Nema JSON podataka.');
    download(JSON.stringify(PAYLOAD_OBJ, null, 2), PAYLOAD_FILENAME, 'application/json;charset=utf-8');
  }

  (function(){
    const pre = document.getElementById('payloadJson') || document.getElementById('anamnezaJson');
    if(pre && PAYLOAD_OBJ) pre.textContent = JSON.stringify(PAYLOAD_OBJ, null, 2);
  })();
</script>
</body>
</html>`;
  }

  window.SINET_TemplateV2 = { buildDoc };
})();
