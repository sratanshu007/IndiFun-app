"""Premium gift set (original vector artwork, Lottie):
Tiranga, Taj Mahal, Tiger, Lion King, Emperor Crown, Fairy, Superbike, Supercar.

Run:  python3 make_premium.py      -> writes dist/<name>.json
"""
import math
import os
import random

from lottie_kit import (EASE, IN, LIN, OUT, Anim, Comp, anim_path, burst, confetti, ellipse, fill, glow, gradient, group,
                        heart_items, hexc, mask_of, mirror, path, polar, polygon, prop, rays, rect, ring_wave, smooth_path,
                        sparkle, star, stroke)

OUT_DIR = os.path.join(os.path.dirname(__file__), 'dist')
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 720, 1280


def fade(t0, t1, end, d=12):
    return Anim([(t0, 0), (t0 + d, 100), (end - d, 100), (end, 0)], LIN)


def lens(x0, y0, x1, y1, w):
    """Tapered stroke shape (thick at start, pointed at end) as a filled path."""
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    return smooth_path([(x0 + nx, y0 + ny), ((x0 + x1) / 2 + nx * 0.6, (y0 + y1) / 2 + ny * 0.6), (x1, y1),
                        ((x0 + x1) / 2 - nx * 0.6, (y0 + y1) / 2 - ny * 0.6), (x0 - nx, y0 - ny)], 0.2)


def fireworks(c, shots, n=30, radius=190):
    for i, (x, y, t0, cols) in enumerate(shots):
        c.layer([group([ellipse(9), fill(cols[1])])], p=Anim([(t0, (x + 20, H + 20)), (t0 + 16, (x, y))], OUT),
                o=Anim([(t0, 100), (t0 + 16, 100), (t0 + 17, 0)], LIN), ip=t0, op=t0 + 17, name='fx_rocket')
        b = t0 + 16
        glow(c, x, y, 150, cols[0], b, b + 24, peak=55)
        burst(c, x, y, b, n=n, radius=radius, colors=cols, size=(10, 17), dur=32, rnd=random.Random(100 + i), gravity=45)
        burst(c, x, y, b + 3, n=12, radius=radius * 0.55, colors=('#ffffff',), size=(7, 11), dur=24, rnd=random.Random(200 + i), shape='star', gravity=20)


# =====================================================================================
# BIG CATS: Lion King and Tiger share one head rig
# =====================================================================================
def big_cat(kind):
    c = Comp('lion' if kind == 'lion' else 'tiger', W, H, 5.0)
    E = c.op
    CX, CY = 360, 620
    rnd = random.Random(7 if kind == 'lion' else 8)
    aura = '#ffb703' if kind == 'lion' else '#ff6b00'
    rays(c, CX, CY, 24, 760, 46, '#ffd166' if kind == 'lion' else '#ffb347', 6, E, opacity=32, spin=50)
    glow(c, CX, CY, 520, aura, 0, E, peak=55)
    if kind == 'tiger':  # claw slash intro
        for k, x in enumerate((-110, 0, 110)):
            sl = path([(CX - 260 + x, 260), (CX + 220 + x, 980)], [(0, 0), (-80, -160)], [(80, 160), (0, 0)], closed=False)
            c.layer([group([sl, stroke('#ffffff', 16), {'ty': 'tm', 's': prop(Anim([(4 + k * 2, 0), (16 + k * 2, 100)], LIN)), 'e': prop(Anim([(k * 2, 0), (10 + k * 2, 100)], OUT)), 'o': prop(0), 'm': 1}])],
                    p=(0, 0), o=Anim([(0, 100), (18, 100), (24, 0)], LIN), ip=0, op=25, name='fx_slash')
        burst(c, CX, CY, 12, n=22, radius=420, colors=('#ffb347', '#ffffff', '#ff6b00'), size=(18, 30), shape='streak', dur=24)
    t_in = 10 if kind == 'tiger' else 0
    roar0, roar1 = 36, 78
    shake = [(roar0 + 2 + k * 3, (CX + (8 if k % 2 else -8), CY + (5 if k % 3 else -5))) for k in range(12)]
    pos = Anim([(t_in, (CX, CY + 60)), (t_in + 18, (CX, CY))] + shake + [(roar1, (CX, CY)), (E - 14, (CX, CY - 10)), (E, (CX, CY - 60))], EASE)
    sc = Anim([(t_in, 20), (t_in + 14, 108), (t_in + 20, 100), (roar0 + 6, 109), (roar1, 100), (100, 102), (118, 100), (E - 14, 100), (E, 80)], EASE)
    head = c.null(p=pos, s=sc, o=Anim([(t_in, 0), (t_in + 8, 100), (E - 10, 100), (E, 0)], LIN), ip=t_in)

    def L(shapes, **kw):
        kw.setdefault('ip', t_in)
        return c.layer(shapes, parent=head, **kw)

    pulse = Anim([(t_in, 100), (roar0, 100), (roar0 + 8, 116), (roar1, 100), (110, 104), (E, 100)], EASE)
    if kind == 'lion':
        rings = [(160, 330, 22, ('#c06a1f', '#5e2a0c'), 0), (150, 285, 20, ('#e0882e', '#86410f'), 0.5), (140, 240, 18, ('#f5aa4a', '#b5641c'), 0.25)]
        for ri, (r_in, r_out, n, (c_in, c_out), off) in enumerate(rings):
            tufts = []
            for k in range(n):
                a = (k + off) * 2 * math.pi / n - math.pi / 2
                dw = math.pi / n * 1.25
                pts = [polar(r_in, a - dw), polar((r_in + r_out) / 2 + 12, a - dw * 0.55), polar(r_out, a + 0.05),
                       polar((r_in + r_out) / 2 + 6, a + dw * 0.6), polar(r_in, a + dw), polar(r_in * 0.8, a)]
                tufts.append(group([smooth_path(pts, 0.22), gradient([(0, c_in), (1, c_out)], polar(r_in, a), polar(r_out, a))]))
            L([group(tufts)], s=pulse, r=Anim([(t_in, -6 + ri * 4), (E, 6 - ri * 4)], EASE))
    # ears
    if kind == 'lion':
        ear_out, ear_in = '#b8691f', '#f6c48c'
    else:
        ear_out, ear_in = '#1b1b1b', '#ffffff'
    L([group([ellipse(118, 118), fill('#e8590c' if kind == 'tiger' else ear_out)], p=(-150, -168)), group([ellipse(118, 118), fill('#e8590c' if kind == 'tiger' else ear_out)], p=(150, -168)),
       group([ellipse(70, 70), fill(ear_in)], p=(-148, -162)), group([ellipse(70, 70), fill(ear_in)], p=(148, -162))]
      + ([group([ellipse(118, 118), stroke('#1b1b1b', 10)], p=(-150, -168)), group([ellipse(118, 118), stroke('#1b1b1b', 10)], p=(150, -168))] if kind == 'tiger' else []))
    # face
    if kind == 'lion':
        face = smooth_path(mirror([(0, -182), (98, -168), (152, -96), (156, 8), (120, 100), (62, 152), (0, 168)]), 0.3)
        L([group([face, gradient([(0, '#f9cf86'), (0.55, '#eda75a'), (1, '#c97a2f')], (0, -182), (0, 168))])])
        L([group([ellipse(84, 200), fill('#fde1a9', 70)], p=(0, -40))])
        fur = [group([path([(sx * x, y), (sx * (x + 10), y + 26)], closed=False), stroke('#c97a2f', 3, 55)]) for sx in (1, -1) for x, y in ((20, -160), (44, -150), (68, -136), (110, -40), (124, 0), (116, 40))]
        L(fur)
    else:
        face = smooth_path(mirror([(0, -178), (104, -166), (166, -98), (182, 4), (156, 86), (96, 146), (0, 166)]), 0.3)
        L([group([face, gradient([(0, '#ffb35c'), (0.6, '#f97316'), (1, '#c2410c')], (0, -178), (0, 166))])])
        ruff_r = [(150, -18), (196, 26), (168, 40), (204, 82), (164, 92), (186, 128), (120, 132), (96, 150), (60, 120), (110, 60)]
        ruffs = [group([smooth_path(ruff_r, 0.12), fill('#fff8ef')]), group([smooth_path([(-x, y) for x, y in ruff_r], 0.12), fill('#fff8ef')])]
        L(ruffs)
        stripes = [lens(0, -176, 0, -112, 22), lens(-40, -170, -26, -118, 16), lens(40, -170, 26, -118, 16),
                   lens(-82, -160, -54, -126, 14), lens(82, -160, 54, -126, 14)]
        for sgn in (1, -1):
            stripes += [lens(sgn * 176, -40, sgn * 116, -24, 20), lens(sgn * 178, 6, sgn * 122, 12, 18), lens(sgn * 168, 50, sgn * 128, 48, 14),
                        lens(sgn * 130, -120, sgn * 100, -84, 14), lens(sgn * 22, -92, sgn * 10, -62, 9)]
        L([group([s, fill('#1c1410')]) for s in stripes])
        L([group([ellipse(84, 40), fill('#fff8ef', 92)], p=(-62, -78), r=-12), group([ellipse(84, 40), fill('#fff8ef', 92)], p=(62, -78), r=12)])
    # muzzle and chin
    cream = '#fde7c7' if kind == 'lion' else '#fff8ef'
    L([group([ellipse(96, 78), fill(cream)], p=(-44, 96)), group([ellipse(96, 78), fill(cream)], p=(44, 96)), group([ellipse(90, 58), fill(cream)], p=(0, 150))])
    L([group([ellipse(7), fill('#8b5a2b')], p=(sx * x, y)) for sx in (1, -1) for x, y in ((30, 88), (52, 98), (38, 110), (60, 116))])
    whisk = [group([path([(sx * 70, 100 + k * 10), (sx * (200 + k * 10), 84 + k * 22)], [(0, 0), (0, 0)], [(sx * 50, -4), (0, 0)], closed=False), stroke('#ffffff', 2.5, 70)]) for sx in (1, -1) for k in range(3)]
    L(whisk)
    # mouth (opens on roar)
    mopen = Anim([(t_in, (100, 0)), (roar0, (100, 0)), (roar0 + 7, (100, 100)), (roar1 - 8, (100, 100)), (roar1, (100, 0))], EASE)
    mouth = [group([ellipse(118, 96), fill('#3d0a0a')]), group([ellipse(70, 40), fill('#e5677d')], p=(0, 24)),
             group([path([(-44, -30), (-32, -30), (-38, 0)]), fill('#ffffff')]), group([path([(44, -30), (32, -30), (38, 0)]), fill('#ffffff')]),
             group([path([(-36, 38), (-26, 38), (-31, 14)]), fill('#ffffff')]), group([path([(36, 38), (26, 38), (31, 14)]), fill('#ffffff')])]
    L(mouth, p=(0, 132), a=(0, -40), s=mopen)
    L([group([path([(0, 72), (0, 100), (-26, 116), (0, 100), (26, 116)], closed=False), stroke('#5a2d14' if kind == 'lion' else '#1c1410', 5)])])
    # nose
    nose_col = ('#7a4120', '#3b1d0e') if kind == 'lion' else ('#f4a3a8', '#b5545c')
    L([group([smooth_path([(-40, 36), (40, 36), (0, 76)], 0.18), gradient([(0, nose_col[0]), (1, nose_col[1])], (0, 36), (0, 76))]),
       group([ellipse(16, 8), fill('#ffffff', 55)], p=(-12, 44))])
    # eyes (blink at frame 100)
    blink = Anim([(t_in, (100, 100)), (98, (100, 100)), (101, (100, 8)), (104, (100, 100))], EASE)
    iris = ('#ffe08a', '#d98f0a') if kind == 'lion' else ('#e9ff70', '#5f9e2f')
    for sx in (1, -1):
        eye = smooth_path([(-44, 4), (-6, -22), (44, -6), (6, 20)], 0.36)
        L([group([eye, gradient([(0, iris[0]), (1, iris[1])], (0, -22), (0, 20), radial=False), stroke('#2b1506', 6)]),
           group([ellipse(18, 34), fill('#120a04')], p=(0, -1)), group([ellipse(10), fill('#ffffff')], p=(8, -9)), group([ellipse(5), fill('#ffffff', 80)], p=(-8, 6))],
          p=(sx * 62, -38), r=sx * -8, s=blink)
        glow(c, sx * 62, -38, 60, iris[0], roar0, roar1, peak=70, parent=head)
        brow = path([(sx * 22, -70), (sx * 100, -86)], [(0, 0), (0, 0)], [(sx * 30, -16), (0, 0)], closed=False)
        L([group([brow, stroke('#5a2d14' if kind == 'lion' else '#1c1410', 9)])], p=Anim([(t_in, (0, 0)), (roar0, (0, 0)), (roar0 + 6, (0, 12)), (roar1, (0, 0))], EASE))
    if kind == 'lion':  # little royal crown
        cr = path([(-62, 14), (-66, -28), (-34, -4), (0, -46), (34, -4), (66, -28), (62, 14)])
        L([group([cr, gradient([(0, '#fff3b0'), (0.5, '#ffc300'), (1, '#9a6700')], (0, -46), (0, 14)), stroke('#7a4f00', 3)]),
           group([ellipse(14), fill('#ff4d6d')], p=(0, -6)), group([ellipse(10), fill('#4cc9f0')], p=(-36, 2)), group([ellipse(10), fill('#4cc9f0')], p=(36, 2))],
          p=(0, -214), r=Anim([(t_in, -10), (t_in + 20, 6), (t_in + 30, 0)], EASE))
    # roar shockwaves + sparks
    for k, col in enumerate(['#ffffff', aura, '#fff3b0']):
        ring_wave(c, CX, CY + 100, roar0 + 4 + k * 7, col, 120, 1100, 12, 26)
    burst(c, CX, CY, roar0 + 4, n=26, radius=520, colors=(aura, '#ffffff', '#fff3b0'), size=(14, 26), shape='streak', dur=30)
    for i in range(10):
        sparkle(c, rnd.uniform(70, 650), rnd.uniform(240, 1000), 20 + i * 11, 44, '#fff3b0')
    return c


# =====================================================================================
# EMPEROR CROWN
# =====================================================================================
def emperor_crown():
    c = Comp('emperor', W, H, 5.0)
    E = c.op
    CX, CY = 360, 600
    rnd = random.Random(31)
    rays(c, CX, CY, 28, 820, 40, '#ffe066', 14, E, opacity=38, spin=70)
    glow(c, CX, CY, 560, '#ffb703', 0, E, peak=60)
    glow(c, CX, CY - 60, 300, '#fff3b0', 20, E, peak=55)
    pos = Anim([(0, (CX, -260)), (24, (CX, CY + 26)), (30, (CX, CY - 18)), (36, (CX, CY)), (E - 14, (CX, CY - 8)), (E, (CX, CY - 80))], OUT)
    spin = Anim([(0, (100, 100)), (8, (20, 100)), (16, (100, 100)), (24, (24, 100)), (32, (100, 100)), (36, (104, 96)), (42, 100), (90, 103), (120, 100), (E - 12, 100), (E, 70)], EASE)
    n = c.null(p=pos, s=spin, r=Anim([(0, -16), (24, 5), (36, -2), (44, 0)], EASE), o=Anim([(0, 100), (E - 10, 100), (E, 0)], LIN))

    def L(shapes, **kw):
        return c.layer(shapes, parent=n, **kw)

    gold = lambda y0, y1: gradient([(0, '#fffbe0'), (0.25, '#ffd54f'), (0.6, '#e0a100'), (1, '#7a4f00')], (0, y0), (0, y1))
    cap = smooth_path([(-180, 10), (-168, -110), (-90, -196), (0, -214), (90, -196), (168, -110), (180, 10)], 0.25)
    L([group([cap, gradient([(0, '#d63384'), (0.6, '#8e1557'), (1, '#4a0a2e')], (-60, -200), (60, 10))])])
    arches = []
    for x0 in (-170, -60, 60, 170):
        arches.append(group([path([(x0, -10), (0, -232)], [(0, 0), (x0 * 0.55, 0)], [(0, -150), (0, 0)], closed=False), stroke('#b8860b', 18)]))
        arches.append(group([path([(x0, -10), (0, -232)], [(0, 0), (x0 * 0.55, 0)], [(0, -150), (0, 0)], closed=False), stroke('#fff3b0', 5, 90)]))
    L(arches)
    L([group([ellipse(64), gradient([(0, '#fffbe0'), (1, '#c99400')], (-20, -20), (30, 30))], p=(0, -250)), group([star(4, 34, 8), fill('#ffffff')], p=(0, -298))])
    body = path([(-225, 70), (-225, -10), (-210, -160), (-155, -32), (-105, -118), (-52, -32), (0, -200), (52, -32), (105, -118), (155, -32), (210, -160), (225, -10), (225, 70)])
    L([group([body, gold(-200, 70), stroke('#6b4400', 4)])])
    # shine sweep clipped to the crown body
    shine = group([path([(-26, -230), (20, -230), (-40, 110), (-86, 110)]), fill('#ffffff', 70)], p=Anim([(40, (-320, 0)), (62, (320, 0)), (104, (320, 0)), (105, (-320, 0)), (126, (320, 0))], EASE))
    L([shine], masks=[mask_of(body)], ip=40, op=127, name='fx_shine')
    L([group([rect(470, 78, 0, 46, 12), gold(8, 86), stroke('#6b4400', 4)])])
    pearls = [group([ellipse(14), gradient([(0, '#ffffff'), (1, '#d8d2c4')], (-4, -4), (6, 6))], p=(x, y)) for y in (12, 80) for x in range(-220, 230, 22)]
    L(pearls)
    tips = [group([ellipse(40), gradient([(0, '#ffffff'), (1, '#d6cfc0')], (-10, -10), (14, 14))], p=pt) for pt in [(-210, -172), (-105, -130), (0, -214), (105, -130), (210, -172)]]
    L(tips)
    ruby = smooth_path([(0, -36), (30, -10), (24, 26), (0, 36), (-24, 26), (-30, -10)], 0.15)
    gems = [group([ruby, gradient([(0, '#ff8fa3'), (0.5, '#e01e5a'), (1, '#7a0526')], (-20, -30), (20, 30)), stroke('#fff3b0', 4)], p=(0, 46)),
            group([path([(-14, 10), (0, -24), (14, 10)], closed=False), stroke('#ffffff', 2.5, 70)], p=(0, 46)),
            group([ellipse(14, 10), fill('#ffffff', 85)], p=(-10, 30))]
    for x, col in ((-110, ('#90e0ef', '#0353a4')), (110, ('#90e0ef', '#0353a4'))):
        gems.append(group([ellipse(46, 50), gradient([(0, col[0]), (1, col[1])], (-15, -20), (15, 20)), stroke('#fff3b0', 3)], p=(x, 46)))
        gems.append(group([ellipse(10, 7), fill('#ffffff', 85)], p=(x - 8, 36)))
    for x in (-185, 185):
        gems.append(group([rect(34, 34, 0, 0, 4), gradient([(0, '#b7efc5'), (1, '#1b7a3e')], (-17, -17), (17, 17)), stroke('#fff3b0', 3)], p=(x, 46), r=45))
    for x, y in ((-210, -96), (-105, -70), (0, -120), (105, -70), (210, -96)):
        gems.append(group([polygon(4, 15), fill('#e0aaff'), stroke('#ffffff', 2, 70)], p=(x, y)))
    L(gems)
    for i, (x, y) in enumerate([(CX, CY + 46), (CX - 110, CY + 46), (CX + 110, CY + 46), (CX, CY - 214), (CX - 210, CY - 172), (CX + 210, CY - 172), (CX - 185, CY + 46), (CX + 185, CY + 46)]):
        sparkle(c, x, y, 44 + i * 9, 56, '#ffffff')
        sparkle(c, x, y, 100 + i * 5, 46, '#fff3b0')
    burst(c, CX, CY, 24, n=22, radius=430, colors=('#ffd60a', '#ffffff', '#ffb703'), size=(22, 36), shape='star', dur=28)
    ring_wave(c, CX, CY, 24, '#fff3b0', 140, 1000, 12, 24)
    # gold coin rain
    for i in range(34):
        t0 = 30 + rnd.randint(0, 80)
        x = rnd.uniform(40, 680)
        sz = rnd.uniform(34, 58)
        coin = [group([ellipse(sz), gradient([(0, '#fff3b0'), (0.5, '#ffc300'), (1, '#a86b00')], (-sz / 2, -sz / 2), (sz / 2, sz / 2)), stroke('#8a5a00', 2.5)]),
                group([ellipse(sz * 0.62), stroke('#fff3b0', 2.5, 80)]), group([star(5, sz * 0.2, sz * 0.09), fill('#a86b00')])]
        flip = Anim([(t0 + k * 6, ((100 if k % 2 == 0 else 15), 100)) for k in range(9)], EASE)
        c.layer(coin, p=Anim([(t0, (x, -80)), (t0 + 50, (x + rnd.uniform(-60, 60), H + 80))], IN), s=flip, r=rnd.uniform(-30, 30),
                ip=t0, op=t0 + 51, name='fx_coin')
    return c


# =====================================================================================
# TIRANGA (Indian flag) waving
# =====================================================================================
def tiranga():
    c = Comp('tiranga', W, H, 5.0)
    E = c.op
    X0, X1, Y0, SH = 178, 610, 430, 92  # flag left (at pole), right, top, stripe height
    N = 16

    def dy(x, ph):
        u = (x - X0) / (X1 - X0)
        return 26 * u * math.sin(2 * math.pi * u * 1.25 - ph) + 10 * u

    glow(c, 360, 560, 520, '#ffffff', 0, E, peak=40)
    rays_cols = ['#ff9933', '#ffffff', '#138808']
    for k, col in enumerate(rays_cols):
        items = []
        for i in range(10):
            a = 360 * (i * 3 + k) / 30
            items.append(group([path([(-18, 0), (18, 0), (0, -760)]), fill(col)], r=a))
        c.layer([group(items)], p=(360, 560), o=Anim([(10, 0), (24, 28), (E - 12, 28), (E, 0)], EASE), r=Anim([(0, 0), (E, 40)], LIN), name='fx_rays')
    rise = c.null(p=Anim([(0, (0, 900)), (26, (0, -14)), (34, (0, 0)), (E - 14, (0, -6)), (E, (0, -90))], OUT), o=Anim([(0, 0), (8, 100), (E - 10, 100), (E, 0)], LIN))
    c.layer([group([rect(16, 760, 168, 760, 6), gradient([(0, '#f1f5f9'), (0.5, '#94a3b8'), (1, '#e2e8f0')], (160, 0), (176, 0))]),
             group([ellipse(34), gradient([(0, '#fff3b0'), (1, '#b7791f')], (158, 395), (178, 420))], p=(168, 404))], parent=rise)
    times = list(range(0, E + 1, 4))
    cols = [('#ffb366', '#ff8c1a'), ('#ffffff', '#e8e8e8'), ('#1fa31f', '#0f6e0f')]
    for s, (c1, c2) in enumerate(cols):
        keys = []
        for t in times:
            ph = t * 2 * math.pi / 24
            xs = [X0 + (X1 - X0) * i / N for i in range(N + 1)]
            top = [(x, Y0 + s * SH + dy(x, ph)) for x in xs]
            bot = [(x, Y0 + (s + 1) * SH + dy(x, ph)) for x in reversed(xs)]
            v = top + bot
            z = [(0, 0)] * len(v)
            keys.append((t, v, z, z, True))
        shade = gradient([(0, c1), (0.5, c2), (1, c1)], (X0, 0), (X1, 0))
        c.layer([group([anim_path(keys), shade])], p=(0, 0), parent=rise)
    # moving light/shadow bands across the cloth for depth
    for t0 in (0, 40, 80):
        band = group([rect(60, 3 * SH + 60, 0, Y0 + 1.5 * SH, 0), gradient([(0, '#000000'), (1, '#000000')], (-30, 0), (30, 0), alpha=[(0, 0), (0.5, 0.16), (1, 0)])])
        c.layer([band], p=Anim([(t0, (X0, 0)), (t0 + 60, (X1, 0))], LIN), ip=t0, op=t0 + 61, parent=rise, name='fx_band')
    cx = (X0 + X1) / 2
    cpos = Anim([(t, (cx, Y0 + 1.5 * SH + dy(cx, t * 2 * math.pi / 24))) for t in times], LIN)
    spokes = [group([path([(0, 0), (3, -18), (0, -40), (-3, -18)]), fill('#000080')], r=i * 15) for i in range(24)]
    chakra = [group([ellipse(84), stroke('#000080', 5)]), group(spokes), group([ellipse(12), fill('#000080')])] + \
             [group([ellipse(4), fill('#000080')], p=polar(40, math.radians(i * 15 + 7.5))) for i in range(24)]
    c.layer(chakra, p=cpos, r=Anim([(0, 0), (E, 360)], LIN), parent=rise)
    rnd = random.Random(41)
    confetti(c, 30, n=60, colors=('#ff9933', '#ffffff', '#138808', '#ffd166', '#000080'), dur=60, rnd=rnd)
    fireworks(c, [(170, 250, 40, ('#ff9933', '#ffd8b0')), (550, 220, 56, ('#ffffff', '#ffffff')), (360, 160, 72, ('#138808', '#b7f5b7')),
                  (120, 330, 90, ('#ff9933', '#ffffff')), (600, 330, 104, ('#138808', '#ffffff'))])
    for i in range(8):
        sparkle(c, rnd.uniform(80, 640), rnd.uniform(380, 760), 30 + i * 12, 40)
    return c


# =====================================================================================
# TAJ MAHAL by moonlight
# =====================================================================================
def onion(w, h, y_base):
    hw = w / 2
    return smooth_path([(-hw * 0.78, y_base), (-hw, y_base - h * 0.3), (-hw * 0.94, y_base - h * 0.55), (-hw * 0.55, y_base - h * 0.8),
                        (-hw * 0.14, y_base - h * 0.95), (0, y_base - h), (hw * 0.14, y_base - h * 0.95), (hw * 0.55, y_base - h * 0.8),
                        (hw * 0.94, y_base - h * 0.55), (hw, y_base - h * 0.3), (hw * 0.78, y_base)], 0.2)


def pointed_arch(w, h, x=0, y=0):
    hw = w / 2
    v = [(x - hw, y), (x - hw, y - h + hw), (x, y - h), (x + hw, y - h + hw), (x + hw, y)]
    i = [(0, 0), (0, 0), (-hw * 0.6, hw * 0.35), (0, -hw * 0.6), (0, 0)]
    o = [(0, 0), (0, -hw * 0.6), (hw * 0.6, hw * 0.35), (0, 0), (0, 0)]
    return path(v, i, o)


def draw_taj(c, parent, reflection=False):
    marble = lambda y0, y1: gradient([(0, '#ffffff'), (0.6, '#e9eef8'), (1, '#c3cde2')], (0, y0), (0, y1))
    dome_g = gradient([(0, '#ffffff'), (0.55, '#eef2fa'), (1, '#b9c5dd')], (-50, -440), (150, -330), radial=True)
    inset = lambda: gradient([(0, '#8da0c8'), (1, '#3b4a78')], (0, -200), (0, 0))
    L = lambda shapes, **kw: c.layer(shapes, parent=parent, name='fx_refl' if reflection else None, **kw)
    # minarets
    for mx in (-290, 290):
        L([group([path([(mx - 17, 0), (mx + 17, 0), (mx + 13, -330), (mx - 13, -330)]), marble(-330, 0)]),
           group([path([(mx - 17, 0), (mx + 17, 0), (mx + 13, -330), (mx - 13, -330)]), stroke('#d9c27a', 1.5, 70)])]
          + [group([rect(46, 10, mx, y, 2), marble(y - 5, y + 5)]) for y in (-110, -220, -330)]
          + [group([rect(36, 26, mx, -350, 2), marble(-363, -337)]), group([onion(46, 46, -362), marble(-410, -362)], p=(mx, 0)),
             group([rect(3, 22, mx, -416, 1), fill('#e6c35c')])])
    L([group([rect(650, 46, 0, 23, 3), marble(0, 46)]), group([rect(650, 46, 0, 23, 3), stroke('#d9c27a', 1.5, 60)])])
    # chhatris
    for sx in (-138, 138):
        L([group([rect(54, 30, sx, -276, 2), marble(-291, -261)]), group([onion(70, 70, -290), marble(-360, -290)], p=(sx, 0)),
           group([rect(3, 24, sx, -370, 1), fill('#e6c35c')])])
    # main hall with chamfered corners
    hall = path([(-182, 0), (-182, -232), (-152, -262), (152, -262), (182, -232), (182, 0)])
    L([group([hall, marble(-262, 0)]), group([hall, stroke('#d9c27a', 2, 70)])])
    L([group([rect(130, 252, 0, -126, 2), fill('#e4eaf5')]), group([rect(130, 252, 0, -126, 2), stroke('#d9c27a', 2, 70)])])
    arches = [group([pointed_arch(92, 220, 0, -16), inset()]), group([pointed_arch(46, 96, 0, -16), fill('#1e2547')])]
    for sx in (-108, 108):
        arches += [group([pointed_arch(50, 92, sx, -18), inset()]), group([pointed_arch(50, 84, sx, -130), inset()])]
    for sx in (-167, 167):
        arches += [group([pointed_arch(18, 70, sx, -20), inset()]), group([pointed_arch(18, 64, sx, -130), inset()])]
    L(arches)
    L([group([rect(196, 48, 0, -286, 3), marble(-310, -262)]), group([rect(196, 48, 0, -286, 3), stroke('#d9c27a', 1.5, 60)])])
    dome = onion(250, 250, -308)
    L([group([dome, dome_g]), group([dome, stroke('#e6c35c', 2, 75)])])
    L([group([rect(5, 54, 0, -585, 2), fill('#e6c35c')]), group([ellipse(16), fill('#ffd166')], p=(0, -566)), group([ellipse(12), fill('#ffd166')], p=(0, -590)),
       group([ellipse(8), fill('#ffd166')], p=(0, -612))])
    if not reflection:
        shine = group([path([(-18, -600), (18, -600), (-30, -300), (-66, -300)]), fill('#ffffff', 80)],
                      p=Anim([(58, (-200, 0)), (82, (200, 0)), (120, (200, 0)), (121, (-200, 0)), (144, (200, 0))], EASE))
        c.layer([shine], parent=parent, masks=[mask_of(dome)], ip=58, op=145, name='fx_shine')


def taj_mahal():
    c = Comp('tajmahal', W, H, 6.0)
    E = c.op
    rnd = random.Random(51)
    c.layer([group([rect(W, H, W / 2, H / 2), gradient([(0, '#060b2b'), (0.6, '#1d1b4f'), (1, '#4a2c6b')], (0, 0), (0, H))])],
            p=(0, 0), o=Anim([(0, 0), (18, 88), (E - 16, 88), (E, 0)], LIN), name='fx_sky')
    for i in range(50):
        t0 = rnd.randint(4, 40)
        c.layer([group([ellipse(rnd.uniform(3, 7)), fill('#ffffff')])], p=(rnd.uniform(0, W), rnd.uniform(0, 640)),
                o=Anim([(t0, 0), (t0 + 10, 90), (t0 + 40, 30), (t0 + 70, 95), (E - 12, 70), (E, 0)], EASE), ip=t0, name='fx_star')
    glow(c, 575, 200, 150, '#fff3c4', 10, E, peak=70)
    c.layer([group([ellipse(96), gradient([(0, '#ffffff'), (1, '#ffe9a8')], (-30, -30), (40, 40))])], p=(575, 200), o=fade(10, 0, E), name='fx_moon')
    glow(c, 360, 640, 360, '#ffd166', 30, E, peak=45)
    # water with reflection
    c.layer([group([rect(W, 420, W / 2, 0), gradient([(0, '#1e3a8a'), (1, '#0b1033')], (0, -210), (0, 210), alpha=[(0, 0.75), (1, 0)])])],
            p=(0, 1110), o=fade(14, 0, E), name='fx_water')
    base = Anim([(0, (360, 1650)), (44, (360, 900)), (E - 16, (360, 896)), (E, (360, 960))], OUT)
    fade_all = Anim([(0, 0), (10, 100), (E - 12, 100), (E, 0)], LIN)
    refl = c.null(p=Anim([(k[0], (k[1][0], k[1][1] + 48)) for k in base.keys], OUT), s=(100, -55), o=Anim([(0, 0), (40, 0), (60, 26), (E - 12, 26), (E, 0)], LIN), name='fx_reflnull')
    draw_taj(c, refl, reflection=True)
    for i in range(10):  # ripples
        t0 = 50 + rnd.randint(0, 60)
        y = 960 + rnd.uniform(0, 170)
        x = rnd.uniform(120, 600)
        c.layer([group([rect(rnd.uniform(60, 140), 3, 0, 0, 2), fill('#ffffff', 45)])], p=Anim([(t0, (x - 30, y)), (t0 + 50, (x + 30, y))], LIN),
                o=Anim([(t0, 0), (t0 + 15, 100), (t0 + 50, 0)], LIN), ip=t0, op=t0 + 51, name='fx_ripple')
    taj = c.null(p=base, o=fade_all)
    glow(c, 0, -380, 230, '#fff3c4', 40, E, peak=50, parent=taj)
    draw_taj(c, taj)
    # sky lanterns
    for i in range(9):
        t0 = 40 + rnd.randint(0, 70)
        x = rnd.uniform(60, 660)
        lan = [group([ellipse(46), gradient([(0, '#ffd166'), (1, '#ffd166')], (0, 0), (23, 0), radial=True, alpha=[(0, 0.6), (1, 0)])]),
               group([path([(-10, -14), (10, -14), (13, 14), (-13, 14)]), gradient([(0, '#fff3b0'), (1, '#ff8c1a')], (0, -14), (0, 14))]),
               group([ellipse(8, 6), fill('#ffffff')], p=(0, 10))]
        c.layer(lan, p=Anim([(t0, (x, 1000)), (t0 + 90, (x + rnd.uniform(-60, 60), 260))], LIN), o=Anim([(t0, 0), (t0 + 10, 100), (t0 + 70, 100), (t0 + 90, 0)], LIN),
                ip=t0, op=t0 + 91, name='fx_lantern')
    fireworks(c, [(170, 260, 56, ('#ffd166', '#fff3b0')), (560, 340, 70, ('#ff4d6d', '#ffccd5')), (330, 160, 86, ('#4cc9f0', '#ffffff')),
                  (120, 420, 104, ('#ff9933', '#ffffff')), (600, 180, 118, ('#c77dff', '#ffffff')), (380, 300, 134, ('#ffd166', '#ffffff'))], n=34, radius=170)
    for i, (x, y) in enumerate([(360, 290), (360, 330), (75, 486), (645, 486), (222, 552), (498, 552)]):
        sparkle(c, x, y, 60 + i * 12, 46)
    return c


# =====================================================================================
# FAIRY
# =====================================================================================
def fairy():
    c = Comp('fairy', W, H, 5.0)
    E = c.op
    rnd = random.Random(61)
    path_keys = [(0, (60, 1240)), (20, (200, 860)), (38, (560, 560)), (56, (360, 600)), (70, (360, 590)), (84, (360, 612)),
                 (98, (360, 590)), (112, (360, 608)), (124, (380, 590)), (E, (820, -200))]
    n = c.null(p=Anim(path_keys, EASE), r=Anim([(0, 24), (38, -12), (56, 4), (64, 0), (124, 0), (E, 24)], EASE),
               s=Anim([(0, 50), (38, 95), (56, 100), (E, 90)], EASE))
    glow(c, 0, -30, 220, '#f0abfc', 0, E, pulse=False, peak=55, parent=n)
    glow(c, 0, -30, 120, '#ffffff', 0, E, pulse=False, peak=45, parent=n)
    flap = Anim([(k * 4, ((100 if k % 2 == 0 else 38), 100)) for k in range(E // 4 + 2)], EASE)
    wing_g = lambda: gradient([(0, '#cffafe'), (0.5, '#f5d0fe'), (1, '#c4b5fd')], (0, -100), (0, 100), alpha=[(0, 0.8), (1, 0.55)])
    for sx in (1, -1):
        wings = [group([ellipse(150, 220), wing_g(), stroke('#ffffff', 3, 85)], p=(sx * 78, -70), r=sx * 38),
                 group([ellipse(104, 140), wing_g(), stroke('#ffffff', 3, 85)], p=(sx * 60, 22), r=sx * -26),
                 group([path([(0, 0), (sx * 120, -150)], [(0, 0), (0, 0)], [(sx * 30, -80), (0, 0)], closed=False), stroke('#ffffff', 2, 60)], p=(sx * 6, -36)),
                 group([path([(0, 0), (sx * 80, 60)], [(0, 0), (0, 0)], [(sx * 30, 10), (0, 0)], closed=False), stroke('#ffffff', 2, 60)], p=(sx * 6, -30))]
        wings += [group([ellipse(8), fill('#ffffff', 90)], p=(sx * x, y)) for x, y in ((90, -120), (120, -60), (70, 40), (60, -90))]
        c.layer(wings, p=(sx * 6, -40), a=(sx * 6, -40), s=flap, parent=n)
    skin = gradient([(0, '#ffe8da'), (1, '#f6c3a4')], (0, -140), (0, -80))
    c.layer([group([path([(-14, 92), (-20, 150)], closed=False), stroke('#f6c3a4', 10)]), group([path([(14, 92), (12, 146)], closed=False), stroke('#f6c3a4', 10)]),
             group([ellipse(22, 12), fill('#ec4899')], p=(-22, 152)), group([ellipse(22, 12), fill('#ec4899')], p=(12, 148))], parent=n)
    dress = smooth_path([(-24, -34), (24, -34), (54, 30), (78, 96), (40, 104), (0, 98), (-40, 104), (-78, 96), (-54, 30)], 0.18)
    c.layer([group([dress, gradient([(0, '#f9a8d4'), (0.5, '#ec4899'), (1, '#a21caf')], (0, -34), (0, 104))]),
             group([path([(-74, 92), (-38, 100), (0, 92), (38, 100), (74, 92)], closed=False), stroke('#fdf2f8', 4, 80)])]
            + [group([ellipse(5), fill('#ffffff')], p=(rnd.uniform(-50, 50), rnd.uniform(0, 88))) for _ in range(12)], parent=n)
    c.layer([group([path([(-20, -78), (20, -78), (24, -32), (-24, -32)]), gradient([(0, '#f472b6'), (1, '#db2777')], (0, -78), (0, -32))]),
             group([ellipse(14, 12), fill('#fde68a')], p=(0, -48))], parent=n)
    c.layer([group([path([(-20, -70), (-48, -36), (-40, -6)], [(0, 0), (-4, -10), (0, 0)], [(-10, 8), (4, 10), (0, 0)], closed=False), stroke('#f6c3a4', 8)])], parent=n)
    wave = Anim([(0, 0), (60, 0), (66, -24), (72, 10), (78, -18), (84, 0), (E, 0)], EASE)
    arm = c.null(p=(20, -70), r=wave, parent=n)
    c.layer([group([path([(0, 0), (36, -26), (56, -52)], [(0, 0), (-6, 6), (0, 0)], [(10, -4), (6, -10), (0, 0)], closed=False), stroke('#f6c3a4', 8)]),
             group([path([(56, -52), (100, -108)], closed=False), stroke('#facc15', 5)])], parent=arm)
    glow(c, 106, -118, 70, '#fff3b0', 0, E, pulse=False, peak=85, parent=arm)
    c.layer([group([star(5, 22, 9), gradient([(0, '#ffffff'), (1, '#facc15')], (0, -22), (0, 22))])], p=(106, -118), r=Anim([(0, 0), (E, 720)], LIN), parent=arm)
    c.layer([group([rect(12, 14, 0, -88, 3), fill('#f6c3a4')])], parent=n)
    c.layer([group([smooth_path([(-40, -150), (0, -168), (40, -150), (52, -100), (46, -40), (26, -60), (0, -70), (-26, -60), (-46, -40), (-52, -100)], 0.22),
                    gradient([(0, '#8b5cf6'), (1, '#4c1d95')], (0, -168), (0, -40))])], parent=n)
    c.layer([group([ellipse(64, 70), skin], p=(0, -114))], parent=n)
    c.layer([group([smooth_path([(-34, -122), (-26, -146), (0, -152), (26, -146), (34, -122), (16, -134), (0, -128), (-16, -136)], 0.25),
                    gradient([(0, '#a78bfa'), (1, '#6d28d9')], (0, -152), (0, -122))])], parent=n)
    blink = Anim([(0, (100, 100)), (90, (100, 100)), (93, (100, 10)), (96, (100, 100))], EASE)
    for sx in (1, -1):
        c.layer([group([ellipse(9, 12), fill('#2e1065')]), group([ellipse(3.5), fill('#ffffff')], p=(1.5, -2.5))], p=(sx * 13, -110), s=blink, parent=n)
        c.layer([group([ellipse(12, 7), fill('#fb7185', 55)], p=(sx * 22, -96))], parent=n)
    c.layer([group([path([(-7, -94), (7, -94)], [(0, 0), (-4, 4)], [(4, 4), (0, 0)], closed=False), stroke('#be185d', 2.5)])], parent=n)
    c.layer([group([star(5, 12, 5), gradient([(0, '#fff3b0'), (1, '#f59e0b')], (0, -12), (0, 12))], p=(0, -156))], parent=n)
    # sparkle trail behind her flight
    def at(t):
        for (t0, p0), (t1, p1) in zip(path_keys, path_keys[1:]):
            if t0 <= t <= t1:
                u = (t - t0) / max(1, t1 - t0)
                return (p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)
        return path_keys[-1][1]
    for t in list(range(2, 56, 2)) + list(range(124, E - 2, 2)):
        x, y = at(t)
        col = rnd.choice(['#ffffff', '#f5d0fe', '#a5f3fc', '#fde68a'])
        c.layer([group([star(4, 10, 3), fill(col)])], p=Anim([(t, (x + rnd.uniform(-20, 20), y + 40)), (t + 26, (x + rnd.uniform(-40, 40), y + 120))], LIN),
                s=Anim([(t, 120), (t + 26, 10)], LIN), r=Anim([(t, 0), (t + 26, 180)], LIN), ip=t, op=t + 27, name='fx_trail')
    # magic burst from the wand
    for k in range(3):
        burst(c, 470, 470, 66 + k * 6, n=16, radius=360, colors=('#ffffff', '#f5d0fe', '#a5f3fc', '#fde68a'), size=(18, 30), shape='star', dur=30, rnd=random.Random(70 + k))
    burst(c, 470, 470, 70, n=14, radius=420, colors=('#f472b6', '#fb7185', '#f0abfc'), size=(26, 40), shape='heart', dur=34, rnd=random.Random(80))
    ring_wave(c, 470, 470, 66, '#f5d0fe', 40, 900, 10, 26)
    for i in range(8):
        sparkle(c, rnd.uniform(80, 640), rnd.uniform(300, 1000), 60 + i * 8, 44, '#f5d0fe')
    return c


# =====================================================================================
# SUPERBIKE (pivot at the rear wheel for the wheelie)
# =====================================================================================
def superbike():
    c = Comp('superbike', W, H, 4.6)
    E = c.op
    Y = 800
    rnd = random.Random(71)
    for i in range(22):
        t0 = rnd.randint(0, 30) if i < 12 else rnd.randint(100, 124)
        y = Y + rnd.uniform(-220, 90)
        c.layer([group([rect(rnd.uniform(120, 300), 5, 0, 0, 2), fill(rnd.choice(['#22d3ee', '#ffffff', '#f472b6']), 75)])],
                p=Anim([(t0, (900, y)), (t0 + 12, (-260, y))], LIN), ip=t0, op=t0 + 13, name='fx_speed')
    c.layer([group([rect(W, 6, 0, 0, 3), gradient([(0, '#22d3ee'), (1, '#f472b6')], (-360, 0), (360, 0), alpha=[(0, 0), (0.5, 0.9), (1, 0)])])],
            p=(360, Y + 86), o=Anim([(14, 0), (26, 100), (110, 100), (124, 0)], LIN), name='fx_road')
    glow(c, 360, Y + 40, 340, '#22d3ee', 22, 116, peak=40)
    # rear-wheel pivot: x path in, wheelie, out
    RX = -195  # rear hub relative to bike centre
    piv = c.null(p=Anim([(0, (-520 + RX + 360, Y + 60)), (28, (360 + RX, Y + 60)), (98, (360 + RX, Y + 60)), (124, (1300, Y + 60))], OUT),
                 r=Anim([(0, 0), (40, 0), (52, -24), (60, -20), (72, -26), (84, -21), (92, 0), (96, 3), (100, 0)], EASE))
    off = lambda pts: [(x - RX, y - 60) for x, y in pts]

    def L(shapes, **kw):
        return c.layer(shapes, parent=piv, **kw)

    cone = group([path(off([(235, -50), (680, -170), (680, 70)])), gradient([(0, '#e0fbff'), (1, '#e0fbff')], (235 - RX, 0), (680 - RX, 0), alpha=[(0, 0.75), (1, 0)])])
    L([cone], o=Anim([(24, 0), (32, 90), (100, 90), (110, 0)], LIN))
    L([group([path(off([(-195, 60), (-30, 30)]), closed=False), stroke('#374151', 18)]), group([path(off([(-195, 60), (-30, 30)]), closed=False), stroke('#9ca3af', 4)])])
    L([group([path(off([(205, 60), (150, -78)]), closed=False), stroke('#d1d5db', 12)]), group([path(off([(195, 60), (140, -78)]), closed=False), stroke('#6b7280', 6)])])
    exhaust = group([rect(120, 20, 0, 0, 10), gradient([(0, '#e5e7eb'), (1, '#6b7280')], (0, -10), (0, 10))], p=off([(-150, 22)])[0], r=-12)
    L([exhaust])
    flick = Anim([(k * 3, ((100 + (25 if k % 2 else -20)), 100)) for k in range(E // 3 + 2)], LIN)
    L([group([smooth_path([(0, 0), (-40, -12), (-70, 0), (-40, 12)], 0.3), gradient([(0, '#fff7c2'), (0.5, '#ff9f1c'), (1, '#ff3d00')], (0, 0), (-70, 0))])],
      p=off([(-208, 35)])[0], a=(0, 0), s=flick, r=-12)
    L([group([rect(96, 62, 0, 0, 10), gradient([(0, '#6b7280'), (1, '#1f2937')], (0, -31), (0, 31))], p=off([(-20, 22)])[0])]
      + [group([path(off([(-56, y), (16, y)]), closed=False), stroke('#9ca3af', 2.5)]) for y in (8, 18, 28, 38)])
    body = smooth_path(off([(-262, -74), (-170, -86), (-80, -88), (-20, -120), (70, -130), (140, -108), (212, -80), (242, -46), (226, -14), (150, -8), (60, -6), (-60, -16), (-130, -36), (-212, -60)]), 0.14)
    L([group([body, gradient([(0, '#334155'), (0.45, '#0f172a'), (1, '#020617')], (0, -114 - 60), (0, -6 - 60))]), group([body, stroke('#22d3ee', 3, 90)])])
    L([group([path(off([(-230, -26), (-80, -52), (60, -70), (200, -60)]), closed=False), stroke('#f472b6', 6)]),
       group([path(off([(-200, -12), (-60, -34), (100, -46), (215, -30)]), closed=False), stroke('#22d3ee', 4, 80)])])
    L([group([path(off([(-176, -88), (-64, -92), (-58, -80), (-170, -76)])), fill('#111827')]),
       group([path(off([(150, -100), (214, -132), (232, -76), (204, -74)])), gradient([(0, '#a5f3fc'), (1, '#0e7490')], (0, -132 - 60), (0, -74 - 60), alpha=[(0, 0.85), (1, 0.4)])]),
       group([path(off([(150, -100), (118, -124)]), closed=False), stroke('#9ca3af', 6)]),
       group([path(off([(222, -60), (244, -48), (238, -34), (218, -42)])), fill('#fef9c3')]),
       group([path(off([(-262, -78), (-246, -82), (-244, -68), (-260, -66)])), fill('#ff1744')])])
    # rider (leaning forward, dark suit with neon lines)
    suit = '#111827'
    L([group([path(off([(-70, -96), (-4, -66), (-40, -18)]), closed=False), stroke(suit, 30)]),
       group([ellipse(40, 20), fill('#0b0b0b')], p=off([(-44, -14)])[0]),
       group([path(off([(-70, -100), (44, -156)]), closed=False), stroke(suit, 44)]),
       group([path(off([(-60, -112), (40, -160)]), closed=False), stroke('#22d3ee', 4)]),
       group([path(off([(36, -150), (86, -128), (122, -120)]), closed=False), stroke(suit, 18)]),
       group([ellipse(74, 66), gradient([(0, '#374151'), (1, '#030712')], (0, -33), (0, 33))], p=off([(70, -186)])[0]),
       group([path(off([(78, -200), (108, -190), (104, -168), (74, -174)])), gradient([(0, '#a5f3fc'), (1, '#f472b6')], (0, -260), (0, -228))]),
       group([path(off([(40, -214), (70, -220), (100, -206)]), closed=False), stroke('#f472b6', 4)])])
    glow(c, 238 - RX, -46 - 60, 60, '#e0fbff', 20, 112, pulse=False, peak=90, parent=piv)
    glow(c, -254 - RX, -74 - 60, 46, '#ff1744', 20, 112, pulse=False, peak=90, parent=piv)
    spin = Anim([(0, 0), (28, 1260), (98, 2600), (124, 3800)], LIN)
    for hx in (-195, 205):
        spokes = [group([rect(6, 100, 0, 0, 3), fill('#cbd5e1')], r=k * 36) for k in range(5)]
        L([group([ellipse(148), fill('#0b0b0b')]), group([ellipse(148), stroke('#1f2937', 6)]), group([ellipse(104), stroke('#22d3ee', 5)]), group(spokes),
           group([ellipse(74), stroke('#94a3b8', 3)]), group([ellipse(24), fill('#e5e7eb')])], p=off([(hx, 60)])[0], r=spin)
    for k in range(5):  # sparks under the rear wheel during the wheelie
        burst(c, 360 + RX, Y + 130, 52 + k * 8, n=12, radius=200, colors=('#ffd166', '#ff9f1c', '#ffffff'), size=(10, 18), shape='streak', dur=16, rnd=random.Random(90 + k), gravity=-60)
    for i, (x, y) in enumerate([(300, Y - 160), (460, Y - 120), (220, Y - 60), (560, Y - 40)]):
        sparkle(c, x, y, 40 + i * 9, 46, '#e0fbff')
    return c


# =====================================================================================
# SUPERCAR (gold & black hypercar under spotlights)
# =====================================================================================
def supercar():
    c = Comp('supercar', W, H, 5.0)
    E = c.op
    Y = 780
    rnd = random.Random(81)
    rays(c, 360, Y - 60, 26, 760, 40, '#ffe066', 36, E, opacity=26, spin=40)
    for k, sx in enumerate((-1, 1)):  # spotlights
        beam = group([path([(-26, 0), (26, 0), (230, 760), (-230, 760)]), gradient([(0, '#fffbe6'), (1, '#fffbe6')], (0, 0), (0, 760), alpha=[(0, 0.75), (1, 0)])])
        c.layer([beam], p=(360 + sx * 250, -40), r=Anim([(30, sx * 28), (70, sx * 8), (110, sx * 22), (E, sx * 12)], EASE), o=Anim([(30, 0), (40, 80), (E - 12, 80), (E, 0)], LIN),
                ip=30, name='fx_spot')
    glow(c, 360, Y + 70, 380, '#ffc300', 30, E, peak=50)
    c.layer([group([ellipse(700, 70), gradient([(0, '#ffc300'), (1, '#ffc300')], (0, 0), (350, 0), radial=True, alpha=[(0, 0.8), (1, 0)])])], p=(360, Y + 110),
            o=Anim([(28, 0), (40, 100), (E - 12, 100), (E, 0)], LIN), name='fx_underglow')
    n = c.null(p=Anim([(0, (-520, Y)), (32, (360, Y)), (E - 18, (360, Y)), (E, (1300, Y))], OUT),
               r=Anim([(28, 0), (33, 2.5), (40, -1), (46, 0)], EASE), o=Anim([(0, 100), (E - 6, 100), (E, 0)], LIN))

    def L(shapes, **kw):
        return c.layer(shapes, parent=n, **kw)

    L([group([ellipse(620, 46), fill('#000000', 45)], p=(0, 92))])
    body = smooth_path([(-306, 46), (-312, 4), (-290, -24), (-200, -46), (-110, -58), (-50, -112), (70, -122), (150, -84), (236, -56), (304, -34), (324, 2), (318, 46)], 0.14)
    L([group([body, gradient([(0, '#3a3a3a'), (0.5, '#121212'), (1, '#000000')], (0, -122), (0, 46))]), group([body, stroke('#facc15', 3, 90)])])
    L([group([path([(-300, -8), (-120, -30), (60, -40), (300, -22)], closed=False), stroke('#facc15', 5)]),
       group([path([(-280, 30), (310, 24)], closed=False), stroke('#ffd54f', 2.5, 70)])])
    canopy = path([(-40, -106), (64, -114), (142, -80), (-104, -58)])
    L([group([canopy, gradient([(0, '#3b4f7a'), (1, '#0b1020')], (0, -114), (0, -58))]),
       group([path([(-10, -104), (20, -106), (-44, -62), (-74, -60)]), fill('#ffffff', 28)]),
       group([path([(28, -110), (36, -110), (6, -64), (-2, -64)]), fill('#facc15')])])
    L([group([path([(70, -20), (150, -30), (140, 8), (80, 10)]), fill('#0a0a0a')]), group([path([(70, -20), (150, -30), (140, 8), (80, 10)]), stroke('#facc15', 3)])])
    L([group([path([(-312, -32), (-262, -60), (-238, -60), (-268, -30)]), fill('#111111')]), group([path([(-312, -32), (-262, -60), (-238, -60)], closed=False), stroke('#facc15', 3)])])
    L([group([path([(280, -38), (322, -18), (318, -10), (276, -28)]), fill('#e0fbff')]), group([path([(-312, -14), (-290, -20), (-290, -8), (-312, -4)]), fill('#ff1744')])])
    glow(c, 300, -24, 80, '#e0fbff', 28, E, pulse=False, peak=90, parent=n)
    glow(c, -300, -10, 60, '#ff1744', 28, E, pulse=False, peak=90, parent=n)
    cone = group([path([(300, -26), (760, -150), (760, 100)]), gradient([(0, '#fffbe6'), (1, '#fffbe6')], (300, 0), (760, 0), alpha=[(0, 0.7), (1, 0)])])
    L([cone], o=Anim([(26, 0), (36, 90), (E - 20, 90), (E - 10, 0)], LIN))
    shine = group([path([(-24, -140), (16, -140), (-30, 60), (-70, 60)]), fill('#ffffff', 75)], p=Anim([(44, (-380, 0)), (70, (380, 0)), (100, (380, 0)), (101, (-380, 0)), (126, (380, 0))], EASE))
    L([shine], masks=[mask_of(body)], ip=44, op=127, name='fx_shine')
    spin = Anim([(0, 0), (32, 1620), (E - 18, 1620), (E, 2900)], OUT)
    for hx in (-188, 206):
        rim = [group([rect(10, 62, 0, -26, 4), gradient([(0, '#fff3b0'), (1, '#b7791f')], (0, -56), (0, 0))], r=k * 36) for k in range(10)]
        L([group([ellipse(150), fill('#0a0a0a')]), group([ellipse(150), stroke('#262626', 6)]), group([ellipse(116), gradient([(0, '#2b2b2b'), (1, '#0a0a0a')], (0, -58), (0, 58))]),
           group(rim), group([ellipse(116), stroke('#facc15', 4)]), group([ellipse(30), gradient([(0, '#fff3b0'), (1, '#b7791f')], (-10, -10), (12, 12))])], p=(hx, 48), r=spin)
        L([group([path([(-34, -40), (-10, -54), (0, -44), (-26, -28)]), fill('#ef4444')])], p=(hx, 48))
    burst(c, 140, Y + 70, 30, n=14, radius=200, colors=('#adb5bd', '#e9ecef'), size=(18, 34), dur=24, rnd=random.Random(4))
    confetti(c, 46, n=56, colors=('#ffd700', '#fff3b0', '#ffc300', '#ffffff', '#b7791f'), dur=60, rnd=rnd)
    for i, (x, y) in enumerate([(320, Y - 120), (480, Y - 70), (200, Y - 50), (620, Y - 30), (90, Y - 10), (420, Y - 105)]):
        sparkle(c, x, y, 50 + i * 10, 52)
    return c


ALL = {'lion': lambda: big_cat('lion'), 'tiger': lambda: big_cat('tiger'), 'emperor': emperor_crown, 'tiranga': tiranga,
       'tajmahal': taj_mahal, 'fairy': fairy, 'superbike': superbike, 'supercar': supercar}

if __name__ == '__main__':
    import sys
    names = sys.argv[1:] or list(ALL)
    for nm in names:
        comp = ALL[nm]()
        comp.save(os.path.join(OUT_DIR, f'{comp.name}.json'))
        print('wrote', comp.name, os.path.getsize(os.path.join(OUT_DIR, f'{comp.name}.json')) // 1024, 'KB')
