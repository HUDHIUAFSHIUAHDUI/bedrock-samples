"""
The CraftyCraft head models were authored as *entity attachables* — worn on
a player's head bone, whose pivot sits ~24-28 units up (out of the player's
~32-unit total height), using the entity-geometry convention (x/z corner-
anchored at 0-16, same as y).

Custom BLOCK geometry uses a different convention: y is still corner-
anchored from the floor (0 upward), but x/z are *centered* on the block
(roughly -8 to 8), matching the range Bedrock's own collision_box/
selection_box components document for x/z. (Confirmed against Microsoft's
own custom-block example, which uses cube origins like [-6, 0, -3] —
centered, not corner-anchored.) Reusing the raw entity coordinates for a
block gets both of these wrong: the head would render floating roughly 1.5
blocks above the block, and centered on the wrong point horizontally (a
uniform +8/+8 offset toward one corner instead of the block's actual
center) — that second one is what shipped initially and read as heads
placing visibly off to one side instead of straight on the block.

This translates every cube's origin/pivot and the bone's own pivot by a
uniform offset so each head ends up centered horizontally on the block
(x/z center at 0, the correct block-geometry convention) and sitting just
above the floor (y starts at 1) — a rigid-body move, so nothing about the
model's shape or proportions changes.
"""
import json, glob

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"


def shift_point(point, delta):
    return [point[0] + delta[0], point[1] + delta[1], point[2] + delta[2]]


report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    geo = doc["minecraft:geometry"][0]
    bone = geo["bones"][0]
    cubes = bone["cubes"]

    min_x = min(c["origin"][0] for c in cubes)
    max_x = max(c["origin"][0] + c["size"][0] for c in cubes)
    min_y = min(c["origin"][1] for c in cubes)
    min_z = min(c["origin"][2] for c in cubes)
    max_z = max(c["origin"][2] + c["size"][2] for c in cubes)

    center_x = (min_x + max_x) / 2
    center_z = (min_z + max_z) / 2
    delta = [0 - center_x, 1 - min_y, 0 - center_z]

    for cube in cubes:
        cube["origin"] = shift_point(cube["origin"], delta)
        if "pivot" in cube:
            cube["pivot"] = shift_point(cube["pivot"], delta)
    if "pivot" in bone:
        bone["pivot"] = shift_point(bone["pivot"], delta)

    json.dump(doc, open(path, "w"), indent=2)
    with open(path, "a") as f:
        f.write("\n")

    report.append(f"{path.split('/')[-1]}: shifted by {[round(d, 2) for d in delta]}")

print("\n".join(report))
