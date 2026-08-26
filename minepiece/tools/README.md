# Minepiece generation tools

One-off Python scripts used to build parts of this add-on from data rather
than hand-writing 50+ near-identical JSON files. Re-run them if the fruit
list, ability list, or source head art ever changes; nothing else in the
add-on depends on them existing.

Run in this order, from a checkout that also has the source CraftyCraft head
pack extracted somewhere (its `client/` folder — items, textures, models) —
that pack isn't bundled in this repo since it's third-party content the user
supplied, not something this add-on redistributes:

1. **`rebase_head_geometry.py`** — copies the 13 head `.geo.json` files out
   of the CraftyCraft pack into `resource_pack/models/blocks/` and re-bases
   their coordinates from "worn on a player's head bone" space into
   "sitting on the floor of one block" space, in place.
2. **`derive_icons.py`** — crops each head's real UV faces (front/top/side/
   etc., computed from the same `.geo.json`) out of its skin texture and
   writes them as `resource_pack/textures/items/{fruit,ability,transform}_*.png`.
3. **`gen_head_blocks.py`** — writes the 13 placeable head block definitions
   (`behavior_pack/blocks/head_*.json`), `resource_pack/textures/terrain_texture.json`,
   and `resource_pack/blocks.json`, using the geometry from step 1.
4. **`gen_items.py`** — writes all 52 item JSON files
   (`behavior_pack/items/*.json`), `resource_pack/textures/item_texture.json`,
   and `resource_pack/texts/en_US.lang`, using the icons from step 2 and
   referencing the block ids from step 3.
5. **`validate_components.py`** — validates every generated item/entity/block
   file's components against this repo's own bundled Bedrock JSON schemas
   (`metadata/json_schemas/`). Run this after any of the above, or after any
   manual edit to a generated file.

Each script has hardcoded absolute paths near the top (`EXTRACT`, `BASE`,
etc.) rather than argv parsing — adjust those for your own checkout location
before re-running.
