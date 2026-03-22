/**
 * SINET catalog import bridge helper v1
 * Purpose:
 *  - merge patch metadata into an existing main catalog
 *  - redirect alias/duplicate records to canonical records
 *  - optionally build a canonical-only catalog for UI rendering
 */

export function applyCatalogPatch(mainCatalog, patchBySeq) {
  return mainCatalog.map((item) => {
    const patch = patchBySeq[String(item.seq)] || {};
    return { ...item, ...patch };
  });
}

export function buildCanonicalCatalog(enrichedCatalog) {
  return enrichedCatalog.filter((item) => item.app_record_status !== "ALIAS_REDIRECT");
}

export function buildAliasRedirectMap(enrichedCatalog) {
  const map = {};
  for (const item of enrichedCatalog) {
    if (item.app_record_status === "ALIAS_REDIRECT") {
      map[item.seq] = {
        canonical_seq: item.canonical_seq,
        canonical_id: item.canonical_id,
        canonical_naziv: item.canonical_naziv,
        alias_type: item.alias_type || null,
        merge_reason: item.merge_reason || ""
      };
    }
  }
  return map;
}

export function resolveRecordForOpen(item, bySeq) {
  if (!item || item.app_record_status !== "ALIAS_REDIRECT") return item;
  return bySeq[item.canonical_seq] || item;
}

export function indexBySeq(records) {
  const out = {};
  for (const item of records) out[item.seq] = item;
  return out;
}
