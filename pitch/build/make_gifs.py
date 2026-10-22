"""Generate the animated GIFs and transparent PNGs the deck uses.

Run with the project venv:  .venv/bin/python pitch/build/make_gifs.py
GIFs are drawn on the slide background colour (no GIF transparency), so they
must sit directly on the slide background, never on a card.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "assets"
OUT.mkdir(exist_ok=True)

BG = (0x0B, 0x0B, 0x0E)
CLAY = (0xD9, 0x77, 0x57)


def save_gif(frames, name, ms):
    frames = [f.convert("P", palette=Image.ADAPTIVE, colors=64) for f in frames]
    frames[0].save(OUT / name, save_all=True, append_images=frames[1:],
                   duration=ms, loop=0, optimize=False, disposal=1)


# --- Master agent: starburst that slowly turns and breathes -----------------
star = Image.open(OUT / "claude-symbol.png").convert("RGBA")
S = 480
frames = []
N = 60
for i in range(N):
    t = i / N
    scale = 0.80 + 0.05 * math.sin(2 * math.pi * t)
    canvas = Image.new("RGBA", (S, S), BG + (255,))
    # soft glow ring
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    r = int(S * (0.30 + 0.06 * math.sin(2 * math.pi * t)))
    for k in range(18, 0, -1):
        a = int(5 * k * (0.6 + 0.4 * math.sin(2 * math.pi * t)))
        rr = r + k * 5
        gd.ellipse((S / 2 - rr, S / 2 - rr, S / 2 + rr, S / 2 + rr), fill=CLAY + (max(0, 22 - k),))
    canvas = Image.alpha_composite(canvas, glow)
    size = int(S * scale)
    s = star.resize((size, size), Image.LANCZOS).rotate(-360 * t / 3, resample=Image.BICUBIC)
    canvas.alpha_composite(s, ((S - size) // 2, (S - size) // 2))
    frames.append(canvas.convert("RGB"))
save_gif(frames, "master-agent.gif", 70)

# --- Loop arrow: a ring with an arrowhead, spinning -------------------------
S = 360
frames = []
N = 36
for i in range(N):
    img = Image.new("RGB", (S * 2, S * 2), BG)  # draw 2x, downsample for AA
    d = ImageDraw.Draw(img)
    c, r, w = S, int(S * 0.78), int(S * 0.11)
    start = -360 * i / N
    d.arc((c - r, c - r, c + r, c + r), start=start, end=start + 290, fill=CLAY, width=w)
    # arrowhead at the end of the arc
    ang = math.radians(start + 290)
    hx, hy = c + r * math.cos(ang), c + r * math.sin(ang)
    tang = ang + math.pi / 2
    L = w * 1.9
    p1 = (hx + L * math.cos(tang), hy + L * math.sin(tang))
    p2 = (hx + L * 0.9 * math.cos(ang), hy + L * 0.9 * math.sin(ang))
    p3 = (hx - L * 0.9 * math.cos(ang), hy - L * 0.9 * math.sin(ang))
    d.polygon([p1, p2, p3], fill=CLAY)
    frames.append(img.resize((S, S), Image.LANCZOS))
save_gif(frames, "loop.gif", 45)

# --- Pixel agent: sampled from the repo's "claud agent" art, then animated ---
src = Image.open(OUT / "claude-agent.png").convert("RGB")
CELL, OX, OY, COLS, ROWS = 56, 192, 378, 16, 10
grid = [[sum(src.getpixel((OX + x * CELL + CELL // 2, OY + y * CELL + CELL // 2))) > 300
         for x in range(COLS)] for y in range(ROWS)]


def sprite(g, px=24, pad=2, bg=BG):
    w, h = (COLS + 2 * pad) * px, (ROWS + 2 * pad) * px
    img = Image.new("RGBA" if bg is None else "RGB", (w, h), (0, 0, 0, 0) if bg is None else bg)
    d = ImageDraw.Draw(img)
    for y, row in enumerate(g):
        for x, on in enumerate(row):
            if on:
                d.rectangle(((x + pad) * px, (y + pad) * px, (x + pad + 1) * px - 1, (y + pad + 1) * px - 1), fill=CLAY)
    return img


def variant(blink=False, step=0, hop=False):
    g = [row[:] for row in grid]
    if blink:
        for y in (2, 3):
            for x in range(COLS):
                if 2 <= x <= 13 and not g[y][x]:
                    g[y][x] = True
    if step:
        lift = (3, 10) if step == 1 else (5, 12)
        for x in lift:
            g[9][x] = False
    if hop:
        g = g[1:] + [[False] * COLS]
    return g


seq = ([variant()] * 6 + [variant(step=1), variant(), variant(step=2), variant()] * 2
       + [variant(blink=True), variant()] + [variant(hop=True), variant()] * 2 + [variant()] * 4)
save_gif([sprite(g) for g in seq], "agent.gif", 140)
sprite(variant(), bg=None).save(OUT / "agent.png")

# --- MCP logo: strip the baked-in checkerboard, recolour to light ----------
mcp = Image.open(OUT / "mcp-logo.png").convert("L")
alpha = mcp.point(lambda v: max(0, min(255, int((170 - v) * 3))))
light = Image.new("RGBA", mcp.size, (0xF4, 0xF1, 0xEA, 0))
light.putalpha(alpha)
light.save(OUT / "mcp-light.png")
print("ok")

# --- Effort donut: 90% agents (clay), 10% developer review (light) ----------
S = 1200
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
pad, w = 40, 150
gap = 2.5
d.arc((pad, pad, S - pad, S - pad), start=-90 + gap, end=-90 + 324 - gap, fill=CLAY, width=w)
d.arc((pad, pad, S - pad, S - pad), start=-90 + 324 + gap, end=270 - gap, fill=(0xF4, 0xF1, 0xEA), width=w)
img.resize((600, 600), Image.LANCZOS).save(OUT / "donut.png")
print("donut ok")
