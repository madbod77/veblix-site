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
    for x in range(0, W + 1, 64):
        d.line((x, 0, x, H), fill=(90, 108, 210, 10), width=1)
    for y in range(0, H + 1, 64):
        d.line((0, y, W, y), fill=(90, 108, 210, 9), width=1)
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
    ad.ellipse((cx - 310, cy - 250, cx + 310, cy + 250), fill=c(INDIGO, 52 * indigo_alpha))
    ad.ellipse((790 - 340, 350 - 280, 790 + 340, 350 + 280), fill=c(MINT, 50 * mint_p))
    ad.ellipse((1060 - 190, 210 - 180, 1060 + 190, 210 + 180), fill=c(CYAN, 21))
    frame.alpha_composite(aura.filter(ImageFilter.GaussianBlur(92)))
    d = ImageDraw.Draw(frame, "RGBA")
    for i, (x, y, r, phase) in enumerate(STARS):
        alpha = 22 + 24 * (.5 + .5 * math.sin(t * .72 + phase))
        col = MINT if mint_p > .55 and i % 4 == 0 else VIOLET
        d.ellipse((x - r, y - r, x + r, y + r), fill=c(col, alpha))
    # Slow scanning beam makes scroll movement visible even between UI beats.
    beam_x = (t / DURATION) * (W + 420) - 210
    beam = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beam)
    bd.polygon([(beam_x - 80, 0), (beam_x + 70, 0), (beam_x + 220, H), (beam_x + 40, H)],
               fill=c(MINT if mint_p > .5 else INDIGO, 18))
    frame.alpha_composite(beam.filter(ImageFilter.GaussianBlur(28)))


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


def draw_browser(frame: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    layer, d, glow, gd = scene_canvas()
    build = smooth(.15, 2.65, t)
    exit_p = smooth(6.85, 8.0, t)
    x = 570 - 90 * exit_p
    y = 118 - 34 * exit_p
    w, h = 570, 420
    shell_a = int(85 + 155 * build)
    rr(gd, (x - 8, y - 8, x + w + 8, y + h + 8), 34, c(INDIGO, 80))
    rr(d, (x, y, x + w, y + h), 26, c(PANEL, shell_a), c(VIOLET, 80 + 80 * build), 2)
    # Browser chrome
    rr(d, (x + 18, y + 16, x + w - 18, y + 55), 14, c(PANEL_2, 230 * build), c(VIOLET, 35), 1)
    for i, col in enumerate(((255, 112, 128), AMBER, MINT)):
        d.ellipse((x + 34 + i * 18, y + 31, x + 42 + i * 18, y + 39), fill=c(col, 170 * build))
    rr(d, (x + 128, y + 25, x + 386, y + 46), 10, c(BG, 180 * build), c(VIOLET, 30), 1)
    text(d, (x + 150, y + 29), "veblix.site", 12, c(MUTED, 210 * build))
    d.ellipse((x + 365, y + 32, x + 372, y + 39), outline=c(MINT, 190 * build), width=2)

    # Components fly into their final layout.
    component_specs = [
        ((x + 30, y + 76, x + 325, y + 270), (x - 170, y + 240, x + 125, y + 434)),
        ((x + 345, y + 76, x + 540, y + 270), (x + 510, y - 130, x + 705, y + 64)),
        ((x + 30, y + 292, x + 190, y + 385), (x + 70, y + 510, x + 230, y + 603)),
        ((x + 205, y + 292, x + 365, y + 385), (x + 650, y + 340, x + 810, y + 433)),
        ((x + 380, y + 292, x + 540, y + 385), (x + 270, y - 170, x + 430, y - 77)),
    ]
    boxes = []
    for target, start in component_specs:
        p = out_back(smooth(.25, 2.35, t))
        boxes.append(tuple(mix(start[i], target[i], p) for i in range(4)))

    # Hero block
    b = boxes[0]
    rr(d, b, 18, c((16, 22, 48), 225), c(VIOLET, 58), 1)
    tx, ty = b[0] + 22, b[1] + 23
    text(d, (tx, ty), "ВАШ БІЗНЕС", 14, c(VIOLET, 220), True)
    text(d, (tx, ty + 28), "ПРАЦЮЄ ОНЛАЙН", 23, c(INK, 245), True)
    d.rounded_rectangle((tx, ty + 68, tx + 226, ty + 76), 4, fill=c(MUTED, 90))
    d.rounded_rectangle((tx, ty + 84, tx + 184, ty + 92), 4, fill=c(MUTED, 55))
    cta = (tx, ty + 118, tx + 196, ty + 158)
    rr(gd, (cta[0] - 4, cta[1] - 4, cta[2] + 4, cta[3] + 4), 15, c(INDIGO, 90))
    rr(d, cta, 12, c(INDIGO, 245), c(VIOLET, 180), 1)
    text(d, ((cta[0] + cta[2]) / 2, cta[1] + 13), "ОТРИМАТИ ЗАЯВКУ", 12, c(INK, 245), True, "ma")

    # Visual proof card
    b = boxes[1]
    rr(d, b, 18, c((12, 18, 39), 232), c(CYAN, 65), 1)
    bx, by = b[0] + 20, b[1] + 23
    text(d, (bx, by), "САЙТ ГОТОВИЙ", 12, c(CYAN, 210), True)
    d.arc((bx + 25, by + 40, bx + 125, by + 140), -90, 235, fill=c(INDIGO, 210), width=8)
    d.arc((bx + 38, by + 53, bx + 112, by + 127), -90, 150 + 70 * smooth(2, 4, t), fill=c(MINT, 220), width=7)
    text(d, (bx + 75, by + 78), "24/7", 17, c(INK, 235), True, "mm")
    text(d, (bx + 75, by + 148), "приймає заявки", 11, c(MUTED, 190), False, "ma")

    # Three proof tiles
    tile_labels = (("01", "СТРУКТУРА"), ("02", "ДОВІРА"), ("03", "ЗАЯВКА"))
    for b, (num, label) in zip(boxes[2:], tile_labels):
        rr(d, b, 15, c(PANEL_2, 225), c(VIOLET, 45), 1)
        text(d, (b[0] + 16, b[1] + 15), num, 12, c(VIOLET, 210), True)
        text(d, (b[0] + 16, b[1] + 46), label, 12, c(INK, 220), True)
        d.rounded_rectangle((b[0] + 16, b[1] + 68, b[2] - 16, b[1] + 73), 3, fill=c(MUTED, 45))

    # Cursor + click.  Exact CTA centre is retained after layout settles.
    cp = smooth(3.05, 4.15, t)
    cx = mix(x + 1030, cta[0] + 156, cp)
    cy = mix(y + 30, cta[1] + 20, cp)
    cursor(d, cx, cy, appear(t, 2.8) * (1 - smooth(5.1, 5.55, t)))
    click = smooth(4.12, 4.32, t) * (1 - smooth(4.32, 4.88, t))
    if click > .01:
        radius = 8 + 34 * smooth(4.12, 4.88, t)
        d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=c(MINT, 210 * click), width=3)

    # A real, readable conversion receipt replaces the old abstract orb.
    lead_p = out_back(appear(t, 4.45, .55))
    lead_exit = smooth(6.5, 7.85, t)
    lx = mix(x + 178, x + 110, lead_exit)
    ly = mix(y + 337, y + 500, lead_exit)
    lw, lh = 300, 66
    if lead_p > .01:
        off = (1 - lead_p) * 38
        rr(gd, (lx - 6, ly - off - 6, lx + lw + 6, ly + lh - off + 6), 19, c(MINT, 90))
        rr(d, (lx, ly - off, lx + lw, ly + lh - off), 17, c((13, 31, 31), 245), c(MINT, 170), 2)
        d.ellipse((lx + 17, ly + 17 - off, lx + 49, ly + 49 - off), fill=c(MINT, 240))
        checkmark(d, lx + 33, ly + 33 - off, 15, c(BG, 245), 4)
        text(d, (lx + 64, ly + 13 - off), "НОВА ЗАЯВКА", 12, c(MINT, 240), True)
        text(d, (lx + 64, ly + 34 - off), "Клієнт натиснув головну дію", 12, c(INK, 225))

    # Signal leaves the site and becomes the incoming message in scene two.
    signal_p = smooth(5.75, 8.05, t)
    sx = mix(cta[2] - 20, 710, signal_p)
    sy = mix(cta[1] + 20, 170, signal_p)
    if signal_p > .01:
        d.line((cta[2] - 20, cta[1] + 20, sx, sy), fill=c(MINT, 115), width=3)
        glow_dot(gd, d, sx, sy, 7, MINT, 1 - .2 * exit_p)

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


def draw_chat(frame: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    layer, d, glow, gd = scene_canvas()
    s = t - 8
    enter = smooth(-.8, .2, s)
    exit_p = smooth(6.85, 8.1, s)
    x = 625 + (1 - enter) * 90 - exit_p * 85
    y = 92 + (1 - enter) * 35 - exit_p * 20
    w, h = 500, 520
    rr(gd, (x - 9, y - 9, x + w + 9, y + h + 9), 35, c(CYAN, 70))
    rr(d, (x, y, x + w, y + h), 28, c(PANEL, 246), c(CYAN, 90), 2)
    rr(d, (x + 18, y + 16, x + w - 18, y + 70), 16, c(PANEL_2, 235), c(VIOLET, 45), 1)
    d.ellipse((x + 34, y + 29, x + 73, y + 68), fill=c((37, 146, 215), 245))
    paper_plane(d, x + 53, y + 48, 21, c(INK, 250))
    text(d, (x + 88, y + 28), "TELEGRAM-БОТ", 15, c(INK, 240), True)
    text(d, (x + 88, y + 50), "кваліфікує запит автоматично", 11, c(MUTED, 205))
    d.ellipse((x + w - 73, y + 36, x + w - 61, y + 48), fill=c(MINT, 245))
    text(d, (x + w - 53, y + 34), "ONLINE", 10, c(MINT, 225), True)

    a_user = appear(s, .35, .42)
    bubble(d, (x + 210, y + 90, x + 464, y + 139), INDIGO, VIOLET,
           "Хочу запустити сайт", INK, a_user, "right", 13, True)

    a_bot = appear(s, 1.05, .48)
    bubble(d, (x + 34, y + 157, x + 334, y + 207), PANEL_2, CYAN,
           "Який у вас бюджет?", INK, a_bot, "left", 13, True)
    chips_a = appear(s, 1.65, .5)
    chip_y = y + 219
    chip_specs = (("до $500", 34, 125), ("$500–1000", 137, 252), ("$1000+", 264, 357))
    for i, (label, x1, x2) in enumerate(chip_specs):
        selected = i == 1 and s > 2.4
        rr(d, (x + x1, chip_y, x + x2, chip_y + 36), 18,
           c(MINT if selected else PANEL_2, (230 if selected else 200) * chips_a),
           c(MINT if selected else VIOLET, (185 if selected else 65) * chips_a), 1)
        text(d, ((x + x1 + x + x2) / 2, chip_y + 11), label, 11,
             c(BG if selected else MUTED, 235 * chips_a), True, "ma")

    a_bot2 = appear(s, 2.85, .45)
    bubble(d, (x + 34, y + 281, x + 350, y + 331), PANEL_2, CYAN,
           "Коли потрібен запуск?", INK, a_bot2, "left", 13, True)
    a_answer = appear(s, 3.55, .42)
    bubble(d, (x + 254, y + 345, x + 464, y + 394), INDIGO, VIOLET,
           "Цього місяця", INK, a_answer, "right", 13, True)

    qualified = appear(s, 4.25, .58)
    qy = y + 420
    qoff = (1 - out_back(qualified)) * 26
    rr(gd, (x + 22, qy - qoff - 5, x + w - 22, qy + 72 - qoff + 5), 20, c(MINT, 80 * qualified))
    rr(d, (x + 22, qy - qoff, x + w - 22, qy + 72 - qoff), 18,
       c((12, 31, 30), 240 * qualified), c(MINT, 160 * qualified), 2)
    d.ellipse((x + 42, qy + 18 - qoff, x + 78, qy + 54 - qoff), fill=c(MINT, 240 * qualified))
    checkmark(d, x + 60, qy + 36 - qoff, 16, c(BG, 250 * qualified), 4)
    text(d, (x + 94, qy + 13 - qoff), "ЛІД КВАЛІФІКОВАНО", 12, c(MINT, 245 * qualified), True)
    text(d, (x + 94, qy + 36 - qoff), "Передано менеджеру з контекстом", 12, c(INK, 225 * qualified))
    # Human handoff avatar.
    d.ellipse((x + w - 79, qy + 18 - qoff, x + w - 43, qy + 54 - qoff),
              fill=c(VIOLET, 235 * qualified), outline=c(INK, 120 * qualified), width=2)
    d.ellipse((x + w - 67, qy + 26 - qoff, x + w - 55, qy + 38 - qoff), fill=c(INK, 220 * qualified))
    d.arc((x + w - 71, qy + 37 - qoff, x + w - 51, qy + 55 - qoff), 185, 355,
          fill=c(INK, 220 * qualified), width=3)

    # Pulse exits with the qualified lead and feeds the automation graph.
    leave = smooth(6.35, 8.15, s)
    if leave > .01:
        sx = mix(x + w - 42, 625, leave)
        sy = mix(qy + 36 - qoff, 238, leave)
        d.line((x + w - 42, qy + 36 - qoff, sx, sy), fill=c(MINT, 120), width=3)
        glow_dot(gd, d, sx, sy, 7, MINT, 1)

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
    enter = smooth(-.85, .25, s)
    x = 535 + (1 - enter) * 100
    y = 74 + (1 - enter) * 36
    w, h = 650, 555
    rr(gd, (x - 10, y - 10, x + w + 10, y + h + 10), 38, c(MINT, 70))
    rr(d, (x, y, x + w, y + h), 30, c(PANEL, 247), c(MINT, 105), 2)

    text(d, (x + 28, y + 24), "АВТОМАТИЗАЦІЯ", 15, c(INK, 240), True)
    text(d, (x + 28, y + 47), "кожен лід проходить один надійний маршрут", 11, c(MUTED, 205))
    rr(d, (x + w - 175, y + 23, x + w - 28, y + 51), 14, c((12, 32, 30), 235), c(MINT, 95), 1)
    d.ellipse((x + w - 158, y + 32, x + w - 148, y + 42), fill=c(MINT, 245))
    text(d, (x + w - 138, y + 29), "СИСТЕМА ПРАЦЮЄ", 10, c(MINT, 230), True)

    node_y = y + 152
    node_xs = [x + 82, x + 245, x + 408, x + 570]
    labels = ["ЛІД", "БОТ", "CRM", "ДІЯ"]
    icons = ["+1", "B", "C", "✓"]
    route = smooth(.35, 4.0, s)
    for a, b in zip(node_xs, node_xs[1:]):
        d.line((a + 37, node_y, b - 37, node_y), fill=c(FAINT, 95), width=4)
    partial_polyline(d, [(node_xs[0], node_y), (node_xs[-1], node_y)], route, c(MINT, 205), 4)
    for i, nx in enumerate(node_xs):
        active = smooth(i / 4, (i + .65) / 4, route)
        flow_node(d, gd, nx, node_y, 34, labels[i], icons[i], active, MINT)
    # Data packet moving across the workflow.
    packet_x = mix(node_xs[0], node_xs[-1], route)
    glow_dot(gd, d, packet_x, node_y, 6.5, MINT, 1)

    dash_p = smooth(2.35, 3.45, s)
    dx, dy, dw, dh = x + 28, y + 238, w - 56, 282
    doff = (1 - out_back(dash_p)) * 36
    rr(d, (dx, dy + doff, dx + dw, dy + dh + doff), 20, c(PANEL_2, 235 * dash_p), c(MINT, 65 * dash_p), 1)
    text(d, (dx + 22, dy + 18 + doff), "АНАЛІТИКА БІЗНЕСУ", 13, c(INK, 235 * dash_p), True)
    text(d, (dx + dw - 22, dy + 19 + doff), "останні 30 днів", 10, c(MUTED, 190 * dash_p), False, "ra")

    # Metrics become trustworthy receipts, not unlabeled glowing spheres.
    metrics = (("48", "ЗАЯВОК", INDIGO), ("27%", "КОНВЕРСІЯ", MINT), ("3", "РІШЕННЯ", AMBER))
    for i, (value, label, col) in enumerate(metrics):
        mx = dx + 22 + i * 180
        rr(d, (mx, dy + 54 + doff, mx + 160, dy + 116 + doff), 13, c(BG, 150 * dash_p), c(col, 55 * dash_p), 1)
        text(d, (mx + 14, dy + 64 + doff), value, 23, c(col, 240 * dash_p), True)
        text(d, (mx + 14, dy + 92 + doff), label, 9, c(MUTED, 210 * dash_p), True)

    chart_p = smooth(3.25, 5.4, s)
    chart = (dx + 24, dy + 143 + doff, dx + 355, dy + 247 + doff)
    for gy in range(4):
        yy = chart[1] + gy * 31
        d.line((chart[0], yy, chart[2], yy), fill=c(FAINT, 38 * dash_p), width=1)
    values = [.76, .62, .69, .45, .51, .28, .18]
    pts = []
    for i, value in enumerate(values):
        pts.append((chart[0] + i * ((chart[2] - chart[0]) / (len(values) - 1)), chart[1] + value * (chart[3] - chart[1])))
    partial_polyline(gd, pts, chart_p, c(MINT, 90), 10)
    partial_polyline(d, pts, chart_p, c(MINT, 235 * dash_p), 4)
    count = max(1, min(len(pts), int(math.ceil(chart_p * len(pts)))))
    for px, py in pts[:count]:
        d.ellipse((px - 4, py - 4, px + 4, py + 4), fill=c(MINT, 240 * dash_p), outline=c(INK, 100 * dash_p), width=1)

    decision = smooth(5.0, 6.15, s)
    qx, qy = dx + 378, dy + 143 + doff
    rr(gd, (qx - 5, qy - 5, dx + dw - 18, dy + 248 + doff), 18, c(AMBER, 75 * decision))
    rr(d, (qx, qy, dx + dw - 22, dy + 244 + doff), 16, c((34, 27, 22), 230 * decision), c(AMBER, 130 * decision), 2)
    text(d, (qx + 16, qy + 13), "РЕКОМЕНДАЦІЯ", 9, c(AMBER, 235 * decision), True)
    text(d, (qx + 16, qy + 36), "Підсилити", 16, c(INK, 240 * decision), True)
    text(d, (qx + 16, qy + 57), "рекламу сайту", 16, c(INK, 240 * decision), True)
    d.ellipse((dx + dw - 65, qy + 65, dx + dw - 35, qy + 95), fill=c(AMBER, 235 * decision))
    checkmark(d, dx + dw - 50, qy + 80, 13, c(BG, 250 * decision), 4)

    # Final pulse links the route to the recommendation card.
    final_p = smooth(5.45, 7.1, s)
    if final_p > .01:
        path = [(node_xs[-1], node_y + 34), (node_xs[-1], qy - 18), (dx + dw - 50, qy + 80)]
        partial_polyline(d, path, final_p, c(AMBER, 180), 3)
        if final_p < .99:
            # Approximate packet position along the two-piece path.
            if final_p < .55:
                pp = final_p / .55
                px, py = mix(path[0][0], path[1][0], pp), mix(path[0][1], path[1][1], pp)
            else:
                pp = (final_p - .55) / .45
                px, py = mix(path[1][0], path[2][0], pp), mix(path[1][1], path[2][1], pp)
            glow_dot(gd, d, px, py, 6, AMBER, 1)

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
