"""
Custom BLOCK geometry in Bedrock uses a different coordinate convention than
entity/attachable geometry: entities are corner-anchored (x/z run 0-16, same
corner as y), but blocks are *centered* horizontally — x and z run roughly -8
to 8 around the block's own center, while y still runs 0 upward from the
floor. (This matches the -8..8 range Bedrock's own collision_box/
selection_box components document for x/z, which reuse the same block-local
frame.)

rebase_head_geometry.py centered every head horizontally at x=8, z=8 —
correct for an *entity* attachable, but for a block that's off by exactly
half a block (8 units) in both x and z, which reads as the model rendering
shifted toward one corner instead of sitting straight/centered on the block
it's placed on (reported as heads placing "kinda to the left"). This
re-centers every remaining fruit's block geometry at x=0, z=0 instead.
"""
import json, glob

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"


def shift_point(point, dx, dz):
    return [point[0] + dx, point[1], point[2] + dz]


report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    geo = doc["minecraft:geometry"][0]
    bone = geo["bones"][0]
    cubes = bone["cubes"]

    for cube in cubes:
        cube["origin"] = shift_point(cube["origin"], -8, -8)
        if "pivot" in cube:
            cube["pivot"] = shift_point(cube["pivot"], -8, -8)
    if "pivot" in bone:
        bone["pivot"] = shift_point(bone["pivot"], -8, -8)

    json.dump(doc, open(path, "w"), indent=2)
    with open(path, "a") as f:
        f.write("\n")

    report.append(path.split("/")[-1])

print("Re-centered at x=0,z=0 (block-local convention):\n" + "\n".join(report))
