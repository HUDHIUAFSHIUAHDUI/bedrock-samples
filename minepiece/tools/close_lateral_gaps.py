"""
close_geometry_gaps.py only ever checked for *vertical* gaps in the model's
aggregate y-coverage — a gap between two horizontal "bands" that spans the
whole model. It completely missed a different kind of hole: a small
appendage cube (a horn, a bottle spout, an antenna) that's offset sideways
from the piece it's supposed to connect to, floating with a real gap between
them even though something else fills that same y-range elsewhere in the
model (so the old aggregate check saw "y-coverage complete" and moved on).
Confirmed against real screenshots: goat's horns, potion's spout segments,
and shulker's antenna all render as visibly separate floating pieces.

The fix has to be connectivity-aware, not just pairwise: a naive "any two
cubes that overlap on two axes and gap on the third" check also matches
plenty of pairs that are *already* joined through some other cube in
between (e.g. a foot cube and the head cube, bridged by two cubes of
graduated size between them) — bridging those directly would be redundant,
not a fix for anything broken.

So this builds the actual connectivity graph first (cubes are "touching" if
their ranges overlap or meet on all three axes — union-find over that), then
only looks for a bridge between cubes that end up in *different* connected
components — i.e. genuinely separate floating islands of geometry. For each
pair of components, only the single closest candidate pair is bridged (by
extending the earlier-listed cube's origin/size along the gapped axis only,
just enough to touch), then the graph is rebuilt and the process repeats
until every cube is in one connected piece or no more valid single-axis
bridges exist.
"""
import json, glob

BLOCKS_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/models/blocks"
EPSILON = 0.001
AXES = (0, 1, 2)


def ranges(cube):
    o, s = cube["origin"], cube["size"]
    return [(o[i], o[i] + s[i]) for i in AXES]


def gap(a, b):
    """Positive gap between range a and range b if they don't overlap/touch, else 0."""
    lo1, hi1 = a
    lo2, hi2 = b
    if hi1 < lo2:
        return lo2 - hi1
    if hi2 < lo1:
        return lo1 - hi2
    return 0


def touching(a_ranges, b_ranges):
    return all(gap(a_ranges[axis], b_ranges[axis]) <= EPSILON for axis in AXES)


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


def extend_toward(cube, axis, other_range):
    my_lo, my_hi = ranges(cube)[axis]
    other_lo, other_hi = other_range
    if my_hi < other_lo:
        cube["size"][axis] = round(other_lo - cube["origin"][axis], 3)
    elif other_hi < my_lo:
        new_origin = other_hi
        cube["size"][axis] = round(cube["origin"][axis] + cube["size"][axis] - new_origin, 3)
        cube["origin"][axis] = round(new_origin, 3)


def find_best_bridge(cubes, uf):
    """
    The best single-axis-gap candidate pair spanning two different components, or None.
    Ranked first by gap size (smaller = closer, more likely the intended connection), then
    by how well the two cubes' extents match on the two *non*-gapped axes — a thin 1-unit
    shaft and a 5-unit-wide crossbar can tie on gap size against the same target, but the
    crossbar is almost always the visually correct piece to extend (a narrow rod jutting
    sideways to bridge a wide gap reads as broken in a way a matched-width connection doesn't).
    """
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
                best = (i, j, gaps[axis], axis)
    return best


report = []
for path in sorted(glob.glob(f"{BLOCKS_DIR}/*.geo.json")):
    doc = json.load(open(path))
    cubes = doc["minecraft:geometry"][0]["bones"][0]["cubes"]
    fixes = []

    for _ in range(len(cubes)):  # at most one bridge needed per extra component
        uf = connected_components(cubes)
        if len({uf.find(i) for i in range(len(cubes))}) == 1:
            break  # already all one piece
        bridge = find_best_bridge(cubes, uf)
        if bridge is None:
            break  # remaining separate pieces aren't a clean single-axis case — leave alone
        i, j, gap_size, axis = bridge
        extend_toward(cubes[i], axis, ranges(cubes[j])[axis])
        fixes.append((i, j, "xyz"[axis], round(gap_size, 2)))

    if fixes:
        json.dump(doc, open(path, "w"), indent=2)
        with open(path, "a") as f:
            f.write("\n")
        report.append(f"{path.split('/')[-1]}: {fixes}")

print("\n".join(report) if report else "No lateral gaps found.")
