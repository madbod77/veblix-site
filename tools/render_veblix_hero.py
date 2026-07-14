#!/usr/bin/env python3
"""Render the Veblix scroll-scrub hero as deterministic motion design.

The 24-second timeline is deliberately split into three reversible scenes:
website -> Telegram bot -> automation and analytics.  It writes an all-I-frame
H.264 MP4 so setting video.currentTime from scroll stays responsive.
"""

from __future__ import annotations

import argparse
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


W, H = 1280, 720
FPS = 24
DURATION = 24

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "assets/video/veblix-hero.mp4"
DESKTOP_POSTERS = {
    4.70: ("hero-poster.jpg",),
    7.20: ("scene-01.jpg",),
    15.20: ("scene-02.jpg",),
    23.40: ("scene-05.jpg",),
}
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

BG = (5, 7, 17)
PANEL = (10, 14, 30)
PANEL_2 = (15, 20, 42)
INK = (241, 244, 255)
MUTED = (144, 154, 181)
FAINT = (87, 96, 126)
INDIGO = (91, 108, 255)
VIOLET = (139, 147, 255)
CYAN = (83, 204, 255)
MINT = (61, 220, 151)
AMBER = (255, 182, 92)


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def mix(a: float, b: float, p: float) -> float:
    return a + (b - a) * p


def smooth(a: float, b: float, value: float) -> float:
    if a == b:
        return float(value >= b)
    p = clamp((value - a) / (b - a))
    return p * p * (3.0 - 2.0 * p)


def out_back(p: float) -> float:
    p = clamp(p) - 1
    return 1 + 2.4 * p * p * p + 1.4 * p * p


def appear(t: float, start: float, duration: float = 0.45) -> float:
    return smooth(start, start + duration, t)


def c(rgb: tuple[int, int, int], alpha: float | int = 255) -> tuple[int, int, int, int]:
    a = int(alpha * 255 if isinstance(alpha, float) and alpha <= 1 else alpha)
    return (*rgb, max(0, min(255, a)))


@lru_cache(maxsize=None)
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size=size)


def set_opacity(layer: Image.Image, opacity: float) -> Image.Image:
    opacity = clamp(opacity)
    if opacity >= 0.999:
        return layer
    alpha = np.asarray(layer.getchannel("A"), dtype=np.float32)
    layer.putalpha(Image.fromarray((alpha * opacity).astype(np.uint8), "L"))
    return layer


def rr(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(tuple(int(v) for v in box), radius=radius, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy, value: str, size: int, fill, bold: bool = False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=fill, anchor=anchor)


def glow_dot(glow: ImageDraw.ImageDraw, draw: ImageDraw.ImageDraw, x: float, y: float,
             radius: float, color: tuple[int, int, int], alpha: float = 1.0):
    glow.ellipse((x - radius * 2.8, y - radius * 2.8, x + radius * 2.8, y + radius * 2.8),
                 fill=c(color, 110 * alpha))
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=c(color, 245 * alpha))
    draw.ellipse((x - radius * .38, y - radius * .38, x + radius * .38, y + radius * .38),
                 fill=c(INK, 250 * alpha))


def checkmark(draw: ImageDraw.ImageDraw, x: float, y: float, size: float, color, width: int = 4):
    draw.line((x - size * .45, y, x - size * .12, y + size * .34, x + size * .52, y - size * .42),
              fill=color, width=width, joint="curve")


def paper_plane(draw: ImageDraw.ImageDraw, x: float, y: float, size: float, color):
    pts = [(x - size * .55, y - size * .22), (x + size * .58, y - size * .55),
           (x + size * .18, y + size * .56), (x - size * .02, y + size * .12)]
    draw.polygon(pts, fill=color)
    draw.line((x - size * .02, y + size * .12, x + size * .38, y - size * .31), fill=c(BG, 170), width=2)


def cursor(draw: ImageDraw.ImageDraw, x: float, y: float, alpha: float):
    pts = [(x, y), (x + 2, y + 27), (x + 8, y + 20), (x + 15, y + 34),
           (x + 21, y + 30), (x + 14, y + 17), (x + 25, y + 15)]
    draw.polygon(pts, fill=c(INK, 245 * alpha), outline=c(BG, 220 * alpha))


def make_base() -> Image.Image:
    yy, xx = np.mgrid[0:H, 0:W]
    arr = np.zeros((H, W, 3), dtype=np.float32)
    arr[:] = BG
    vertical = (1 - yy / H)[..., None]
    arr += vertical * np.array([4, 5, 13], dtype=np.float32)

    def radial(cx, cy, radius, color, strength):
        nonlocal arr
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        amount = np.clip(1 - dist / radius, 0, 1) ** 2 * strength
        arr += amount[..., None] * np.array(color, dtype=np.float32)

    radial(825, 330, 690, INDIGO, .10)
    radial(1230, 50, 500, CYAN, .035)
    radial(470, 760, 620, (28, 38, 95), .045)
    image = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(image, "RGBA")
    # The Veblix grid remains a quiet stage, not part of the product UI.
    for x in range(0, W + 1, 64):
        d.line((x, 0, x, H), fill=(90, 108, 210, 5), width=1)
    for y in range(0, H + 1, 64):
        d.line((0, y, W, y), fill=(90, 108, 210, 4), width=1)
    # Keep the copy area quiet even before the website's CSS scrim is applied.
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(0, 590, 10):
        a = int(112 * (1 - x / 590) ** 1.5)
        od.rectangle((x, 0, x + 10, H), fill=(3, 5, 13, a))
    return Image.alpha_composite(image, overlay)


BASE = make_base()
STARS = [
    (56 + ((i * 173) % 1170), 45 + ((i * 97) % 610), 1 + (i % 3) * .55, (i * .71) % (math.tau))
    for i in range(34)
]


def ambience(frame: Image.Image, t: float):
    aura = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(aura, "RGBA")
    mint_p = smooth(15.2, 18.2, t)
    indigo_alpha = 1 - mint_p * .65
    cx = 820 + math.sin(t * .24) * 42
    cy = 335 + math.cos(t * .19) * 28
    ad.ellipse((cx - 310, cy - 250, cx + 310, cy + 250), fill=c(INDIGO, 31 * indigo_alpha))
    ad.ellipse((790 - 340, 350 - 280, 790 + 340, 350 + 280), fill=c(MINT, 28 * mint_p))
    ad.ellipse((1060 - 190, 210 - 180, 1060 + 190, 210 + 180), fill=c(CYAN, 13))
    frame.alpha_composite(aura.filter(ImageFilter.GaussianBlur(92)))
    d = ImageDraw.Draw(frame, "RGBA")
    for i, (x, y, r, phase) in enumerate(STARS):
        alpha = 9 + 13 * (.5 + .5 * math.sin(t * .72 + phase))
        col = MINT if mint_p > .55 and i % 4 == 0 else VIOLET
        d.ellipse((x - r, y - r, x + r, y + r), fill=c(col, alpha))


def scene_canvas():
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return layer, ImageDraw.Draw(layer, "RGBA"), glow, ImageDraw.Draw(glow, "RGBA")


def composite_scene(frame: Image.Image, layer: Image.Image, glow: Image.Image, alpha: float):
    if alpha <= .001:
        return
    set_opacity(glow, alpha)
    set_opacity(layer, alpha)
    frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
    frame.alpha_composite(layer)


def panel_shadow(gd: ImageDraw.ImageDraw, box, radius: int = 28, alpha: int = 125,
                 accent: tuple[int, int, int] | None = None):
    """Neutral product shadow with only a restrained accent edge."""
    x1, y1, x2, y2 = box
    gd.rounded_rectangle((x1 + 2, y1 + 16, x2 + 2, y2 + 22), radius=radius,
                         fill=(0, 0, 0, alpha))
    if accent:
        gd.rounded_rectangle((x1 - 3, y1 - 3, x2 + 3, y2 + 3), radius=radius + 2,
                             outline=c(accent, 42), width=5)


def draw_lock(draw: ImageDraw.ImageDraw, x: float, y: float, color):
    draw.arc((x, y, x + 10, y + 11), 180, 360, fill=color, width=2)
    draw.rounded_rectangle((x - 1, y + 5, x + 11, y + 16), radius=3, fill=color)


def draw_battery(draw: ImageDraw.ImageDraw, x: float, y: float, level: float = .82):
    draw.rounded_rectangle((x, y, x + 25, y + 11), radius=3, outline=c(INK, 205), width=2)
    draw.rectangle((x + 26, y + 3, x + 28, y + 8), fill=c(INK, 170))
    draw.rounded_rectangle((x + 3, y + 3, x + 3 + 18 * clamp(level), y + 8), radius=2,
                           fill=c(MINT if level > .25 else AMBER, 230))


def draw_wifi(draw: ImageDraw.ImageDraw, x: float, y: float):
    draw.arc((x, y, x + 20, y + 15), 215, 325, fill=c(INK, 205), width=2)
    draw.arc((x + 4, y + 5, x + 16, y + 15), 215, 325, fill=c(INK, 205), width=2)
    draw.ellipse((x + 9, y + 12, x + 12, y + 15), fill=c(INK, 220))


def draw_chevron(draw: ImageDraw.ImageDraw, x: float, y: float, color, direction: str = "left"):
    if direction == "left":
        draw.line((x + 8, y, x, y + 8, x + 8, y + 16), fill=color, width=3, joint="curve")
    elif direction == "right":
        draw.line((x, y, x + 8, y + 8, x, y + 16), fill=color, width=3, joint="curve")
    else:
        draw.line((x, y, x + 6, y + 6, x + 12, y), fill=color, width=2, joint="curve")


def product_icon(draw: ImageDraw.ImageDraw, x: float, y: float, kind: str, color, size: float = 13):
    """Draw tiny UI icons as vectors so every glyph is deterministic."""
    if kind == "scenario":
        text(draw, (x, y), "C", int(size), color, True, "mm")
    elif kind == "runs":
        draw.polygon(((x - 4, y - 6), (x + 6, y), (x - 4, y + 6)), fill=color)
    elif kind == "analytics":
        for i, height in enumerate((6, 11, 8)):
            draw.rounded_rectangle((x - 7 + i * 6, y + 6 - height, x - 3 + i * 6, y + 6),
                                   radius=1, fill=color)
    elif kind == "settings":
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), outline=color, width=2)
        draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=color)
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            draw.line((x + math.cos(rad) * 5, y + math.sin(rad) * 5,
                       x + math.cos(rad) * 8, y + math.sin(rad) * 8), fill=color, width=2)


def typing_dots(draw: ImageDraw.ImageDraw, x: float, y: float, phase: float, alpha: float):
    for i in range(3):
        lift = 3 * max(0, math.sin(phase * math.tau - i * .8))
        draw.ellipse((x + i * 14, y - lift, x + 7 + i * 14, y + 7 - lift), fill=c(MUTED, 210 * alpha))


def draw_browser(frame: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    layer, d, glow, gd = scene_canvas()
    exit_p = smooth(7.68, 8.28, t)
    x = 560 - 42 * exit_p
    y = 48 - 12 * exit_p
    w, h = 665, 620
    panel_shadow(gd, (x, y, x + w, y + h), 30, 155, INDIGO)
    rr(d, (x, y, x + w, y + h), 30, c((24, 26, 34), 252), c((118, 126, 154), 105), 2)

    # Familiar desktop browser chrome: tab, URL, lock, controls and menu.
    rr(d, (x + 1, y + 1, x + w - 1, y + 66), 29, c((31, 34, 44), 255))
    d.rectangle((x + 1, y + 38, x + w - 1, y + 68), fill=c((31, 34, 44), 255))
    for i, col in enumerate(((255, 96, 104), (255, 190, 76), (50, 205, 114))):
        d.ellipse((x + 20 + i * 20, y + 21, x + 31 + i * 20, y + 32), fill=c(col, 245))
    rr(d, (x + 88, y + 10, x + 300, y + 43), 11, c((43, 46, 58), 255), c((118, 126, 154), 52), 1)
    d.ellipse((x + 102, y + 18, x + 119, y + 35), fill=c(INDIGO, 235))
    text(d, (x + 127, y + 18), "Veblix · розрахунок проєкту", 13, c(INK, 225), True)
    rr(d, (x + 320, y + 10, x + w - 54, y + 43), 11, c((20, 22, 29), 255), c((118, 126, 154), 50), 1)
    draw_lock(d, x + 338, y + 18, c(MINT, 210))
    text(d, (x + 358, y + 18), "veblix.site/start", 13, c((199, 204, 218), 225))
    for yy in (18, 24, 30):
        d.ellipse((x + w - 31, y + yy, x + w - 27, y + yy + 4), fill=c(MUTED, 190))

    page = (x + 10, y + 67, x + w - 10, y + h - 10)
    rr(d, page, 20, c((241, 239, 234), 255))
    px, py = page[0], page[1]
    pw, ph = page[2] - page[0], page[3] - page[1]

    # A complete, credible service website rather than placeholder rectangles.
    text(d, (px + 26, py + 20), "VEBLIX", 17, c((22, 24, 31), 255), True)
    d.ellipse((px + 99, py + 25, px + 106, py + 32), fill=c(INDIGO, 255))
    text(d, (px + 190, py + 22), "Послуги", 13, c((73, 76, 89), 235), True)
    text(d, (px + 268, py + 22), "Як працюємо", 13, c((73, 76, 89), 235), True)
    text(d, (px + 375, py + 22), "Кейси", 13, c((73, 76, 89), 235), True)
    rr(d, (px + pw - 142, py + 12, px + pw - 22, py + 46), 17, c((25, 27, 36), 255))
    text(d, (px + pw - 82, py + 23), "Обговорити", 12, c(INK, 245), True, "ma")
    d.line((px + 22, py + 58, px + pw - 22, py + 58), fill=c((26, 28, 36), 22), width=1)

    # Website hero content.
    rr(d, (px + 27, py + 84, px + 205, py + 113), 14, c((230, 231, 255), 255))
    text(d, (px + 42, py + 91), "СИСТЕМА ПРОДАЖІВ 24/7", 11, c((62, 72, 190), 255), True)
    text(d, (px + 27, py + 137), "Сайт, бот і", 31, c((22, 24, 31), 255), True)
    text(d, (px + 27, py + 173), "автоматизація", 31, c((22, 24, 31), 255), True)
    text(d, (px + 27, py + 209), "в одній системі", 31, c((77, 89, 221), 255), True)
    text(d, (px + 28, py + 260), "Заявки одразу потрапляють у Telegram і CRM.", 15, c((74, 77, 91), 245))
    text(d, (px + 28, py + 283), "Менше ручної роботи — більше зрозумілих рішень.", 15, c((74, 77, 91), 245))
    cta = (px + 28, py + 326, px + 238, py + 376)
    hover = smooth(.72, 1.18, t) * (1 - smooth(1.7, 2.0, t))
    rr(gd, (cta[0] - 4, cta[1] - 2, cta[2] + 4, cta[3] + 7), 16, c(INDIGO, 45 + 70 * hover))
    rr(d, cta, 15, c((68, 79, 221), 255), c((102, 113, 245), 210), 1)
    text(d, ((cta[0] + cta[2]) / 2, cta[1] + 17), "Отримати розрахунок  →", 14, c(INK, 250), True, "ma")
    d.ellipse((px + 30, py + 408, px + 55, py + 433), fill=c((244, 180, 92), 255))
    d.ellipse((px + 48, py + 408, px + 73, py + 433), fill=c((91, 108, 255), 255))
    d.ellipse((px + 66, py + 408, px + 91, py + 433), fill=c((61, 180, 151), 255))
    text(d, (px + 103, py + 409), "4.9 · клієнти рекомендують Veblix", 13, c((62, 65, 77), 240), True)

    # A concrete result preview on the website itself.
    visual = (px + 390, py + 86, px + pw - 25, py + 438)
    rr(d, visual, 24, c((23, 26, 38), 255))
    # Subtle photographic-style studio gradient.
    for row in range(int(visual[1] + 1), int(visual[3] - 1), 4):
        rp = (row - visual[1]) / max(1, visual[3] - visual[1])
        col = tuple(int(mix(a, b, rp)) for a, b in zip((84, 73, 155), (24, 29, 49)))
        d.rectangle((visual[0] + 1, row, visual[2] - 1, row + 4), fill=c(col, 255))
    d.ellipse((visual[0] + 82, visual[1] + 64, visual[0] + 180, visual[1] + 162), fill=c((231, 194, 170), 255))
    d.rounded_rectangle((visual[0] + 58, visual[1] + 142, visual[0] + 205, visual[1] + 330), radius=54,
                        fill=c((27, 32, 49), 255))
    d.arc((visual[0] + 72, visual[1] + 56, visual[0] + 193, visual[1] + 182), 195, 345,
          fill=c((29, 22, 33), 255), width=22)
    rr(d, (visual[0] + 16, visual[1] + 16, visual[0] + 142, visual[1] + 47), 14, c((255, 255, 255), 222))
    text(d, (visual[0] + 30, visual[1] + 25), "48 заявок / місяць", 12, c((25, 27, 35), 255), True)
    rr(d, (visual[0] + 98, visual[3] - 72, visual[2] - 15, visual[3] - 18), 17, c((255, 255, 255), 236))
    text(d, (visual[0] + 114, visual[3] - 60), "Середня відповідь", 11, c((84, 87, 98), 245))
    text(d, (visual[0] + 114, visual[3] - 42), "38 секунд", 17, c((25, 27, 35), 255), True)

    # Form drawer opens inside the browser after a real CTA click.
    drawer_p = out_back(smooth(1.38, 2.03, t))
    if drawer_p > .001:
        dim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dim_draw = ImageDraw.Draw(dim, "RGBA")
        dim_draw.rounded_rectangle(page, radius=20, fill=c((18, 20, 28), 92 * drawer_p))
        layer.alpha_composite(dim)
        d = ImageDraw.Draw(layer, "RGBA")
        dw = 326
        dx = mix(page[2] + 12, page[2] - dw - 12, drawer_p)
        dy, dh = page[1] + 12, ph - 24
        panel_shadow(gd, (dx, dy, dx + dw, dy + dh), 22, 95)
        rr(d, (dx, dy, dx + dw, dy + dh), 22, c((252, 251, 248), 255), c((25, 27, 35), 26), 1)
        text(d, (dx + 22, dy + 20), "Розрахувати проєкт", 21, c((25, 27, 35), 255), True)
        text(d, (dx + 22, dy + 49), "Відповімо в Telegram протягом 2 хв", 12, c((92, 95, 108), 245))
        d.line((dx + 22, dy + 76, dx + dw - 22, dy + 76), fill=c((25, 27, 35), 24), width=1)

        content_a = 1.0 if t < 5.72 else 0.0
        if content_a > .01:
            text(d, (dx + 22, dy + 95), "Що потрібно?", 12, c((62, 65, 77), 245 * content_a), True)
            services = (("Сайт", 22, 88), ("Сайт + бот", 96, 203), ("Автоматизація", 211, 304))
            service_selected = t >= 2.62
            for label, x1, x2 in services:
                selected = label == "Сайт + бот" and service_selected
                rr(d, (dx + x1, dy + 119, dx + x2, dy + 155), 12,
                   c((230, 232, 255) if selected else (245, 244, 241), 255 * content_a),
                   c(INDIGO if selected else (35, 38, 48), (185 if selected else 28) * content_a), 1)
                text(d, ((dx + x1 + dx + x2) / 2, dy + 131), label, 11,
                     c((57, 68, 194) if selected else (77, 80, 93), 245 * content_a), True, "ma")

            text(d, (dx + 22, dy + 177), "Орієнтовний бюджет", 12, c((62, 65, 77), 245 * content_a), True)
            budgets = (("до $500", 22, 100), ("$500–1000", 108, 211), ("$1000+", 219, 304))
            budget_selected = t >= 3.43
            for label, x1, x2 in budgets:
                selected = label == "$500–1000" and budget_selected
                rr(d, (dx + x1, dy + 201, dx + x2, dy + 237), 12,
                   c((224, 248, 238) if selected else (245, 244, 241), 255 * content_a),
                   c(MINT if selected else (35, 38, 48), (195 if selected else 28) * content_a), 1)
                text(d, ((dx + x1 + dx + x2) / 2, dy + 213), label, 11,
                     c((20, 112, 74) if selected else (77, 80, 93), 245 * content_a), True, "ma")

            text(d, (dx + 22, dy + 259), "Telegram для відповіді", 12, c((62, 65, 77), 245 * content_a), True)
            focus = t >= 3.82
            rr(d, (dx + 22, dy + 283, dx + dw - 22, dy + 331), 13, c((248, 247, 244), 255 * content_a),
               c(INDIGO if focus else (35, 38, 48), (180 if focus else 32) * content_a), 2 if focus else 1)
            handle = "@olena_demo"
            typed = int(len(handle) * smooth(3.86, 4.62, t))
            shown = handle[:typed]
            text(d, (dx + 38, dy + 298), shown or "@username", 14,
                 c((29, 32, 42) if shown else (137, 139, 149), 245 * content_a), True if shown else False)
            if focus and t < 4.83 and int(t * 3) % 2 == 0:
                tw = d.textlength(shown, font=font(14, True))
                d.line((dx + 40 + tw, dy + 297, dx + 40 + tw, dy + 317), fill=c(INDIGO, 220 * content_a), width=2)
            if typed == len(handle):
                d.ellipse((dx + dw - 52, dy + 297, dx + dw - 30, dy + 319), fill=c(MINT, 245 * content_a))
                checkmark(d, dx + dw - 41, dy + 308, 9, c((252, 251, 248), 255 * content_a), 3)

            send = (dx + 22, dy + 354, dx + dw - 22, dy + 405)
            send_ready = typed == len(handle)
            rr(d, send, 14, c((68, 79, 221) if send_ready else (184, 187, 199), 255 * content_a))
            text(d, ((send[0] + send[2]) / 2, send[1] + 18), "Надіслати заявку", 14,
                 c(INK if send_ready else (248, 248, 249), 250 * content_a), True, "ma")
            text(d, (dx + dw / 2, dy + 424), "Демо-дані · без спаму", 11, c((115, 118, 130), 220 * content_a), False, "ma")

        success = smooth(5.62, 6.12, t)
        if success > .01:
            sy = dy + 120 + (1 - out_back(success)) * 28
            d.ellipse((dx + dw / 2 - 37, sy, dx + dw / 2 + 37, sy + 74), fill=c(MINT, 245 * success))
            checkmark(d, dx + dw / 2, sy + 37, 29, c((252, 251, 248), 255 * success), 6)
            text(d, (dx + dw / 2, sy + 99), "Заявку отримано", 23, c((25, 27, 35), 255 * success), True, "ma")
            rr(d, (dx + 40, sy + 137, dx + dw - 40, sy + 246), 15, c((239, 248, 244), 255 * success), c(MINT, 90 * success), 1)
            text(d, (dx + 58, sy + 151), "VLX-0284", 13, c((23, 116, 78), 255 * success), True)
            text(d, (dx + 58, sy + 175), "Олена  ·  @olena_demo", 12, c((91, 94, 106), 240 * success), True)
            text(d, (dx + 58, sy + 198), "Сайт + бот  ·  $500–1000", 13, c((38, 41, 51), 250 * success), True)
            text(d, (dx + 58, sy + 221), "Відповідь у Telegram до 14:34", 12, c((91, 94, 106), 240 * success))

    # Cursor follows a plausible series of controls and stays reversible.
    cursor_a = appear(t, .25, .25) * (1 - smooth(5.82, 6.1, t))
    if t < 1.48:
        p = smooth(.35, 1.18, t); cx, cy = mix(x + w - 54, cta[0] + 168, p), mix(y + 98, cta[1] + 25, p)
    elif t < 2.72:
        p = smooth(1.72, 2.55, t); cx, cy = mix(cta[0] + 168, page[2] - 174, p), mix(cta[1] + 25, page[1] + 151, p)
    elif t < 3.52:
        p = smooth(2.82, 3.38, t); cx, cy = mix(page[2] - 174, page[2] - 166, p), mix(page[1] + 151, page[1] + 233, p)
    elif t < 4.82:
        p = smooth(3.55, 4.08, t); cx, cy = mix(page[2] - 166, page[2] - 170, p), mix(page[1] + 233, page[1] + 324, p)
    else:
        p = smooth(4.82, 5.42, t); cx, cy = mix(page[2] - 170, page[2] - 170, p), mix(page[1] + 324, page[1] + 400, p)
    cursor(d, cx, cy, cursor_a)
    for centre, begin in (((cta[0] + 168, cta[1] + 25), 1.30),
                          ((page[2] - 174, page[1] + 151), 2.55),
                          ((page[2] - 166, page[1] + 233), 3.38),
                          ((page[2] - 170, page[1] + 400), 5.42)):
        ripple = smooth(begin, begin + .12, t) * (1 - smooth(begin + .12, begin + .46, t))
        if ripple > .01:
            radius = 8 + 23 * smooth(begin, begin + .46, t)
            d.ellipse((centre[0] - radius, centre[1] - radius, centre[0] + radius, centre[1] + radius),
                      outline=c(INDIGO, 180 * ripple), width=3)

    composite_scene(frame, layer, glow, alpha)


def bubble(d, box, fill, outline, value, value_color, alpha, align="left", size=13, bold=False):
    if alpha <= .01:
        return
    x1, y1, x2, y2 = box
    offset = (1 - out_back(alpha)) * 22
    if align == "right":
        x1 += offset
        x2 += offset
    else:
        x1 -= offset
        x2 -= offset
    rr(d, (x1, y1, x2, y2), 16, c(fill, 235 * alpha), c(outline, 100 * alpha), 1)
    text(d, (x1 + 16, y1 + 14), value, size, c(value_color, 235 * alpha), bold)


def phone_bubble(draw: ImageDraw.ImageDraw, box, lines: list[str], alpha: float,
                 outgoing: bool = False, stamp: str = "14:32", checks: bool = False):
    if alpha <= .01:
        return
    opacity = 1.0
    x1, y1, x2, y2 = box
    offset = (1 - out_back(alpha)) * (24 if outgoing else -24)
    x1 += offset; x2 += offset
    fill = (47, 63, 111) if outgoing else (31, 39, 58)
    outline = (92, 108, 255) if outgoing else (111, 125, 154)
    rr(draw, (x1, y1, x2, y2), 18, c(fill, 252 * opacity), c(outline, 70 * opacity), 1)
    yy = y1 + 13
    for line in lines:
        text(draw, (x1 + 15, yy), line, 19, c(INK, 245 * opacity), False)
        yy += 23
    stamp_x = x2 - (40 if checks else 14)
    text(draw, (stamp_x, y2 - 18), stamp, 11, c((174, 184, 204), 205 * opacity), False, "ra")
    if checks:
        checkmark(draw, x2 - 26, y2 - 13, 6, c(CYAN, 230 * opacity), 2)
        checkmark(draw, x2 - 17, y2 - 13, 6, c(CYAN, 230 * opacity), 2)


def draw_chat(frame: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    layer, d, glow, gd = scene_canvas()
    s = t - 8
    enter = smooth(-.35, .18, s)
    exit_p = smooth(7.65, 8.28, s)
    x = 720 + (1 - enter) * 28 - 42 * exit_p
    y = 24 + (1 - enter) * 18 - 10 * exit_p
    w, h = 414, 672

    # Physical phone: neutral metal, side controls, glass and a restrained reflection.
    panel_shadow(gd, (x, y, x + w, y + h), 58, 175, CYAN)
    rr(d, (x - 5, y + 102, x + 2, y + 174), 4, c((109, 114, 127), 240))
    rr(d, (x - 5, y + 194, x + 2, y + 265), 4, c((109, 114, 127), 240))
    rr(d, (x + w - 2, y + 150, x + w + 5, y + 252), 4, c((109, 114, 127), 240))
    rr(d, (x, y, x + w, y + h), 56, c((72, 76, 88), 255), c((209, 214, 226), 105), 2)
    rr(d, (x + 6, y + 6, x + w - 6, y + h - 6), 51, c((7, 10, 18), 255), c((10, 12, 18), 255), 2)
    sx, sy, sw, sh = x + 12, y + 12, w - 24, h - 24
    rr(d, (sx, sy, sx + sw, sy + sh), 46, c((13, 18, 31), 255))

    # Native status bar and dynamic island.
    text(d, (sx + 28, sy + 18), "14:32", 14, c(INK, 235), True)
    d.line((sx + sw - 100, sy + 26, sx + sw - 96, sy + 21), fill=c(INK, 205), width=2)
    d.line((sx + sw - 94, sy + 26, sx + sw - 94, sy + 18), fill=c(INK, 205), width=2)
    d.line((sx + sw - 88, sy + 26, sx + sw - 88, sy + 15), fill=c(INK, 205), width=2)
    draw_wifi(d, sx + sw - 78, sy + 14)
    draw_battery(d, sx + sw - 44, sy + 17, .82)
    rr(d, (sx + sw / 2 - 54, sy + 9, sx + sw / 2 + 54, sy + 36), 14, c((2, 3, 6), 255))
    d.ellipse((sx + sw / 2 + 31, sy + 17, sx + sw / 2 + 39, sy + 25), fill=c((18, 27, 47), 255))

    app_y = sy + 45
    # Telegram-style navigation chrome.
    d.rectangle((sx, app_y, sx + sw, app_y + 72), fill=c((24, 31, 49), 255))
    d.line((sx, app_y + 71, sx + sw, app_y + 71), fill=c((119, 132, 158), 40), width=1)
    draw_chevron(d, sx + 20, app_y + 28, c(CYAN, 235))
    d.ellipse((sx + 47, app_y + 13, sx + 97, app_y + 63), fill=c((37, 146, 215), 255))
    paper_plane(d, sx + 72, app_y + 38, 24, c(INK, 255))
    text(d, (sx + 111, app_y + 15), "Veblix Асистент", 20, c(INK, 250), True)
    text(d, (sx + 111, app_y + 42), "бот · відповідає миттєво", 13, c((118, 197, 235), 235))
    d.ellipse((sx + sw - 38, app_y + 28, sx + sw - 32, app_y + 34), fill=c(INK, 185))
    d.ellipse((sx + sw - 38, app_y + 38, sx + sw - 32, app_y + 44), fill=c(INK, 185))
    d.ellipse((sx + sw - 38, app_y + 48, sx + sw - 32, app_y + 54), fill=c(INK, 185))

    chat_top = app_y + 72
    chat_bottom = sy + sh - 66
    d.rectangle((sx, chat_top, sx + sw, chat_bottom), fill=c((14, 20, 34), 255))
    # Very quiet Telegram-like wallpaper details.
    for i in range(14):
        wx = sx + 18 + ((i * 83) % int(sw - 36)); wy = chat_top + 18 + ((i * 57) % int(chat_bottom - chat_top - 36))
        d.arc((wx, wy, wx + 22, wy + 22), 15, 235, fill=c((95, 112, 151), 22), width=1)
        d.ellipse((wx + 8, wy + 8, wx + 12, wy + 12), outline=c((95, 112, 151), 20), width=1)

    # Real chat continuity: same service, budget and ID as the website form.
    intro = appear(s, 1.05, .38)
    phone_bubble(d, (sx + 18, chat_top + 20, sx + 338, chat_top + 93),
                 ["Бачу заявку «Сайт + бот».", "Уточню 2 питання — 30 секунд."], intro, False, "14:32")
    q1 = appear(s, 1.85, .35)
    phone_bubble(d, (sx + 18, chat_top + 106, sx + 294, chat_top + 157),
                 ["Який бюджет на запуск?"], q1, False, "14:32")
    chips = appear(s, 2.2, .34)
    chip_y = chat_top + 168
    chip_specs = (("до $500", 18, 112), ("$500–1000", 120, 238), ("$1000+", 246, 338))
    if chips > .01:
        for label, x1, x2 in chip_specs:
            selected = label == "$500–1000" and s >= 2.82
            rr(d, (sx + x1, chip_y, sx + x2, chip_y + 39), 13,
               c((36, 124, 92) if selected else (24, 34, 54), 245),
               c(MINT if selected else CYAN, 180 if selected else 80), 1)
            text(d, ((sx + x1 + sx + x2) / 2, chip_y + 12), label, 13, c(INK, 240), True, "ma")

    answer1 = appear(s, 2.82, .3)
    phone_bubble(d, (sx + 168, chat_top + 220, sx + 365, chat_top + 268),
                 ["$500–1000"], answer1, True, "14:32", True)

    typing = smooth(3.22, 3.42, s) * (1 - smooth(3.88, 4.08, s))
    if typing > .01:
        rr(d, (sx + 18, chat_top + 280, sx + 92, chat_top + 319), 17, c((31, 39, 58), 245))
        typing_dots(d, sx + 35, chat_top + 296, (s * 1.5) % 1, 1)

    q2 = appear(s, 3.92, .34)
    phone_bubble(d, (sx + 18, chat_top + 280, sx + 286, chat_top + 331),
                 ["Коли хочете запустити?"], q2, False, "14:33")
    answer2 = appear(s, 4.55, .32)
    phone_bubble(d, (sx + 166, chat_top + 344, sx + 365, chat_top + 392),
                 ["Цього місяця"], answer2, True, "14:33", True)

    done = appear(s, 5.18, .42)
    qy = chat_top + 406
    qoff = (1 - out_back(done)) * 24
    if done > .01:
        rr(gd, (sx + 16, qy - qoff - 4, sx + sw - 16, qy + 84 - qoff + 6), 20, c(MINT, 58))
        rr(d, (sx + 16, qy - qoff, sx + sw - 16, qy + 84 - qoff), 18,
           c((19, 47, 42), 250), c(MINT, 150), 2)
        d.ellipse((sx + 34, qy + 19 - qoff, sx + 78, qy + 63 - qoff), fill=c(MINT, 245))
        checkmark(d, sx + 56, qy + 41 - qoff, 18, c((10, 28, 24), 255), 4)
        text(d, (sx + 94, qy + 14 - qoff), "Лід кваліфіковано", 17, c(INK, 250), True)
        text(d, (sx + 94, qy + 40 - qoff), "VLX-0284 · передано Богдану", 13, c((175, 226, 205), 235))
        text(d, (sx + sw - 34, qy + 61 - qoff), "14:33", 11, c((175, 226, 205), 205), False, "ra")

    # Composer persists like a real chat surface.
    d.rectangle((sx, chat_bottom, sx + sw, sy + sh), fill=c((20, 26, 42), 255))
    d.ellipse((sx + 16, chat_bottom + 15, sx + 54, chat_bottom + 53), outline=c(MUTED, 110), width=2)
    text(d, (sx + 35, chat_bottom + 34), "+", 23, c(MUTED, 190), False, "mm")
    rr(d, (sx + 65, chat_bottom + 10, sx + sw - 58, chat_bottom + 57), 22, c((33, 41, 60), 255))
    text(d, (sx + 84, chat_bottom + 25), "Повідомлення", 14, c(MUTED, 175))
    d.ellipse((sx + sw - 49, chat_bottom + 14, sx + sw - 11, chat_bottom + 52), fill=c((37, 146, 215), 255))
    d.line((sx + sw - 30, chat_bottom + 24, sx + sw - 30, chat_bottom + 39), fill=c(INK, 240), width=3)
    d.arc((sx + sw - 36, chat_bottom + 28, sx + sw - 24, chat_bottom + 44), 0, 180, fill=c(INK, 240), width=2)

    # Native notification arrives first; tapping it reveals the chat beneath.
    notification_in = appear(s, .02, .28)
    notification_out = smooth(.92, 1.34, s)
    notification_a = notification_in * (1 - notification_out)
    if notification_a > .01:
        ny = sy + 47 - notification_out * 30
        panel_shadow(gd, (sx + 12, ny, sx + sw - 12, ny + 112), 24, 75)
        rr(d, (sx + 12, ny, sx + sw - 12, ny + 112), 24, c((43, 48, 62), 248), c(INK, 35), 1)
        d.ellipse((sx + 29, ny + 18, sx + 69, ny + 58), fill=c((37, 146, 215), 255))
        paper_plane(d, sx + 49, ny + 38, 20, c(INK, 255))
        text(d, (sx + 82, ny + 17), "Veblix Асистент", 15, c(INK, 250), True)
        text(d, (sx + sw - 31, ny + 18), "зараз", 11, c(MUTED, 210), False, "ra")
        text(d, (sx + 29, ny + 70), "Бачу заявку «Сайт + бот».", 14, c(INK, 242), True)
        text(d, (sx + 29, ny + 91), "Уточню 2 питання — це займе 30 секунд.", 13, c((201, 207, 219), 230))
        tap = smooth(.76, .9, s) * (1 - smooth(.9, 1.2, s))
        if tap > .01:
            radius = 8 + 32 * smooth(.76, 1.2, s)
            tx, ty = sx + sw - 70, ny + 56
            d.ellipse((tx - radius, ty - radius, tx + radius, ty + radius), outline=c(CYAN, 180 * tap), width=3)

    # Same qualified packet becomes the first execution in scene three.
    leave = smooth(6.72, 8.22, s)
    if leave > .01:
        start_x, start_y = sx + sw - 30, qy + 42 - qoff
        packet_x = mix(start_x, 630, leave); packet_y = mix(start_y, 182, leave)
        d.line((start_x, start_y, packet_x, packet_y), fill=c(MINT, 88), width=2)
        glow_dot(gd, d, packet_x, packet_y, 7, MINT, 1 - .2 * exit_p)

    composite_scene(frame, layer, glow, alpha)


def flow_node(d, gd, x, y, radius, label, icon, active, accent):
    fill = tuple(int(mix(PANEL_2[i], accent[i], active * .33)) for i in range(3))
    if active > .02:
        gd.ellipse((x - radius - 12, y - radius - 12, x + radius + 12, y + radius + 12),
                   fill=c(accent, 100 * active))
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=c(fill, 245),
              outline=c(accent, 70 + 170 * active), width=3)
    text(d, (x, y - 4), icon, 17, c(INK, 235), True, "mm")
    text(d, (x, y + radius + 18), label, 11, c(accent if active > .55 else MUTED, 235), True, "ma")


def partial_polyline(draw, points, progress, fill, width):
    progress = clamp(progress)
    if progress <= 0 or len(points) < 2:
        return
    lengths = []
    total = 0.0
    for a, b in zip(points, points[1:]):
        length = math.dist(a, b)
        lengths.append(length)
        total += length
    remaining = total * progress
    out = [points[0]]
    for a, b, length in zip(points, points[1:], lengths):
        if remaining >= length:
            out.append(b)
            remaining -= length
        else:
            p = remaining / max(length, .001)
            out.append((mix(a[0], b[0], p), mix(a[1], b[1], p)))
            break
    if len(out) >= 2:
        draw.line(out, fill=fill, width=width, joint="curve")


def draw_automation(frame: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    layer, d, glow, gd = scene_canvas()
    s = t - 16
    enter = smooth(-.35, .2, s)
    x = 548 + (1 - enter) * 28
    y = 48 + (1 - enter) * 16
    w, h = 680, 620
    panel_shadow(gd, (x, y, x + w, y + h), 28, 160, MINT)
    rr(d, (x, y, x + w, y + h), 28, c((19, 22, 29), 255), c((122, 132, 151), 90), 2)

    # Real automation app chrome.
    rr(d, (x + 1, y + 1, x + w - 1, y + 64), 27, c((28, 32, 41), 255))
    d.rectangle((x + 1, y + 38, x + w - 1, y + 65), fill=c((28, 32, 41), 255))
    rr(d, (x + 18, y + 14, x + 54, y + 50), 10, c((34, 44, 62), 255))
    text(d, (x + 36, y + 32), "V", 17, c(MINT, 245), True, "mm")
    text(d, (x + 68, y + 16), "Veblix Flow", 17, c(INK, 245), True)
    text(d, (x + 68, y + 39), "Сайт → Telegram → CRM", 11, c(MUTED, 210))
    rr(d, (x + w - 246, y + 16, x + w - 130, y + 48), 15, c((22, 48, 41), 255), c(MINT, 90), 1)
    d.ellipse((x + w - 230, y + 27, x + w - 220, y + 37), fill=c(MINT, 245))
    text(d, (x + w - 210, y + 24), "АКТИВНА", 11, c((162, 231, 203), 245), True)
    rr(d, (x + w - 116, y + 14, x + w - 18, y + 50), 13, c((68, 79, 221), 255))
    text(d, (x + w - 67, y + 26), "Запустити", 12, c(INK, 245), True, "ma")

    sidebar_w = 118
    d.rectangle((x + 1, y + 64, x + sidebar_w, y + h - 1), fill=c((23, 26, 34), 255))
    d.line((x + sidebar_w, y + 64, x + sidebar_w, y + h - 1), fill=c((122, 132, 151), 42), width=1)
    text(d, (x + 18, y + 87), "РОБОЧИЙ ПРОСТІР", 9, c(MUTED, 180), True)
    side_items = (("scenario", "Сценарії"), ("runs", "Запуски"),
                  ("analytics", "Аналітика"), ("settings", "Налаштування"))
    analytics_motion = smooth(4.48, 5.03, s)
    analytics_p = 1.0 if analytics_motion >= .4 else 0.0
    for i, (icon_kind, label) in enumerate(side_items):
        iy = y + 111 + i * 52
        active = (i == 0 and analytics_p < .5) or (i == 2 and analytics_p >= .5)
        if active:
            rr(d, (x + 10, iy - 7, x + sidebar_w - 10, iy + 32), 11,
               c((39, 45, 66), 255), c(INDIGO if i == 0 else MINT, 70), 1)
        icon_color = c(INDIGO if i == 0 else MINT if i == 2 else MUTED, 235)
        product_icon(d, x + 24, iy + 7, icon_kind, icon_color)
        text(d, (x + 43, iy), label, 12, c(INK if active else MUTED, 230), True)
    text(d, (x + 18, y + h - 63), "DEMO WORKSPACE", 9, c(MUTED, 165), True)
    text(d, (x + 18, y + h - 43), "bogdan@veblix", 11, c((193, 198, 212), 210))

    main_x, main_y = x + sidebar_w + 1, y + 65
    main_w, main_h = w - sidebar_w - 2, h - 66
    d.rectangle((main_x, main_y, main_x + main_w, main_y + main_h), fill=c((15, 18, 25), 255))

    workflow_a = 1 - analytics_p
    if workflow_a > .01:
        # Canvas header and real execution metadata.
        text(d, (main_x + 18, main_y + 17), "Кваліфікація нового ліда", 16, c(INK, 245 * workflow_a), True)
        text(d, (main_x + 18, main_y + 42), "Останній запуск: VLX-0284 · 14:33:23", 11, c(MUTED, 205 * workflow_a))
        rr(d, (main_x + main_w - 146, main_y + 14, main_x + main_w - 18, main_y + 45), 14,
           c((22, 48, 41), 245 * workflow_a), c(MINT, 80 * workflow_a), 1)
        text(d, (main_x + main_w - 82, main_y + 25), "УСПІШНО · 1.8с", 10, c((162, 231, 203), 235 * workflow_a), True, "ma")

        canvas_y = main_y + 64
        d.rectangle((main_x, canvas_y, main_x + main_w, main_y + 284), fill=c((17, 21, 30), 255 * workflow_a))
        for gx in range(int(main_x + 12), int(main_x + main_w), 28):
            d.line((gx, canvas_y, gx, main_y + 284), fill=c((120, 133, 167), 14 * workflow_a), width=1)
        for gy in range(int(canvas_y + 10), int(main_y + 284), 28):
            d.line((main_x, gy, main_x + main_w, gy), fill=c((120, 133, 167), 14 * workflow_a), width=1)

        node_y = canvas_y + 91
        node_xs = [main_x + 34 + i * 104 for i in range(5)]
        node_data = [
            ("form", "Форма", "Webhook", INDIGO),
            ("verify", "Перевірка", "контакту", AMBER),
            ("telegram", "Telegram", "2 питання", CYAN),
            ("crm", "CRM", "створити лід", (177, 118, 255)),
            ("manager", "Менеджер", "повідомити", MINT),
        ]
        route = smooth(.55, 3.55, s)
        centres = [(nx + 43, node_y + 37) for nx in node_xs]
        for a, b in zip(centres, centres[1:]):
            d.line((a[0] + 43, a[1], b[0] - 43, b[1]), fill=c((102, 112, 137), 85 * workflow_a), width=3)
        for i, (nx, data) in enumerate(zip(node_xs, node_data)):
            icon_kind, name, sub, col = data
            active = smooth(i / 5, (i + .72) / 5, route)
            if active > .02:
                gd.rounded_rectangle((nx - 4, node_y - 4, nx + 90, node_y + 79), radius=18,
                                     fill=c(col, 42 * active * workflow_a))
            rr(d, (nx, node_y, nx + 86, node_y + 74), 15, c((29, 34, 46), 255 * workflow_a),
               c(col, (190 if active > .55 else 65) * workflow_a), 2 if active > .55 else 1)
            d.ellipse((nx + 12, node_y + 11, nx + 42, node_y + 41), fill=c(col, (245 if active > .2 else 165) * workflow_a))
            node_icon_color = c((10, 13, 19), 245 * workflow_a)
            if icon_kind == "verify":
                checkmark(d, nx + 27, node_y + 26, 9, node_icon_color, 3)
            elif icon_kind == "telegram":
                paper_plane(d, nx + 27, node_y + 26, 13, node_icon_color)
            else:
                node_letters = {"form": "F", "crm": "C", "manager": "B"}
                text(d, (nx + 27, node_y + 26), node_letters[icon_kind], 13,
                     node_icon_color, True, "mm")
            text(d, (nx + 10, node_y + 48), name, 11, c(INK, 238 * workflow_a), True)
            text(d, (nx + 10, node_y + 62), sub, 9, c(MUTED, 190 * workflow_a))
            if active > .82:
                d.ellipse((nx + 70, node_y + 9, nx + 82, node_y + 21), fill=c(MINT, 245 * workflow_a))
                checkmark(d, nx + 76, node_y + 15, 5, c((15, 24, 22), 255 * workflow_a), 2)
        # Moving packet above the real connector path.
        packet_segment = clamp(route) * (len(centres) - 1)
        seg = min(len(centres) - 2, int(packet_segment))
        local = packet_segment - seg
        px = mix(centres[seg][0], centres[seg + 1][0], local); py = centres[seg][1]
        glow_dot(gd, d, px, py, 5.5, MINT, workflow_a)

        # Execution log + exact CRM record for the same lead.
        lower_y = main_y + 298
        rr(d, (main_x + 14, lower_y, main_x + 300, main_y + main_h - 14), 16,
           c((23, 27, 36), 255 * workflow_a), c((122, 132, 151), 42 * workflow_a), 1)
        text(d, (main_x + 30, lower_y + 14), "Журнал виконання", 13, c(INK, 240 * workflow_a), True)
        log_lines = [
            ("14:32:07", "Заявку отримано"),
            ("14:32:08", "Контакт перевірено"),
            ("14:33:21", "Кваліфікацію завершено"),
            ("14:33:22", "Створено лід VLX-0284"),
            ("14:33:23", "Богдана повідомлено"),
        ]
        for i, (stamp, value) in enumerate(log_lines):
            la = appear(s, .75 + i * .5, .28) * workflow_a
            ly = lower_y + 44 + i * 31
            d.ellipse((main_x + 30, ly + 4, main_x + 40, ly + 14), fill=c(MINT, 240 * la))
            text(d, (main_x + 50, ly), stamp, 10, c(MUTED, 200 * la), True)
            text(d, (main_x + 112, ly), value, 11, c((211, 216, 228), 230 * la))

        crm_p = appear(s, 3.0, .48) * workflow_a
        if crm_p > .01:
            cx = main_x + 314; cy = lower_y
            rr(gd, (cx - 3, cy - 3, main_x + main_w - 14, main_y + main_h - 11), 18, c(INDIGO, 40))
            rr(d, (cx, cy, main_x + main_w - 14, main_y + main_h - 14), 16,
               c((25, 30, 42), 255), c(INDIGO, 90), 1)
            text(d, (cx + 18, cy + 14), "CRM · VLX-0284", 13, c(VIOLET, 240), True)
            d.ellipse((cx + 18, cy + 45, cx + 60, cy + 87), fill=c((244, 180, 92), 245))
            text(d, (cx + 39, cy + 66), "О", 16, c((45, 34, 23), 250), True, "mm")
            text(d, (cx + 74, cy + 43), "Олена", 15, c(INK, 245), True)
            text(d, (cx + 74, cy + 65), "@olena_demo", 11, c(MUTED, 205))
            crm_rows = (("Послуга", "Сайт + бот"), ("Бюджет", "$500–1000"), ("Запуск", "цього місяця"))
            for i, (label, value) in enumerate(crm_rows):
                ry = cy + 104 + i * 30
                text(d, (cx + 18, ry), label, 10, c(MUTED, 190), True)
                text(d, (main_x + main_w - 32, ry), value, 11, c(INK, 230), True, "ra")
            rr(d, (cx + 18, cy + 200, main_x + main_w - 32, cy + 232), 13, c((22, 48, 41), 245))
            text(d, ((cx + 18 + main_x + main_w - 32) / 2, cy + 211), "КВАЛІФІКОВАНО", 10, c(MINT, 240), True, "ma")

    # Analytics is a real app tab with date range, axes, funnel and demo-data label.
    if analytics_p > .01:
        aoff = (1 - out_back(analytics_motion)) * 22
        ax, ay = main_x, main_y + aoff
        d.rectangle((ax, ay, ax + main_w, y + h - 1), fill=c((16, 19, 26), 255 * analytics_p))
        text(d, (ax + 18, ay + 17), "Аналітика продажів", 17, c(INK, 245 * analytics_p), True)
        rr(d, (ax + 195, ay + 14, ax + 280, ay + 43), 13, c((35, 40, 52), 245 * analytics_p))
        text(d, (ax + 237, ay + 24), "ДЕМО-ДАНІ", 9, c(MUTED, 210 * analytics_p), True, "ma")
        rr(d, (ax + main_w - 162, ay + 12, ax + main_w - 18, ay + 45), 13, c((29, 34, 45), 255 * analytics_p), c((122, 132, 151), 45 * analytics_p), 1)
        text(d, (ax + main_w - 98, ay + 24), "01–30 червня", 10,
             c((213, 218, 230), 230 * analytics_p), True, "ma")
        draw_chevron(d, ax + main_w - 42, ay + 24,
                     c((213, 218, 230), 210 * analytics_p), "down")

        metrics = (("48", "Заявок", "+14%", INDIGO), ("27", "Кваліфіковано", "+8%", MINT),
                   ("56%", "Конверсія", "+5%", CYAN), ("38с", "Перша відповідь", "−12с", AMBER))
        for i, (value, label, delta, col) in enumerate(metrics):
            mx = ax + 18 + i * 132
            rr(d, (mx, ay + 63, mx + 120, ay + 132), 14, c((25, 29, 39), 255 * analytics_p), c((122, 132, 151), 38 * analytics_p), 1)
            text(d, (mx + 13, ay + 74), value, 22, c(col, 245 * analytics_p), True)
            text(d, (mx + 13, ay + 103), label, 9, c(MUTED, 205 * analytics_p), True)
            text(d, (mx + 108, ay + 76), delta, 9, c(MINT, 220 * analytics_p), True, "ra")

        chart = (ax + 18, ay + 151, ax + 349, ay + 335)
        rr(d, chart, 16, c((24, 28, 38), 255 * analytics_p), c((122, 132, 151), 38 * analytics_p), 1)
        text(d, (chart[0] + 16, chart[1] + 14), "Заявки за 30 днів", 12, c(INK, 230 * analytics_p), True)
        for i, label in enumerate(("0", "6", "12", "18")):
            yy = chart[3] - 31 - i * 34
            d.line((chart[0] + 38, yy, chart[2] - 14, yy), fill=c((122, 132, 151), 32 * analytics_p), width=1)
            text(d, (chart[0] + 28, yy - 5), label, 9, c(MUTED, 150 * analytics_p), False, "ra")
        values = [.82, .68, .74, .56, .61, .42, .26, .18]
        pts = [(chart[0] + 42 + i * 38, chart[1] + 56 + value * 96) for i, value in enumerate(values)]
        chart_p = smooth(5.0, 6.2, s)
        partial_polyline(gd, pts, chart_p, c(MINT, 45 * analytics_p), 10)
        partial_polyline(d, pts, chart_p, c(MINT, 235 * analytics_p), 4)
        count = max(1, min(len(pts), int(math.ceil(chart_p * len(pts)))))
        for px, py in pts[:count]:
            d.ellipse((px - 4, py - 4, px + 4, py + 4), fill=c(MINT, 245 * analytics_p))

        funnel = (ax + 364, ay + 151, ax + main_w - 18, ay + 335)
        rr(d, funnel, 16, c((24, 28, 38), 255 * analytics_p), c((122, 132, 151), 38 * analytics_p), 1)
        text(d, (funnel[0] + 16, funnel[1] + 14), "Воронка", 12, c(INK, 230 * analytics_p), True)
        stages = (("1 284", "відвідування", 1.0), ("48", "заявок", .76), ("27", "кваліфіковано", .56), ("11", "дзвінків", .38))
        for i, (value, label, scale) in enumerate(stages):
            fy = funnel[1] + 47 + i * 31
            fw = (funnel[2] - funnel[0] - 34) * scale
            rr(d, (funnel[0] + 16, fy, funnel[0] + 16 + fw, fy + 23), 8, c((68, 79, 221), (180 + i * 18) * analytics_p))
            text(d, (funnel[0] + 24, fy + 6), value, 10, c(INK, 235 * analytics_p), True)
            text(d, (funnel[2] - 16, fy + 6), label, 9, c(MUTED, 190 * analytics_p), False, "ra")

        recommendation = smooth(5.75, 6.45, s) * analytics_p
        ry = ay + 354
        if recommendation > .01:
            rr(gd, (ax + 14, ry - 4, ax + main_w - 14, y + h - 14), 18, c(AMBER, 48))
            rr(d, (ax + 18, ry, ax + main_w - 18, y + h - 18), 16,
               c((38, 32, 26), 255), c(AMBER, 105), 1)
            d.ellipse((ax + 34, ry + 18, ax + 74, ry + 58), fill=c(AMBER, 245))
            text(d, (ax + 54, ry + 38), "!", 19, c((43, 31, 18), 255), True, "mm")
            text(d, (ax + 90, ry + 14), "Рекомендація на наступний місяць", 12, c(AMBER, 240), True)
            text(d, (ax + 90, ry + 38), "Приберіть поле «Коментар» на мобільних — воно дає 18% відмов.", 12,
                 c(INK, 238), True)
            text(d, (ax + 90, ry + 59), "Запустіть A/B тест на 14 днів і порівняйте конверсію.", 11,
                 c((205, 196, 182), 220))

    composite_scene(frame, layer, glow, alpha)


def render_frame(t: float) -> Image.Image:
    t = clamp(t, 0, DURATION)
    frame = BASE.copy()
    ambience(frame, t)
    # Crossfades straddle the exact 8s / 16s copy changes, so the outgoing
    # service is still recognisable immediately before the next title appears.
    a1 = 1 - smooth(7.65, 8.35, t)
    a2 = smooth(7.65, 8.35, t) * (1 - smooth(15.65, 16.35, t))
    a3 = smooth(15.65, 16.35, t)
    draw_browser(frame, t, a1)
    draw_chat(frame, t, a2)
    draw_automation(frame, t, a3)
    # Cinematic edge vignette; never fade to black, so every scrub position is useful.
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    vd.rectangle((0, 0, W, 34), fill=(0, 0, 0, 45))
    vd.rectangle((0, H - 42, W, H), fill=(0, 0, 0, 58))
    frame.alpha_composite(vignette.filter(ImageFilter.GaussianBlur(22)))
    return frame.convert("RGB")


def save_stills(times: list[float], output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    for t in times:
        path = output_dir / f"hero-{t:05.2f}.png"
        render_frame(t).save(path, optimize=True)
        print(path)


def render_video(output: Path):
    output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = "/Users/macbook/.local/bin/ffmpeg"
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-g", "1",
        "-keyint_min", "1", "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(output),
    ]
    proc = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    total = DURATION * FPS
    try:
        for index in range(total):
            proc.stdin.write(render_frame(index / FPS).tobytes())
            if index % FPS == 0:
                print(f"render {index // FPS:02d}/{DURATION}s", file=sys.stderr)
    finally:
        proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg render failed")
    poster_dir = ROOT / "assets/img"
    poster_dir.mkdir(parents=True, exist_ok=True)
    for timestamp, names in DESKTOP_POSTERS.items():
        still = render_frame(timestamp)
        for name in names:
            still.save(poster_dir / name, quality=92, optimize=True)
    print(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--stills", nargs="*", type=float, help="Render selected timeline positions instead of MP4")
    parser.add_argument("--stills-dir", type=Path, default=ROOT / ".hero-preview")
    args = parser.parse_args()
    if args.stills is not None:
        save_stills(args.stills or [0, 4.5, 8, 12, 16, 21, 23.8], args.stills_dir)
    else:
        render_video(args.output)


if __name__ == "__main__":
    main()
