(function(){
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  function flagLabel(flag){
    if (flag === 'high') return 'Povišeno';
    if (flag === 'low') return 'Sniženo';
    if (flag === 'normal') return 'U opsegu';
    return 'Provera';
  }

  function flagTone(flag){
    if (flag === 'high') return { bg:'#fff7ed', color:'#9a3412' };
    if (flag === 'low') return { bg:'#fef2f2', color:'#991b1b' };
    if (flag === 'normal') return { bg:'#ecfdf3', color:'#166534' };
    return { bg:'#eef6ff', color:'#0f3d66' };
  }

  function buildFindings(parameters){
    const highs = parameters.filter(p => p.flag === 'high').map(p => p.name);
    const lows = parameters.filter(p => p.flag === 'low').map(p => p.name);
    const normals = parameters.filter(p => p.flag === 'normal').length;
    const findings = [];
    findings.push(`Prepoznato parametara: ${parameters.length}.`);
    if (highs.length) findings.push(`Povišene vrednosti: ${highs.join(', ')}.`);
    if (lows.length) findings.push(`Snižene vrednosti: ${lows.join(', ')}.`);
    if (normals) findings.push(`U referentnom opsegu: ${normals}.`);
    return findings;
  }

  function buildDecisionAlgorithm(parameters){
    const highs = parameters.filter(p => p.flag === 'high');
    const lows = parameters.filter(p => p.flag === 'low');
    const lines = [];
    lines.push('1. Potvrditi čitljivost dokumenta i tačnost OCR sloja.');
    if (highs.length || lows.length) {
      lines.push(`2. Pregledati odstupanja (${[...highs, ...lows].map(x => x.name).join(', ')}) u kontekstu simptoma i anamneze.`);
      lines.push('3. Proveriti referentne opsege konkretne laboratorije i datum uzorkovanja.');
      lines.push('4. Po potrebi generisati novu verziju reporta nakon dopune extract sloja.');
    } else {
      lines.push('2. Nema jasnih odstupanja iz trenutno prepoznatih parametara; proveriti da li OCR sadrži sve vrednosti.');
      lines.push('3. Povezati dokument sa anamnezom radi kliničkog konteksta.');
    }
    return lines;
  }

  function makeParametersTable(parameters){
    if (!parameters.length) return '<div class="notice">Nema prepoznatih parametara.</div>';
    return `<table style="width:100%;border-collapse:collapse;font-size:.96rem;">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #dbe9f6;background:#f8fbff;">Parametar</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #dbe9f6;background:#f8fbff;">Vrednost</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #dbe9f6;background:#f8fbff;">Ref. opseg</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #dbe9f6;background:#f8fbff;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${parameters.map(p => {
          const tone = flagTone(p.flag);
          return `<tr>
            <td style="padding:10px;border-bottom:1px solid #ecf1f7;">${esc(p.name || '')}</td>
            <td style="padding:10px;border-bottom:1px solid #ecf1f7;">${esc(p.value || '')} ${esc(p.unit || '')}</td>
            <td style="padding:10px;border-bottom:1px solid #ecf1f7;">${esc(p.reference_range || '')}</td>
            <td style="padding:10px;border-bottom:1px solid #ecf1f7;"><span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${tone.bg};color:${tone.color};font-weight:700;">${esc(flagLabel(p.flag))}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  function jsonPretty(obj){ return JSON.stringify(obj, null, 2); }

  function cardsHtml(items){
    return `<div class="grid">${items.map(item => `<div class="card"><strong>${esc(item.label)}</strong><br>${esc(item.value)}</div>`).join('')}</div>`;
  }

  function makeMarkdown(payload){
    const doc = payload.document || {};
    const extract = payload.extract || {};
    const report = payload.report || {};
    const parameters = Array.isArray(extract.parameters) ? extract.parameters : [];
    const findings = Array.isArray(extract.key_findings) && extract.key_findings.length ? extract.key_findings : buildFindings(parameters);
    const warnings = Array.isArray(extract.warnings) ? extract.warnings : [];
    const algorithm = buildDecisionAlgorithm(parameters);
    const followup = Array.isArray(extract.follow_up_plan) ? extract.follow_up_plan : [];
    return [
      `# LAB / BookPro — ${doc.title || report.report_id || 'Izveštaj'}`,
      '',
      `- Report ID: ${report.report_id || ''}`,
      `- Dokument ID: ${doc.document_id || ''}`,
      `- Tip dokumenta: ${doc.document_type || ''}`,
      `- Datum dokumenta: ${doc.document_date || ''}`,
      `- Generator: ${report.generator_version || ''}`,
      `- Prompt: ${report.prompt_version || ''}`,
      `- OCR mode: ${extract.entities?.ocr_mode || doc.last_ocr_mode || ''}`,
      `- OCR confidence: ${extract.entities?.ocr_confidence ?? doc.last_ocr_confidence ?? ''}`,
      '',
      '## Doctor summary',
      report.summary_clinical || '',
      '',
      '## User summary',
      report.summary_short || '',
      '',
      '## Key findings',
      ...(findings.length ? findings.map(x => `- ${x}`) : ['- Nema strukturisanih nalaza.']),
      '',
      '## Parametri',
      ...(parameters.length ? parameters.map(p => `- ${p.name}: ${p.value} ${p.unit || ''} | ref: ${p.reference_range || '-'} | ${flagLabel(p.flag)}`) : ['- Nema prepoznatih parametara.']),
      '',
      '## Follow-up plan',
      ...(followup.length ? followup.map(x => `- ${x}`) : ['- Nema dodatnog plana.']),
      '',
      '## Decision algorithm',
      ...algorithm.map(x => `- ${x}`),
      '',
      '## Warnings',
      ...(warnings.length ? warnings.map(x => `- ${x}`) : ['- Nema dodatnih upozorenja.']),
      '',
      '## OCR / extract izvod',
      '```',
      String(extract.normalized_text || '').slice(0, 3000),
      '```',
      '',
      '## Runtime metadata',
      '```json',
      jsonPretty({ report_id: report.report_id, document_id: doc.document_id, extract_id: extract.extract_id, view_modes: ['full', 'doctor'] }),
      '```'
    ].join('\n');
  }

  function makeText(payload){
    const doc = payload.document || {};
    const report = payload.report || {};
    const extract = payload.extract || {};
    const parameters = Array.isArray(extract.parameters) ? extract.parameters : [];
    const followup = Array.isArray(extract.follow_up_plan) ? extract.follow_up_plan : [];
    return [
      'LAB / BOOKPRO REPORT',
      '====================',
      `Naslov: ${doc.title || ''}`,
      `Report ID: ${report.report_id || ''}`,
      `Dokument ID: ${doc.document_id || ''}`,
      `Tip: ${doc.document_type || ''}`,
      `Datum: ${doc.document_date || ''}`,
      `OCR mode: ${extract.entities?.ocr_mode || doc.last_ocr_mode || ''}`,
      `OCR confidence: ${extract.entities?.ocr_confidence ?? doc.last_ocr_confidence ?? ''}`,
      '',
      'Doctor summary:',
      report.summary_clinical || '',
      '',
      'User summary:',
      report.summary_short || '',
      '',
      'Parametri:',
      ...(parameters.length ? parameters.map(p => `* ${p.name}: ${p.value} ${p.unit || ''} | ref ${p.reference_range || '-'} | ${flagLabel(p.flag)}`) : ['* Nema prepoznatih parametara.']),
      '',
      'Follow-up:',
      ...(followup.length ? followup.map(p => `* ${p}`) : ['* Nema dodatnog follow-up plana.']),
      '',
      'NAPOMENA:',
      'Ovo je runtime Book/Pro renderer sa Full i Doctor view režimima.'
    ].join('\n');
  }

  function makeHtml(payload, mode){
    const doc = payload.document || {};
    const report = payload.report || {};
    const extract = payload.extract || {};
    const parameters = Array.isArray(extract.parameters) ? extract.parameters : [];
    const findings = Array.isArray(extract.key_findings) && extract.key_findings.length ? extract.key_findings : buildFindings(parameters);
    const warnings = Array.isArray(extract.warnings) && extract.warnings.length ? extract.warnings : ['AI/OCR pipeline još nije kompletan; ovaj renderer radi nad runtime extract slojem.'];
    const followup = Array.isArray(extract.follow_up_plan) && extract.follow_up_plan.length ? extract.follow_up_plan : ['Povezati nalaz sa anamnezom i potvrditi laboratorijske opsege.'];
    const abnormal = Array.isArray(extract.abnormal_flags) ? extract.abnormal_flags : [];
    const storageLabel = doc.storage_mode === 'bridge_disk' ? 'Disk runtime write layer' : 'IndexedDB fallback';
    const isDoctor = mode === 'doctor';
    const algorithm = buildDecisionAlgorithm(parameters);
    const detailed = !isDoctor;
    const cards = [
      { label: 'Dokument ID', value: doc.document_id || '' },
      { label: 'Datum dokumenta', value: doc.document_date || '' },
      { label: 'Storage mode', value: storageLabel },
      { label: 'Generator', value: report.generator_version || '' },
      { label: 'OCR mode', value: extract.entities?.ocr_mode || doc.last_ocr_mode || '' },
      { label: 'OCR confidence', value: String(extract.entities?.ocr_confidence ?? doc.last_ocr_confidence ?? 'n/a') }
    ];
    return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LAB / BookPro — ${esc(doc.title || report.report_id || 'Izveštaj')} (${isDoctor ? 'Doctor View' : 'Full View'})</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;background:#f6fbff;color:#123d64;margin:0;padding:20px;line-height:1.55}
    .wrap{max-width:${isDoctor ? '980px' : '1120px'};margin:0 auto;background:#fff;border:1px solid #dbe9f6;border-radius:18px;overflow:hidden;box-shadow:0 18px 44px rgba(18,61,100,.08)}
    header{padding:24px 28px;background:linear-gradient(135deg,#f8fdff 0%,#eef7ff 100%);border-bottom:1px solid #dbe9f6}
    h1,h2,h3{margin:0 0 12px 0;color:#123d64}
    h1{font-size:${isDoctor ? '1.55rem' : '1.9rem'}}
    .sub{color:#4b6b88}
    .section{padding:22px 28px;border-top:1px solid #edf4fb}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
    .card{background:#f8fbff;border:1px solid #dbe9f6;border-radius:14px;padding:14px}
    .pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#eaf5ff;color:#0b5cab;font-weight:700;font-size:.88rem}
    ul{margin:10px 0 0 18px}
    pre{white-space:pre-wrap;font-size:.92rem;background:#f7fafc;border:1px solid #e0ebf5;border-radius:12px;padding:12px;margin:0}
    .notice{background:#fffbeb;border:1px solid #fde68a;color:#854d0e;border-radius:14px;padding:12px}
    .hero-note{margin-top:12px;padding:12px 14px;border-radius:14px;background:#f8fbff;border:1px solid #dbe9f6}
    @media print{body{background:#fff;padding:0}.wrap{box-shadow:none;border:none}.section{break-inside:avoid}}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="pill">LAB / BookPro ${isDoctor ? 'Doctor View' : 'Full View'}</div>
      <h1>${esc(doc.title || 'Bez naslova')}</h1>
      <p class="sub">Runtime report sa parametrima, zastavicama, OCR engine metapodacima i follow-up slojem • Report ID: ${esc(report.report_id || '')}</p>
      <div class="hero-note"><strong>Klinička napomena:</strong> ${esc(report.summary_clinical || '')}</div>
    </header>
    <section class="section">
      <h2>User summary</h2>
      <p>${esc(report.summary_short || '')}</p>
      ${cardsHtml(cards)}
    </section>
    <section class="section">
      <h2>Key findings</h2>
      <ul>${findings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    </section>
    <section class="section">
      <h2>Tabela parametara</h2>
      ${makeParametersTable(parameters)}
    </section>
    <section class="section">
      <h2>Red flags / abnormalno</h2>
      ${abnormal.length ? `<div class="notice"><strong>Odstupanja:</strong> ${abnormal.map(x => `${esc(x.name)} (${esc(flagLabel(x.flag))})`).join(', ')}</div>` : '<p>Nema prepoznatih abnormalnih zastavica iz trenutno dostupnog OCR sloja.</p>'}
    </section>
    <section class="section">
      <h2>Decision algorithm</h2>
      <ul>${algorithm.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    </section>
    <section class="section">
      <h2>Follow-up plan</h2>
      <ul>${followup.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    </section>
    ${detailed ? `<section class="section">
      <h2>Further diagnostics / quality review</h2>
      <ul>
        <li>Potvrditi čitljivost i kompletnost laboratorijskog nalaza.</li>
        <li>Uporediti OCR confidence sa vizuelnom proverom dokumenta kada je dostupan image OCR.</li>
        <li>Povezati report sa aktivnom anamnezom i simptomima.</li>
        <li>Po potrebi dopuniti OCR tekst, pa generisati novu verziju reporta.</li>
      </ul>
    </section>
    <section class="section">
      <h2>Warnings</h2>
      <ul>${warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    </section>
    <section class="section">
      <h2>Izvod iz OCR / extract sloja</h2>
      <pre>${esc(String(extract.normalized_text || '').slice(0, 4200))}</pre>
    </section>` : ''}
    <section class="section">
      <h2>Runtime metadata</h2>
      <pre>${esc(jsonPretty({
        document_id: doc.document_id,
        report_id: report.report_id,
        extract_id: extract.extract_id,
        storage_path: doc.storage_path,
        html_full_path: report.html_full_path,
        html_doctor_path: report.html_doctor_path,
        md_path: report.md_path,
        txt_path: report.txt_path,
        json_path: report.json_path,
        storage_mode: doc.storage_mode,
        source_origin: doc.source_origin,
        generated_at: report.created_at,
        parameters_count: Array.isArray(parameters) ? parameters.length : 0,
        ocr_mode: extract.entities?.ocr_mode || doc.last_ocr_mode || '',
        ocr_confidence: extract.entities?.ocr_confidence ?? doc.last_ocr_confidence ?? null,
        mode: isDoctor ? 'doctor' : 'full'
      }))}</pre>
    </section>
  </div>
</body>
</html>`;
  }

  class SinetLabBookProRenderer {
    static build(payload){
      const parameters = Array.isArray(payload.extract?.parameters) ? payload.extract.parameters : [];
      const abnormalities = parameters.filter(p => p.flag === 'high' || p.flag === 'low');
      const full = makeHtml(payload, 'full');
      const doctor = makeHtml(payload, 'doctor');
      const md = makeMarkdown(payload);
      const txt = makeText(payload);
      const json = Object.assign({}, payload.report || {}, {
        document: payload.document || {},
        extract: payload.extract || {},
        modes: ['full','doctor']
      });
      return {
        html_full: full,
        html_doctor: doctor,
        md,
        txt,
        json,
        summary_short: abnormalities.length
          ? `Prepoznato ${parameters.length} parametara; izdvojena odstupanja zahtevaju klinički kontekst, proveru laboratorijskih opsega i follow-up.`
          : `Prepoznato ${parameters.length} parametara za dalju kliničku procenu i povezivanje sa anamnezom.`,
        summary_clinical: payload.report?.summary_clinical || 'Izveštaj je generisan iz sačuvanog dokumenta, OCR/extract sloja i Book/Pro renderer-a sa follow-up sekcijama.'
      };
    }
  }

  window.SinetLabBookProRenderer = SinetLabBookProRenderer;
})();
