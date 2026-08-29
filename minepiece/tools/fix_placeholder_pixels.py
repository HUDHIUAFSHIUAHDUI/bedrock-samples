"""
The CraftyCraft source pack reuses two exact placeholder colors for UV regions
(mostly small cube "cap" faces) that were never actually textured: a violet/magenta
family (151,72,185) / (190,91,232) and an orange family (185,90,41) / (230,112,51).
These are the same literal RGB values showing up across completely unrelated fruits
(confirmed: the magenta pair appears in water, beacon, and copper; the orange pair
appears in anvil and trident) — a dead giveaway that they're a shared "unfinished"
fill rather than each fruit's own intentional color.

This scans every head texture, flags pixels within a tight distance of either
placeholder family, and inpaints them from real surrounding pixel colors (average of
already-known neighbors, diffused inward) so each patch picks up whatever color
family actually surrounds it locally, instead of a flat recolor.
"""
import glob
import math
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
SRC = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/heads_extract/client/textures/entity/craftycraft"

PLACEHOLDER_COLORS = [
    (151, 72, 185),
    (190, 91, 232),
    (185, 90, 41),
    (230, 112, 51),
    (144, 0, 185),
    (179, 0, 230),
    (167, 0, 215),
]
TOLERANCE = 40


def is_placeholder(r, g, b, a):
    if a == 0:
        return False
    for pr, pg, pb in PLACEHOLDER_COLORS:
        if math.dist((r, g, b), (pr, pg, pb)) <= TOLERANCE:
            return True
    return False


def inpaint(img, is_bad):
    w, h = img.size
    px = img.load()
    mask = [[is_bad(*px[x, y]) for x in range(w)] for y in range(h)]
    remaining = sum(sum(row) for row in mask)
    guard = 0
    while remaining > 0 and guard < 50:
        guard += 1
        next_mask = [row[:] for row in mask]
        changed = 0
        for y in range(h):
            for x in range(w):
                if not mask[y][x]:
                    continue
                acc = [0, 0, 0, 0]
                count = 0
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not mask[ny][nx]:
                            r, g, b, a = px[nx, ny]
                            if a == 0:
                                continue
                            acc[0] += r; acc[1] += g; acc[2] += b; acc[3] += a
                            count += 1
                if count > 0:
                    px[x, y] = (round(acc[0] / count), round(acc[1] / count), round(acc[2] / count), round(acc[3] / count))
                    next_mask[y][x] = False
                    changed += 1
        mask = next_mask
        remaining -= changed
        if changed == 0:
            break
    return remaining == 0 or all(not any(row) for row in mask)


# lava and sculk excluded: their *main body* color (not just small cap accents) sits at/near
# these exact placeholder RGB values, which turns out to be coincidental for lava (real lava is
# genuinely that shade of orange) but is a real, much bigger unfinished-texture problem for sculk
# (its dominant color really is unfinished placeholder magenta) — either way, patch-diffusion from
# neighbors can't invent a whole new majority color and produces a worse result than leaving it
# untouched, so both are left out of scope here (small-patch fixes only, as asked).
FRUIT_IDS = ["arrow", "core", "slime", "copper", "beacon", "trident", "anvil", "water",
             "snow", "potion", "goat", "shulker", "bat", "pillager"]

for fruit_id in ("lava", "sculk"):
    print(f"{fruit_id}: excluded (see comment above)")

for fruit_id in FRUIT_IDS:
    src_path = f"{SRC}/cc_{fruit_id}_{fruit_id}_fruit.png"
    out_path = f"{BASE}/resource_pack/textures/blocks/head_{fruit_id}.png"
    img = Image.open(src_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    opaque = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 0)
    before = sum(1 for y in range(h) for x in range(w) if is_placeholder(*px[x, y]))
    if before == 0:
        continue
    # Safety net: if placeholder-family pixels are a large share of the opaque texture, this
    # isn't a stray-pixel bug anymore, it's that fruit's actual (if unfortunate) main body color —
    # diffusing from neighbors can't invent a whole new majority color, so leave it alone rather
    # than mangle it (this is what happened with lava and sculk during manual review).
    # anvil is force-fixed even though it trips this ratio: unlike the lava/sculk judgment
    # calls above, the user explicitly confirmed teal is the correct body color and the
    # orange is the bug ("No the teal is right the orange is off").
    if fruit_id != "anvil" and before / max(opaque, 1) > 0.15:
        print(f"{fruit_id}: SKIPPED, {before}/{opaque} opaque pixels are placeholder-family (looks like main body color, not a stray patch)")
        continue
    inpaint(img, is_placeholder)
    px = img.load()
    after = sum(1 for y in range(h) for x in range(w) if is_placeholder(*px[x, y]))
    img.save(out_path)
    print(f"{fruit_id}: {before} placeholder pixels -> {after} remaining, saved to {out_path}")
