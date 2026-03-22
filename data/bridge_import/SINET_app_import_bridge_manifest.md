# SINET App Import Bridge v1

Ovaj paket je priprema za uvoz u aplikaciju i spajanje sa glavnim katalogom.

## Šta je unutra

- `SINET_catalog_enriched_all_2000.jsonl/json`
  - svih 2000 originalnih unosa
  - 1976 `CANONICAL`
  - 24 `ALIAS_REDIRECT` (spojeni exact + near duplikati)

- `SINET_catalog_canonical_1976.jsonl/json`
  - samo kanonski zapisi
  - preporučeni source-of-truth za prikaz kataloga

- `SINET_catalog_patch_by_seq_2000.json`
  - najpraktičniji patch za postojeći glavni katalog
  - ključ je `seq`

- `SINET_catalog_patch_by_id_2000.json`
  - isti patch, ali ključ je `id`

- `SINET_catalog_alias_redirects_24.json`
  - lista svih alias → canonical preusmerenja

- `SINET_catalog_search_index_1976.json`
  - search index za canonical katalog sa spojenim alias terminima

- `SINET_catalog_patch_min_2000.csv`
  - kompaktan pregled glavnih novih polja

- `batches_enriched/`
  - 20 enriched batch JSONL fajlova
  - isti redosled i isti CONTINUE stil kao originalni batch fajlovi

- `sinet_catalog_import_helper.js`
  - mali JS helper za merge/redirect logiku

## Preporučeni način integracije

### Varijanta A — najbezbednija
1. učitaj postojeći glavni katalog
2. učitaj `SINET_catalog_patch_by_seq_2000.json`
3. uradi merge po `seq`
4. u UI prikazuj samo zapise gde:
   - `app_record_status !== "ALIAS_REDIRECT"`

Prednost:
- ne lomi postojeće ID/SEQ reference
- zadržava alias ulaze za search/redirect

### Varijanta B — čist canonical katalog
1. koristi `SINET_catalog_canonical_1976.json`
2. alias pretragu reši preko `SINET_catalog_search_index_1976.json`

Prednost:
- čistiji runtime katalog
- manje šuma u prikazu

## Nova polja dodata za aplikaciju

### Status / redirect
- `app_record_status`
- `canonical_seq`
- `canonical_id`
- `canonical_naziv`
- `alias_redirect`

### Oblasti
- `effective_oblast_standard`
- `effective_macro_oblast`

### MKB-10
- `mkb10_primary_chapter`
- `mkb10_primary_block`
- `mkb10_primary_block_label`
- `mkb10_shortlist`
- `mkb10_confidence`
- `mkb10_selection_mode`
- `mkb10_rule_hits`

### Frekvencijski sloj
- `frequency_protocol_family`
- `frequency_target_system`
- `frequency_intent`
- `frequency_time_window`
- `frequency_pattern`
- `frequency_target_region`
- `frequency_caution`

### Tehnička spremnost
- `mkb10_layer_ready`
- `frequency_layer_ready`
- `review_source_phase`

## Brojevi

- originalnih unosa: 2000
- kanonskih unosa: 1976
- alias redirect unosa: 24

## Napomena

Ovo je **uvozni most za aplikaciju**, ne završno “zakucano” kliničko kodiranje.
MKB-10 i frekvencije su sada dovoljno popunjeni za aplikativni rad, filtriranje,
grupisanje, prikaz i naredni SINET protokolarni sloj.
