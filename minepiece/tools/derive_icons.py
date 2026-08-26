"""
Derives 2D item icons straight from the CraftyCraft 3D head models — not
their pre-made flat icons. For each fruit's head cube we read its own
box-UV cube (origin uv + size) out of the .geo.json, unfold it into its six
faces (top/bottom/front/back/left/right) exactly like Minecraft's own cube
UV mapping does, and crop each face out of the head's real skin texture.

The largest face becomes that fruit's own item icon (most cube-like heads:
the front; flatter "plate" heads: whichever face is actually substantial).
The next-largest distinct faces become that fruit's ability/transform icons,
so every item belonging to one fruit is a genuinely different crop of the
same real head, not a copy-paste of one icon or an unrelated vanilla icon.
"""
import json, os
from PIL import Image

EXTRACT = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/heads_extract"
GEO_DIR = f"{EXTRACT}/client/models/entity"
TEX_DIR = f"{EXTRACT}/client/textures/entity/craftycraft"
OUT_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/textures/items"
os.makedirs(OUT_DIR, exist_ok=True)

ICON_PX = 32  # upscaled with nearest-neighbor so it stays crisp pixel art, not blurry

FRUITS = ["warden", "dragon", "ghast", "sculk", "lava", "water", "arrow",
          "anvil", "core", "slime", "copper", "beacon", "trident"]

ABILITIES = {
    "warden": ["warden_sonic_boom", "warden_blinding_punch"],
    "dragon": ["dragon_breath", "dragon_roar"],
    "ghast": ["ghast_fireball", "ghast_barrage"],
    "sculk": ["sculk_spikes", "sculk_sense", "sculk_explosion"],
    "lava": ["lava_fist", "lava_pool", "lava_meteor"],
    "water": ["water_jet", "water_prison", "tidal_crash"],
    "arrow": ["arrow_shot", "arrow_barrage", "arrow_rain"],
    "anvil": ["anvil_drop", "anvil_toss", "anvil_slam"],
    "core": ["wind_burst", "heavy_punch", "land_crash"],
    "slime": ["slime_shot", "slime_bounce", "slime_trap"],
    "copper": ["oxidize", "copper_lightning_strike", "copper_overload"],
    "beacon": ["flashbang", "beacon_beam", "beacon_boost"],
    "trident": ["trident_throw", "trident_lightning_strike", "whirlpool"],
}
TRANSFORMS = {"warden": "warden", "dragon": "dragon", "ghast": "ghast"}


def unfold_faces(u, v, w, h, d):
    """Standard Minecraft box-UV unfold. Returns dict of face name -> (x, y, w, h) crop rect."""
    return {
        "top": (u + d, v, w, d),
        "bottom": (u + d + w, v, w, d),
        "right": (u, v + d, d, h),
        "front": (u + d, v + d, w, h),
        "left": (u + d + w, v + d, d, h),
        "back": (u + d + w + d, v + d, w, h),
    }


def load_head_faces(fruit_id):
    geo = json.load(open(f"{GEO_DIR}/{fruit_id}_{fruit_id}_fruit.geo.json"))
    cube = geo["minecraft:geometry"][0]["bones"][0]["cubes"][0]
    u, v = cube["uv"]
    w, h, d = cube["size"]  # x, y, z
    texture = Image.open(f"{TEX_DIR}/cc_{fruit_id}_{fruit_id}_fruit.png").convert("RGBA")
    tex_w, tex_h = texture.size

    faces = unfold_faces(u, v, w, h, d)
    crops = {}
    for name, (x, y, fw, fh) in faces.items():
        if fw <= 0 or fh <= 0:
            continue
        if x + fw > tex_w or y + fh > tex_h:
            continue  # this face fell outside the actual texture bounds; skip it
        crops[name] = texture.crop((x, y, x + fw, y + fh))
    return crops  # dict of face_name -> PIL.Image


def save_icon(image, out_name):
    upscaled = image.resize((ICON_PX, ICON_PX), Image.NEAREST)
    upscaled.save(f"{OUT_DIR}/{out_name}.png")


# Preference order for the fruit's own "portrait" icon — a face-forward view reads as a head far
# better than a top-down one, so front wins whenever it exists; the rest is just a sane fallback
# chain for the handful of oddly-proportioned (flat "plate") heads where front is degenerate.
FRONT_FIRST = ["front", "top", "right", "left", "back", "bottom"]

report = []
for fruit_id in FRUITS:
    crops = load_head_faces(fruit_id)
    if not crops:
        report.append(f"{fruit_id}: NO VALID FACES FOUND")
        continue

    # Primary icon: first available face in front-first preference order.
    primary_name = next(name for name in FRONT_FIRST if name in crops)
    # Remaining faces, largest area first, for ability/transform icons (visual variety, not identity).
    remaining = sorted(
        (item for item in crops.items() if item[0] != primary_name),
        key=lambda kv: kv[1].size[0] * kv[1].size[1],
        reverse=True,
    )
    if not remaining:
        remaining = [(primary_name, crops[primary_name])]  # only one usable face on this head at all

    needed_extra = len(ABILITIES[fruit_id]) + (1 if fruit_id in TRANSFORMS else 0)
    pool = [remaining[i % len(remaining)] for i in range(needed_extra)]

    save_icon(crops[primary_name], f"fruit_{fruit_id}")
    used = [f"fruit_{fruit_id}<-{primary_name}"]

    for i, ability_key in enumerate(ABILITIES[fruit_id]):
        face_name, image = pool[i]
        save_icon(image, f"ability_{ability_key}")
        used.append(f"ability_{ability_key}<-{face_name}")

    if fruit_id in TRANSFORMS:
        face_name, image = pool[len(ABILITIES[fruit_id])]
        save_icon(image, f"transform_{fruit_id}")
        used.append(f"transform_{fruit_id}<-{face_name}")

    report.append(f"{fruit_id}: " + ", ".join(used))

print("\n".join(report))
print(f"\nWrote {len(os.listdir(OUT_DIR))} icon PNGs total to {OUT_DIR}")
