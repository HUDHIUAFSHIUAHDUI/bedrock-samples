"""
Each head's geo.json still carried visible_bounds_width/height/offset left over from
when these models were authored as player-head-bone attachables (width 2, height 1,
offset [0, 0.5, 0] — sized for a ~1-block accessory riding near the top of a player).

After rebase_head_geometry.py moved the geometry into block space, several of these
heads are much taller than that stale box (arrow's shaft+head runs to y=29, beacon's
beam to y=25 — over a block and a half tall). The engine culls rendering against
visible_bounds, so a box that's still sized for the old 1-block accessory causes the
block to disappear/glitch out of view depending on camera angle and distance —
exactly the kind of "placement" glitch reported. This recomputes real bounds (in
block units, i.e. /16) from each geometry's actual cubes, with a little padding.
"""
import json, glob, math

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"

report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    geo = doc["minecraft:geometry"][0]
    cubes = geo["bones"][0]["cubes"]

    min_x = min(c["origin"][0] for c in cubes)
    max_x = max(c["origin"][0] + c["size"][0] for c in cubes)
    min_y = min(c["origin"][1] for c in cubes)
    max_y = max(c["origin"][1] + c["size"][1] for c in cubes)
    min_z = min(c["origin"][2] for c in cubes)
    max_z = max(c["origin"][2] + c["size"][2] for c in cubes)

    width_px = max(max_x - min_x, max_z - min_z)
    height_px = max_y - min_y
    center_y_px = (min_y + max_y) / 2

    width_blocks = round(width_px / 16 + 0.3, 2)
    height_blocks = round(height_px / 16 + 0.3, 2)
    offset_y_blocks = round(center_y_px / 16, 3)

    desc = geo["description"]
    desc["visible_bounds_width"] = width_blocks
    desc["visible_bounds_height"] = height_blocks
    desc["visible_bounds_offset"] = [0, offset_y_blocks, 0]

    json.dump(doc, open(path, "w"), indent=2)
    with open(path, "a") as f:
        f.write("\n")

    report.append(f"{path.split('/')[-1]}: width={width_blocks} height={height_blocks} offset_y={offset_y_blocks}")

print("\n".join(report))
