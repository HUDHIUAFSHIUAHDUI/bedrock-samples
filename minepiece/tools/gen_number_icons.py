"""
Simple, honest placeholders for ability items: a bold pixelated digit (1/2/3
for that fruit's first/second/third ability, "T" for a Zoan transform) on a
flat background — nothing fancy, easy to eyeball which ability an item is
without needing real art yet.
"""
from PIL import Image

OUT_DIR = "/home/user/bedrock-samples/minepiece/resource_pack/textures/items"
CANVAS = 16
BG = (40, 40, 46, 255)
FG = (235, 235, 235, 255)
BORDER = (90, 90, 100, 255)

# 3 wide x 5 tall bitmap glyphs, row-major, top to bottom.
GLYPHS = {
    "1": [
        "010",
        "110",
        "010",
        "010",
        "111",
    ],
    "2": [
        "111",
        "001",
        "111",
        "100",
        "111",
    ],
    "3": [
        "111",
        "001",
        "111",
        "001",
        "111",
    ],
    "T": [
        "111",
        "010",
        "010",
        "010",
        "010",
    ],
}


def draw_icon(glyph_key, out_name):
    image = Image.new("RGBA", (CANVAS, CANVAS), BG)
    pixels = image.load()

    for x in range(CANVAS):
        pixels[x, 0] = BORDER
        pixels[x, CANVAS - 1] = BORDER
    for y in range(CANVAS):
        pixels[0, y] = BORDER
        pixels[CANVAS - 1, y] = BORDER

    glyph = GLYPHS[glyph_key]
    glyph_h = len(glyph)
    glyph_w = len(glyph[0])
    scale = 2  # each glyph cell becomes a 2x2 block of real pixels
    start_x = (CANVAS - glyph_w * scale) // 2
    start_y = (CANVAS - glyph_h * scale) // 2

    for row, line in enumerate(glyph):
        for col, cell in enumerate(line):
            if cell != "1":
                continue
            for dx in range(scale):
                for dy in range(scale):
                    px, py = start_x + col * scale + dx, start_y + row * scale + dy
                    if 0 <= px < CANVAS and 0 <= py < CANVAS:
                        pixels[px, py] = FG

    image.save(f"{OUT_DIR}/{out_name}.png")


draw_icon("1", "number_1")
draw_icon("2", "number_2")
draw_icon("3", "number_3")
draw_icon("T", "number_transform")
print("Wrote number_1.png, number_2.png, number_3.png, number_transform.png")
