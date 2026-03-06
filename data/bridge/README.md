# Bridge v1 Seed Pack

Status: starter data pack for SINET Audio Lekar <-> Paprikas Hub Bridge v1

## Purpose

This package provides the first working Bridge data layer.

- SINET pack A standardizes health tags and shared-context handoff.
- Paprikas pack B provides alias mapping, scoring rules, explain texts, and UI labels.
- The packs are intentionally separated so SINET can stabilize active profile and shared context before Paprikas consumes them.

## Included files

These seed packs use the following runtime/data files:

- bridge_manifest_v1.json
- health_tag_catalog_v1.json
- condition_to_health_tags_v1.json
- ingredient_alias_map_v1.json
- food_rule_profiles_v1.json
- recipe_rule_profiles_v1.json
- bridge_explain_texts_v1.json
- evidence_profiles_v1.json
- bridge_source_families_v1.json
- bridge_ui_labels_v1.json
- shared_context_export_example_v1.json

## Notes

- This is an overlay data layer. It does not replace recipes_chunks, NUTRI_STL, or the main SINET profile model.
- Traditional and alternative books are not used as hard runtime scoring rules in this seed pack.
- The Paprikas manifest is runtime-safe for a separated Pack B and does not reference SINET-only files.

## Package intent

- Pack A (SINET) is for health-tag alignment and shared-context export.
- Pack B (Paprikas) is for runtime loading, alias mapping, recipe/food scoring hooks, and explain/UI text.
- A combined working bundle can be used for archive or side-by-side testing.

Version: v1
