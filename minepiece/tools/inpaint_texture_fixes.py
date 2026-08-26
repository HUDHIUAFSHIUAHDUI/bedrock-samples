"""
Targeted per-pixel texture fixes, replacing anomalous pixels by sampling real
neighboring pixel colors (an inpaint-by-diffusion fill) instead of any kind of
uniform/formulaic recolor (flat fill, hue-shift, etc.) — a flat recolor reads as an
obvious "solid patch" because it discards the natural shading/noise variation the
surrounding correct-colored pixels already have. This repeatedly overwrites masked
pixels with the average of their already-known (unmasked) 8-neighbors, so masked
regions pick up real texture/shading from what's actually around them.

- head_anvil: the source CraftyCraft texture has small orange "cap" squares on an
  otherwise teal anvil body. Per user feedback the teal is correct and the orange
  caps are wrong, so every orange-family pixel is inpainted from its surrounding
  teal.
- head_water: the source texture has a handful of stray magenta/purple pixels
  scattered inside an otherwise clean green region (the blue region is untouched
  and has no such stray pixels). Each stray pixel is inpainted from its
  surrounding green.
"""
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
SRC = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/heads_extract/client/textures/entity/craftycraft"


def is_orange(r, g, b, a):
    # Teal family: G is the dominant channel (G > B > R). Orange family: R dominant, G mid, B low.
    return a > 0 and r > g and r > b and r > 60


def is_magenta_purple(r, g, b, a):
    # Green family: G dominant, R and B both low-ish. Magenta/purple stray: R and B both
    # significantly higher than in the green pixels, R comparable to or higher than B.
    return a > 0 and r > 90 and b > 90 and g < r


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
                            acc[0] += r
                            acc[1] += g
                            acc[2] += b
                            acc[3] += a
                            count += 1
                if count > 0:
                    px[x, y] = (round(acc[0] / count), round(acc[1] / count), round(acc[2] / count), round(acc[3] / count))
                    next_mask[y][x] = False
                    changed += 1
        mask = next_mask
        remaining -= changed
        if changed == 0:
            break
    return img


def fix(name, is_bad):
    src_path = f"{SRC}/cc_{name}_{name}_fruit.png"
    out_path = f"{BASE}/resource_pack/textures/blocks/head_{name}.png"
    img = Image.open(src_path).convert("RGBA")
    before = sum(1 for p in img.getdata() if is_bad(*p))
    inpaint(img, is_bad)
    after = sum(1 for p in img.getdata() if is_bad(*p))
    img.save(out_path)
    print(f"{name}: {before} anomalous pixels -> {after} remaining, saved to {out_path}")


fix("anvil", is_orange)
fix("water", is_magenta_purple)
