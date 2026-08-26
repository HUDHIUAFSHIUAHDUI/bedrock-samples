"""
The CraftyCraft head models were authored as *entity attachables* — worn on
a player's head bone, whose pivot sits ~24-28 units up (out of the player's
~32-unit total height). Block geometry uses a totally different coordinate
convention: 0-16 per axis, origin at the block's own bottom corner. Reusing
the raw entity coordinates for a block would render the head floating
roughly 1.5 blocks above where the block actually is.

This translates every cube's origin/pivot and the bone's own pivot by a
uniform offset so each head ends up centered horizontally in the block
(x/z center at 8) and sitting just above the floor (y starts at 1) —
a rigid-body move, so nothing about the model's shape or proportions changes.
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
    delta = [8 - center_x, 1 - min_y, 8 - center_z]

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
