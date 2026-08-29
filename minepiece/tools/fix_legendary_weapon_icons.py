"""
The legendary sword/saber icons came from the CraftyCraft source pack as 256x354 TGA files
(mislabeled with a .png extension). Both this repo's earlier "TGA-mislabeled-as-PNG" fix and a
from-scratch RLE decoder here independently decode this exact file to an image with real RGB
color data (a gold-and-silver sword, a black-bladed saber) but an alpha channel that is 100%
zero across the entire canvas — the file's alpha data itself is broken at the source, not a
decoder bug. That's why the item was fully invisible in hand: there was nothing non-transparent
to render.

Fix: rebuild a real alpha mask from the RGB data itself (the artwork sits on a solid near-black
background, so any pixel that isn't near-black is treated as opaque, anything near-black as
transparent), then crop to the artwork's own bounding box and resize down to a normal 16x16
icon — matching every other item in this pack.

The original CraftyCraft item JSON compensated for its oversized 256x354 canvas with a
minecraft:render_offsets component and a tiny scale (e.g. 0.0276), but that component doesn't
exist in our target schema (1.21.80) or in any current vanilla item — it's a leftover from the
source pack's much older format_version (1.16.100) and has since been removed. Cropping +
resizing to a real 16x16 icon avoids needing any scale-compensation trick at all.
"""
import struct
from PIL import Image

SCRATCH_ADDON = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/addon0004/extracted"
RP = "/home/user/bedrock-samples/minepiece/resource_pack"

BLACK_THRESHOLD = 15


def decode_tga_rle32(path):
    data = open(path, "rb").read()
    id_len = data[0]
    color_map_type = data[1]
    image_type = data[2]
    width = struct.unpack("<H", data[12:14])[0]
    height = struct.unpack("<H", data[14:16])[0]
    bpp = data[16]
    descriptor = data[17]
    top_origin = bool(descriptor & 0x20)

    assert image_type == 10, f"unexpected TGA image type {image_type}"
    assert bpp == 32, f"unexpected TGA bpp {bpp}"
    assert color_map_type == 0, "unexpected TGA color map"

    pos = 18 + id_len
    pixels = bytearray(width * height * 4)
    px_index = 0
    total_px = width * height

    while px_index < total_px:
        packet_header = data[pos]
        pos += 1
        count = (packet_header & 0x7F) + 1
        if packet_header & 0x80:
            b, g, r, a = data[pos], data[pos + 1], data[pos + 2], data[pos + 3]
            pos += 4
            for _ in range(count):
                i = px_index * 4
                pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3] = r, g, b, a
                px_index += 1
        else:
            for _ in range(count):
                b, g, r, a = data[pos], data[pos + 1], data[pos + 2], data[pos + 3]
                pos += 4
                i = px_index * 4
                pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3] = r, g, b, a
                px_index += 1

    img = Image.frombytes("RGBA", (width, height), bytes(pixels))
    if not top_origin:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    return img


def rebuild_alpha(img):
    px = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            if r > BLACK_THRESHOLD or g > BLACK_THRESHOLD or b > BLACK_THRESHOLD:
                opx[x, y] = (r, g, b, 255)
    return out


ICON_SIZE = 16
PADDING = 6  # px of transparent margin (in the cropped image's own scale) so the blade tip isn't flush against the icon edge


def crop_and_resize(img):
    bbox = img.getbbox()
    cropped = img.crop(bbox)
    square = max(cropped.width, cropped.height) + PADDING * 2
    canvas = Image.new("RGBA", (square, square), (0, 0, 0, 0))
    canvas.paste(cropped, ((square - cropped.width) // 2, (square - cropped.height) // 2))
    return canvas.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)


for name in ("sword", "saber"):
    src = f"{SCRATCH_ADDON}/client/textures/items/cc_{name}.png"
    decoded = decode_tga_rle32(src)
    fixed = rebuild_alpha(decoded)
    icon = crop_and_resize(fixed)
    out_path = f"{RP}/textures/items/legendary_{name}.png"
    icon.save(out_path)
    opaque = sum(1 for p in icon.getdata() if p[3] > 0)
    print(f"legendary_{name}: {icon.size}, {opaque} opaque px, saved to {out_path}")
