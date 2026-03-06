(function(){
  let globalFreqCatalog = {};

  function txt(){
    for (const v of arguments){
      const s = String(v ?? '').trim();
      if (s) return s;
    }
    return '';
  }

  function hzKey(hz){
    const n = Number(hz);
    if (Number.isFinite(n)) {
      const r = Math.round(n * 1000) / 1000;
      return String(r);
    }
    return String(hz ?? '').trim();
  }

  function setFreqCatalog(catalog){
    globalFreqCatalog = (catalog && typeof catalog === 'object') ? catalog : {};
    return globalFreqCatalog;
  }

  function getFreqCatalogEntry(hz, catalog){
    const src = (catalog && typeof catalog === 'object') ? catalog : globalFreqCatalog;
    if (!src) return null;
    const key = hzKey(hz);
    return src[key] || src[String(hz)] || null;
  }

  function isEmptySource(src){
    if (!src) return true;
    if (typeof src === 'string') return !src.trim();
    if (typeof src !== 'object') return !String(src).trim();
    return !(src.url || src.link || src.sistem || src.system || src.autor || src.author || src.delo || src.title || src.work || src.licenca || src.license || src.name);
  }

  function normSource(src){
    if (!src) return { sistem:'', autor:'', delo:'', url:'', licenca:'', text:'' };
    if (typeof src === 'string') {
      const s = src.trim();
      return { sistem:'', autor:'', delo:s, url:'', licenca:'', text:s };
    }
    const out = {
      sistem: txt(src.sistem, src.system),
      autor: txt(src.autor, src.author),
      delo: txt(src.delo, src.title, src.work, src.name),
      url: txt(src.url, src.link),
      licenca: txt(src.licenca, src.license),
      text: ''
    };
    out.text = txt(
      out.url,
      (out.delo && out.autor) ? `${out.delo} - ${out.autor}` : '',
      out.delo,
      out.autor,
      out.sistem
    );
    return out;
  }

  function normalizeFrequency(freq, index, options){
    const hzRaw = freq?.hz ?? freq?.value ?? freq?.freq ?? '';
    const hzNum = Number(hzRaw);
    const hz = Number.isFinite(hzNum) && hzNum > 0 ? hzNum : '';
    const meta = getFreqCatalogEntry(hz || hzRaw, options?.freqCatalog) || {};
    const inlineSource = !isEmptySource(freq?.izvor) ? freq?.izvor : (!isEmptySource(freq?.source) ? freq?.source : (!isEmptySource(freq?.izvor_obj) ? freq?.izvor_obj : null));
    const src = normSource(inlineSource || meta?.izvor || {});
    const naziv = txt(freq?.naziv, freq?.name, meta?.naziv);
    const opis = txt(freq?.opis, freq?.description, freq?.desc, meta?.opis);
    const funkcija = txt(freq?.funkcija, freq?.svrha, freq?.note);
    const svrha = txt(freq?.svrha, freq?.funkcija, freq?.note, naziv, opis);
    const displayLabel = txt(funkcija, svrha, naziv, opis, hz ? `${hz} Hz` : `Frekvencija ${Number(index||0)+1}`);
    const trajanjeMinRaw = freq?.trajanje_min ?? freq?.recommendedDurationMin ?? freq?.durationMin ?? '';
    const trajanjeMinNum = Number(trajanjeMinRaw);
    const trajanje_min = Number.isFinite(trajanjeMinNum) && trajanjeMinNum > 0 ? trajanjeMinNum : '';
    return {
      hz,
      value: hz,
      naziv,
      opis,
      funkcija: txt(funkcija, svrha, naziv),
      svrha,
      displayLabel,
      izvor: src.text,
      izvor_obj: src,
      evidence: meta?.evidence || freq?.evidence || null,
      tags: Array.isArray(meta?.tags) ? meta.tags : (Array.isArray(freq?.tags) ? freq.tags : []),
      trajanje_min,
      enabled: freq?.enabled !== false,
      raw: freq || {}
    };
  }

  function normalizeFrequencies(list, options){
    const arr = Array.isArray(list) ? list : [];
    return arr.map((f, idx) => normalizeFrequency(f, idx, options || {})).filter(f => f.hz || f.naziv || f.opis || f.funkcija || f.izvor);
  }

  function normalizeItem(item, options){
    const src = normSource(item?.izvor || item?.source || {});
    const freqs = normalizeFrequencies(item?.frekvencije || item?.frequencies || [], options || {});
    return Object.assign({}, item || {}, {
      simptom: txt(item?.simptom, item?.naziv, item?.name, 'Stavka'),
      naziv: txt(item?.naziv, item?.simptom, item?.name, 'Stavka'),
      opis: txt(item?.opis, item?.description, item?.desc),
      oblast: txt(item?.oblast, item?.category, 'MOJI SIMPTOMI'),
      mkb10: item?.mkb10 || item?.mkb || '',
      izvor: src.text,
      izvor_obj: src,
      frekvencije: freqs
    });
  }

  window.SINET_FrequencySchema = {
    txt,
    hzKey,
    setFreqCatalog,
    getFreqCatalogEntry,
    isEmptySource,
    normalizeSource: normSource,
    normalizeFrequency,
    normalizeFrequencies,
    normalizeItem
  };
})();
