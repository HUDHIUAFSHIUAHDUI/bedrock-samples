"""
Builds the icon for the Devil Fruit Removal Apple: the real vanilla apple icon with the
real vanilla barrier-block icon (the red "no entry" circle-slash used for barrier in the
creative inventory) alpha-composited on top at 90% opacity — high enough to read clearly
as "blocked/forbidden" while the apple underneath stays recognizable.
"""
from PIL import Image

VANILLA_RP = "/home/user/bedrock-samples/resource_pack"
RP = "/home/user/bedrock-samples/minepiece/resource_pack"

OVERLAY_OPACITY = 0.9

apple = Image.open(f"{VANILLA_RP}/textures/items/apple.png").convert("RGBA")
barrier = Image.open(f"{VANILLA_RP}/textures/blocks/barrier.png").convert("RGBA")

canvas = apple.copy()
overlay = barrier.copy()
r, g, b, a = overlay.split()
a = a.point(lambda v: round(v * OVERLAY_OPACITY))
overlay.putalpha(a)
canvas.alpha_composite(overlay)

out_path = f"{RP}/textures/items/power_removal_apple.png"
canvas.save(out_path)
print(f"Wrote {out_path}")
