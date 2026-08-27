"""
close_geometry_gaps.py only checks aggregate vertical (y-axis) coverage
across the whole model, which misses a different kind of hole: a small
appendage cube (a horn, a bottle spout, an antenna) offset sideways from the
piece it's supposed to connect to, floating with a real gap between them,
invisible to that check because something else already fills that same
y-range elsewhere in the model. Confirmed against real screenshots showing
goat's horns, potion's spout segments, and shulker's antenna all rendering
as visibly separate floating pieces.

Three earlier versions of this fix had real problems:
  1. Growing one of the two disconnected cubes' own size, without touching
     its "uv" — Minecraft's box-UV allocates a cube a texture footprint
     sized to its *own* dimensions (width = 2*size.z + 2*size.x, height =
     size.y + size.z, from that cube's own "uv" origin); growing the cube
     without growing its footprint made it read pixels a neighboring cube
     already owned.
  2. Adding a new bridge cube but reusing an existing cube's "uv" outright —
     safe only if the bridge is no bigger *on every axis* than the cube it
     borrows from, which isn't true in general.
  3. Computing every cube's position from its raw origin+size, ignoring
     "rotation" entirely — wrong for any cube that has one (goat's horn
     cubes are rotated 90° around Y). A rotated cube's *true* rendered
     position is nowhere near its raw origin/size box; treating it as if it
     weren't rotated aimed the goat fix's bridge at completely the wrong
     spot, so it never actually touched the real (rotated) horn.

The actually-safe fix does two things differently. First, every bounding-box
computation rotates the cube's 8 corners around its own pivot before taking
min/max — the *true* rendered AABB, not the pre-rotation box. Second, every
bridge cube gets genuinely new, dedicated pixels: a solid-color rectangle
appended to the bottom of the fruit's own texture (growing canvas height,
and width too if a bridge's footprint needs it), sized exactly to that
bridge's box-UV footprint, filled with the average color sampled from the
*donor* cube's own existing region — then the bridge's "uv" points at that
brand-new rectangle. Zero risk of reading into a neighbor's territory,
because the rectangle was never anyone else's.
"""
import json, glob, math
from PIL import Image

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"
TEXTURES_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/textures/blocks"
EPSILON = 0.001
AXES = (0, 1, 2)


def _rotate_point(p, pivot, deg, axis):
    x, y, z = p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    if axis == 0:
        y, z = y * c - z * s, y * s + z * c
    elif axis == 1:
        x, z = x * c + z * s, -x * s + z * c
    elif axis == 2:
        x, y = x * c - y * s, x * s + y * c
    return (x + pivot[0], y + pivot[1], z + pivot[2])


def ranges(cube):
    """The cube's *true* rendered bounding box: rotate all 8 corners around its own pivot
    (if it has a non-zero "rotation"), then take min/max per axis. For an unrotated cube
    this is identical to the old origin/size box."""
    o, s = cube["origin"], cube["size"]
    rotation = cube.get("rotation", [0, 0, 0])
    if rotation == [0, 0, 0]:
        return [(o[i], o[i] + s[i]) for i in AXES]

    pivot = cube.get("pivot", [0, 0, 0])
    corners = []
    for dx in (0, s[0]):
        for dy in (0, s[1]):
            for dz in (0, s[2]):
                p = (o[0] + dx, o[1] + dy, o[2] + dz)
                for axis in AXES:
                    deg = rotation[axis]
                    if deg:
                        p = _rotate_point(p, pivot, deg, axis)
                corners.append(p)
    return [(min(c[axis] for c in corners), max(c[axis] for c in corners)) for axis in AXES]


def gap(a, b):
    lo1, hi1 = a
    lo2, hi2 = b
    if hi1 < lo2:
        return lo2 - hi1
    if hi2 < lo1:
        return lo1 - hi2
    return 0


def touching(a_ranges, b_ranges):
    return all(gap(a_ranges[axis], b_ranges[axis]) <= EPSILON for axis in AXES)


def box_uv_footprint(size):
    sx, sy, sz = size
    return (round(2 * sz + 2 * sx), round(sy + sz))


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb

    def same(self, a, b):
        return self.find(a) == self.find(b)


def connected_components(cubes):
    uf = UnionFind(len(cubes))
    all_ranges = [ranges(c) for c in cubes]
    for i in range(len(cubes)):
        for j in range(i + 1, len(cubes)):
            if touching(all_ranges[i], all_ranges[j]):
                uf.union(i, j)
    return uf


def find_best_bridge(cubes, uf):
    """Best single-axis-gap candidate pair spanning two different components: closest gap, then closest cross-section match."""
    best = None
    best_key = None
    for i in range(len(cubes)):
        for j in range(len(cubes)):
            if i == j or uf.same(i, j):
                continue
            a_ranges, b_ranges = ranges(cubes[i]), ranges(cubes[j])
            gaps = [gap(a_ranges[axis], b_ranges[axis]) for axis in AXES]
            gapped_axes = [axis for axis in AXES if gaps[axis] > EPSILON]
            if len(gapped_axes) != 1:
                continue
            axis = gapped_axes[0]
            other_axes = [ax for ax in AXES if ax != axis]
            size_mismatch = sum(
                abs((a_ranges[ax][1] - a_ranges[ax][0]) - (b_ranges[ax][1] - b_ranges[ax][0])) for ax in other_axes
            )
            key = (gaps[axis], size_mismatch)
            if best_key is None or key < best_key:
                best_key = key
                best = (i, j, axis)
    return best


def bridge_geometry(cube_a, cube_b, axis):
    a_ranges, b_ranges = ranges(cube_a), ranges(cube_b)
    other_axes = [ax for ax in AXES if ax != axis]
    origin = [0, 0, 0]
    size = [0, 0, 0]
    for ax in other_axes:
        lo = max(a_ranges[ax][0], b_ranges[ax][0])
        hi = min(a_ranges[ax][1], b_ranges[ax][1])
        origin[ax] = round(lo, 3)
        size[ax] = round(hi - lo, 3)
    gap_lo = min(a_ranges[axis][1], b_ranges[axis][1])
    gap_hi = max(a_ranges[axis][0], b_ranges[axis][0])
    origin[axis] = round(gap_lo, 3)
    size[axis] = round(gap_hi - gap_lo, 3)
    return origin, size


def average_color(img, u, v, w, h):
    px = img.load()
    tw, th = img.size
    total = [0, 0, 0, 0]
    count = 0
    for y in range(max(0, v), min(th, v + h)):
        for x in range(max(0, u), min(tw, u + w)):
            r, g, b, a = px[x, y]
            if a > 0:
                total[0] += r
                total[1] += g
                total[2] += b
                total[3] += a
                count += 1
    if count == 0:
        return (150, 150, 150, 255)
    return tuple(round(c / count) for c in total)


report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    geo = doc["minecraft:geometry"][0]
    desc = geo["description"]
    cubes = geo["bones"][0]["cubes"]
    fruit_id = path.split("/")[-1].split("_")[0]
    texture_path = f"{TEXTURES_DIR}/head_{fruit_id}.png"

    fixes = []
    img = None

    for _ in range(len(cubes)):
        uf = connected_components(cubes)
        if len({uf.find(i) for i in range(len(cubes))}) == 1:
            break
        bridge = find_best_bridge(cubes, uf)
        if bridge is None:
            break
        i, j, axis = bridge

        origin, size = bridge_geometry(cubes[i], cubes[j], axis)
        footprint_w, footprint_h = box_uv_footprint(size)

        # Donor: whichever connected cube has the smaller box-UV footprint — sample its color,
        # since it's the more "specific" (thinner/smaller) piece, most representative of the join.
        fa, fb = box_uv_footprint(cubes[i]["size"]), box_uv_footprint(cubes[j]["size"])
        donor = cubes[i] if (fa[0] * fa[1]) <= (fb[0] * fb[1]) else cubes[j]

        if img is None:
            img = Image.open(texture_path).convert("RGBA")

        du, dv = donor["uv"]
        dw, dh = box_uv_footprint(donor["size"])
        fill_color = average_color(img, du, dv, dw, dh)

        # Append a brand-new, nobody-else's-territory rectangle at the bottom of the canvas.
        new_v = img.height
        new_width = max(img.width, footprint_w)
        canvas = Image.new("RGBA", (new_width, img.height + footprint_h), (0, 0, 0, 0))
        canvas.paste(img, (0, 0))
        px = canvas.load()
        for y in range(new_v, new_v + footprint_h):
            for x in range(0, footprint_w):
                px[x, y] = fill_color
        img = canvas

        # The bridge's origin/size are computed directly in true world-space (ranges() already
        # accounts for the donor/target cubes' own rotation) — so the bridge itself must stay
        # unrotated, or it would get rotated a second time away from where it needs to sit.
        cubes.append(
            {
                "pivot": donor.get("pivot", [0, 0, 0]),
                "rotation": [0, 0, 0],
                "size": size,
                "uv": [0, new_v],
                "inflate": donor.get("inflate", 0),
                "origin": origin,
            }
        )
        fixes.append((i, j, "xyz"[axis]))

    if fixes:
        desc["texture_width"] = img.width
        desc["texture_height"] = img.height
        img.save(texture_path)

        json.dump(doc, open(path, "w"), indent=2)
        with open(path, "a") as f:
            f.write("\n")
        report.append(f"{path.split('/')[-1]}: added {len(fixes)} bridge cube(s) for {fixes}, texture now {img.width}x{img.height}")

print("\n".join(report) if report else "No lateral gaps found.")
