"""
Nearly every one of these heads is built as a stack of concentric cube
"bands" (a wedding-cake shape), and in the source CraftyCraft models several
adjacent bands don't actually touch — there's a vertical gap between one
band's top and the next band's bottom, which renders as a literal hole you
can see/fall through in the middle of the head. This is what "the 3D fruit
designs have holes in them" is about.

For every detected gap, this stretches the band(s) immediately below the gap
upward (increasing their size_y) so their top meets the next band's bottom
exactly, closing the hole. It never touches x/z footprint, origin, or UV
origin — only size_y grows, and Bedrock's box-UV stretches that cube's face
regions to match automatically (the same way resizing a cube in Blockbench
does), so this doesn't require any texture changes.
"""
import json, glob

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"
EPSILON = 0.001

report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    cubes = doc["minecraft:geometry"][0]["bones"][0]["cubes"]

    ranges = sorted(((c["origin"][1], c["origin"][1] + c["size"][1]) for c in cubes))
    gaps = []
    covered_top = ranges[0][1]
    for lo, hi in ranges[1:]:
        if lo > covered_top + EPSILON:
            gaps.append((covered_top, lo))
        covered_top = max(covered_top, hi)

    if not gaps:
        continue

    fixed = []
    for gap_bottom, gap_top in gaps:
        extended_any = False
        for cube in cubes:
            cube_top = cube["origin"][1] + cube["size"][1]
            if abs(cube_top - gap_bottom) < EPSILON:
                cube["size"][1] = round(cube["size"][1] + (gap_top - gap_bottom), 3)
                extended_any = True
        fixed.append((round(gap_bottom, 2), round(gap_top, 2), extended_any))

    json.dump(doc, open(path, "w"), indent=2)
    with open(path, "a") as f:
        f.write("\n")

    report.append(f"{path.split('/')[-1]}: closed gaps {fixed}")

print("\n".join(report) if report else "No gaps found.")
