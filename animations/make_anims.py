"""Generates all original gift, entry-effect and avatar-frame animations as Lottie JSON.

Run:  python3 make_anims.py   -> writes dist/*.json
"""
import math
import os
import random

from lottie_kit import (Anim, Comp, EASE, IN, LIN, OUT, burst, confetti, ellipse, fill, glow, gradient, group,
                        heart_items, hexc, path, polygon, rays, rect, ring_wave, smooth_path, sparkle, star, stroke)

OUT_DIR = os.path.join(os.path.dirname(__file__), 'dist')
os.makedirs(OUT_DIR, exist_ok=True)


def pop_scale(t0, end, final=100, overshoot=118):
    return Anim([(t0, 0), (t0 + 9, overshoot), (t0 + 14, final - 8), (t0 + 19, final + 3), (t0 + 23, final),
                 (end - 10, final), (end, final * 0.6)], EASE)


def fade_out(end, start_hold=0, d=10):
    return Anim([(start_hold, 100), (end - d, 100), (end, 0)], LIN)


# =====================================================================================
# SMALL GIFTS (512 x 512)
# =====================================================================================
def rose():
    c = Comp('rose', 512, 512, 2.2)
    E = c.op
    rays(c, 256, 230, 14, 260, 26, '#ffc2d1', 0, E, opacity=30, spin=40)
    glow(c, 256, 230, 220, '#ff4d6d', 0, E, peak=55)
    n = c.null(p=Anim([(0, (256, 290)), (40, (256, 270)), (E, (256, 190))], EASE), s=pop_scale(0, E), o=fade_out(E))
    # stem and leaves
    c.layer([group([path([(0, 0), (6, 70), (0, 160)], [(0, 0), (-8, -30), (0, 0)], [(0, 0), (8, 30), (0, 0)], closed=False), stroke('#2d6a4f', 11)])], p=(0, 0), parent=n)
    c.layer([group([ellipse(74, 30), gradient([(0, '#52b788'), (1, '#1b4332')], (-37, 0), (37, 0))], p=(-34, 95), r=-28),
             group([ellipse(70, 28), gradient([(0, '#1b4332'), (1, '#52b788')], (-35, 0), (35, 0))], p=(36, 62), r=30)], parent=n)
    # bloom: petals wobble gently
    petals = []
    for i in range(6):
        a = i * 60
        petals.append(group([ellipse(78, 96), gradient([(0, '#ff758f'), (1, '#c9184a')], (0, -48), (0, 48))], p=(math.cos(math.radians(a)) * 34, math.sin(math.radians(a)) * 30), r=a + 90))
    c.layer([group(petals)], p=(0, -40), r=Anim([(0, -6), (E / 2, 6), (E, -4)], EASE), parent=n)
    inner = [group([ellipse(84, 74), gradient([(0, '#ff4d6d'), (1, '#a4133c')], (0, -37), (0, 37))]),
             group([path([(-26, 6), (0, -20), (26, 4)], [(0, 0), (-18, 0), (0, 0)], [(0, 0), (18, 0), (0, 0)], closed=False), stroke('#800f2f', 6)]),
             group([path([(-12, 10), (4, -6), (16, 12)], [(0, 0), (-10, 0), (0, 0)], [(0, 0), (10, 0), (0, 0)], closed=False), stroke('#800f2f', 5)])]
    c.layer(inner, p=(0, -44), s=Anim([(0, 90), (E / 2, 104), (E, 96)], EASE), parent=n)
    c.layer([group([ellipse(22, 14), fill('#ffffff')], p=(-30, -70), r=-30)], o=55, parent=n)
    burst(c, 256, 220, 12, n=12, radius=210, colors=('#ff8fab', '#ffc2d1', '#ff4d6d'), size=(16, 26), shape='heart', dur=26)
    for i, (x, y) in enumerate([(150, 150), (360, 140), (390, 300), (120, 320), (256, 90)]):
        sparkle(c, x, y, 10 + i * 7, 30, '#fff0f3')
    return c


def heart():
    c = Comp('heart', 512, 512, 2.0)
    E = c.op
    glow(c, 256, 250, 230, '#ff0a54', 0, E, peak=60)
    beat = Anim([(0, 0), (8, 122), (12, 92), (17, 108), (21, 100), (28, 114), (33, 98), (40, 100), (E - 8, 100), (E, 70)], EASE)
    n = c.null(p=Anim([(0, (256, 260)), (44, (256, 255)), (E, (256, 170))], EASE), s=beat, o=fade_out(E))
    c.layer(heart_items(240, grad=gradient([(0, '#ff758f'), (0.55, '#ff0a54'), (1, '#a4133c')], (0, -120), (0, 120))), parent=n)
    c.layer([group([ellipse(46, 26), fill('#ffffff')], p=(-58, -58), r=-35)], o=60, parent=n)
    ring_wave(c, 256, 250, 8, '#ff8fab', 60, 470, 12, 20)
    ring_wave(c, 256, 250, 27, '#ffffff', 60, 420, 6, 20)
    burst(c, 256, 250, 9, n=14, radius=230, colors=('#ff4d6d', '#ff8fab', '#ffccd5'), size=(18, 30), shape='heart', dur=26)
    return c


def chai():
    c = Comp('chai', 512, 512, 2.4)
    E = c.op
    glow(c, 256, 270, 210, '#ffb703', 0, E, peak=45)
    n = c.null(p=(256, 300), s=pop_scale(0, E), r=Anim([(0, -14), (12, 6), (20, -2), (26, 0)], EASE), o=fade_out(E))
    c.layer([group([ellipse(300, 64), fill('#f3e9dc'), stroke('#c9a27e', 5)], p=(0, 92))], parent=n)
    c.layer([group([path([(-64, -48), (64, -48), (52, 84), (-52, 84)]), gradient([(0, '#d4a373'), (1, '#7f4f24')], (0, -48), (0, 84))])], parent=n)
    c.layer([group([ellipse(128, 22), fill('#e9c46a')], p=(0, -48))], parent=n)
    ridges = [group([path([(x, -86), (x * 0.76, 84)], closed=False), stroke('#ffffff', 4, 45)]) for x in (-44, -16, 16, 44)]
    c.layer([group([path([(-74, -92), (74, -92), (56, 88), (-56, 88)]), fill('#ffffff', 22), stroke('#ffffff', 6, 85)])] + ridges, parent=n)
    for i, x in enumerate((-36, 0, 36)):
        t0 = 10 + i * 6
        wave = path([(0, 0), (14, -40), (-12, -80), (8, -120)], [(0, 0), (-10, 14), (10, 14), (-8, 12)], [(0, 0), (10, -14), (-10, -14), (0, 0)], closed=False)
        p0 = Anim([(t0, (x, -110)), (t0 + 40, (x + 6, -170))], LIN)
        o = Anim([(t0, 0), (t0 + 12, 80), (t0 + 30, 60), (t0 + 44, 0)], EASE)
        c.layer([group([wave, stroke('#ffffff', 9)])], p=p0, o=o, ip=t0, op=t0 + 45, parent=n)
    for i, (x, y) in enumerate([(130, 170), (390, 190), (400, 360), (110, 380)]):
        sparkle(c, x, y, 14 + i * 8, 26, '#fff3b0')
    return c


def samosa():
    c = Comp('samosa', 512, 512, 2.2)
    E = c.op
    glow(c, 256, 290, 200, '#f4a261', 0, E, peak=45)
    pos = Anim([(0, (256, -80)), (14, (256, 300)), (20, (256, 270)), (26, (256, 300)), (E - 10, (256, 290)), (E, (256, 220))], OUT)
    sc = Anim([(0, 90), (13, 100), (15, (122, 80)), (20, (95, 106)), (26, 100), (E - 10, 100), (E, 70)], EASE)
    n = c.null(p=pos, s=sc, r=Anim([(0, -30), (14, 0), (40, 4), (E, -3)], EASE), o=fade_out(E))
    tri = group([polygon(3, 150), gradient([(0, '#ffd166'), (0.6, '#e09f3e'), (1, '#9c6644')], (0, -150), (0, 80))], name='tri')
    tri['it'][0]['os'] = {'a': 0, 'k': 18}
    c.layer([tri], p=(0, 0), parent=n)
    c.layer([group([path([(0, -140), (-10, 20), (8, 70)], closed=False), stroke('#9c6644', 6, 70)])], parent=n)
    rnd = random.Random(3)
    dots = [group([ellipse(rnd.uniform(6, 11)), fill('#7f5539', 55)], p=(rnd.uniform(-60, 60), rnd.uniform(-30, 55))) for _ in range(14)]
    c.layer(dots, parent=n)
    c.layer([group([ellipse(40, 18), fill('#ffffff')], p=(-30, -60), r=-60)], o=40, parent=n)
    burst(c, 256, 330, 15, n=14, radius=170, colors=('#e09f3e', '#9c6644', '#ffd166'), size=(8, 14), dur=20)
    for i, (x, y) in enumerate([(140, 160), (380, 170), (410, 330)]):
        sparkle(c, x, y, 18 + i * 8, 28, '#fff3b0')
    return c


def lucky_star():
    c = Comp('star', 512, 512, 2.2)
    E = c.op
    rays(c, 256, 256, 16, 280, 30, '#ffd60a', 0, E, opacity=40, spin=90)
    glow(c, 256, 256, 230, '#ffb703', 0, E, peak=65)
    n = c.null(p=(256, 256), s=pop_scale(0, E, overshoot=125), r=Anim([(0, -200), (16, 10), (24, 0), (E, 20)], OUT), o=fade_out(E))
    st = group([star(5, 150, 66), gradient([(0, '#fff3b0'), (0.5, '#ffc300'), (1, '#fb8500')], (0, -150), (0, 140)), stroke('#ffffff', 6, 70)])
    st['it'][0]['is'] = {'a': 0, 'k': 8}
    st['it'][0]['os'] = {'a': 0, 'k': 8}
    c.layer([st], parent=n)
    c.layer([group([star(5, 72, 32), fill('#ffffff', 35)], p=(-10, -12))], parent=n)
    burst(c, 256, 256, 12, n=14, radius=240, colors=('#ffd60a', '#ffffff', '#ffb703'), size=(18, 30), shape='star', dur=24)
    ring_wave(c, 256, 256, 12, '#fff3b0', 80, 480, 10, 22)
    for i, (x, y) in enumerate([(110, 120), (400, 110), (420, 400), (90, 390), (256, 470)]):
        sparkle(c, x, y, 16 + i * 6, 30)
    return c


def diya():
    c = Comp('diya', 512, 512, 2.6)
    E = c.op
    glow(c, 256, 230, 240, '#ff9f1c', 0, E, peak=70)
    n = c.null(p=(256, 330), s=pop_scale(0, E), o=fade_out(E))
    bowl = path([(-140, -10), (160, -24), (0, 80)], [(0, 0), (0, 0), (110, 0)], [(0, 0), (-30, 70), (-110, 0)])
    c.layer([group([bowl, gradient([(0, '#f4845f'), (0.6, '#c8553d'), (1, '#7b2d26')], (0, -20), (0, 80))])], parent=n)
    c.layer([group([ellipse(250, 34), fill('#5c1f12')], p=(0, -12))], parent=n)
    c.layer([group([ellipse(14), fill('#ffd166')], p=(x, 26 - abs(x) * 0.1)) for x in range(-90, 100, 30)], parent=n)
    flick = Anim([(0, (100, 100)), (6, (90, 112)), (12, (106, 94)), (18, (94, 108)), (24, (104, 98)), (30, (92, 110)),
                  (36, (102, 96)), (42, (96, 106)), (48, (104, 98)), (54, (93, 109)), (60, (101, 97)), (E, (100, 100))], EASE)
    flame = smooth_path([(0, -150), (34, -70), (0, -30), (-34, -70)], 0.3)
    c.layer([group([flame, gradient([(0, '#fff7c2'), (0.45, '#ffd166'), (1, '#ff7b00')], (0, -140), (0, -30))])], p=(0, -26), a=(0, -26), s=flick, parent=n)
    inner = smooth_path([(0, -100), (14, -60), (0, -38), (-14, -60)], 0.3)
    c.layer([group([inner, fill('#ffffff', 85)])], p=(0, -26), a=(0, -26), s=flick, parent=n)
    rnd = random.Random(5)
    for i in range(10):
        t0 = 8 + i * 6
        x = 256 + rnd.uniform(-40, 40)
        p0 = Anim([(t0, (x, 220)), (t0 + 30, (x + rnd.uniform(-50, 50), 70))], LIN)
        o = Anim([(t0, 0), (t0 + 6, 100), (t0 + 30, 0)], LIN)
        c.layer([group([ellipse(rnd.uniform(6, 11)), fill('#ffd166')])], p=p0, o=o, ip=t0, op=t0 + 31)
    for i, (x, y) in enumerate([(120, 170), (390, 160), (400, 380), (110, 390)]):
        sparkle(c, x, y, 14 + i * 9, 28, '#fff3b0')
    return c


# =====================================================================================
# MEDIUM GIFTS (720 x 720)
# =====================================================================================
def balloons():
    c = Comp('balloons', 720, 720, 3.2)
    E = c.op
    cols = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#ff9f1c', '#f72585']
    rnd = random.Random(9)
    for i, col in enumerate(cols):
        x = 80 + i * 95 + rnd.uniform(-20, 20)
        t0 = rnd.randint(0, 20)
        dur = rnd.randint(70, 85)
        keys = [(t0 + k * dur / 4, (x + (25 if k % 2 else -25), 860 - k * (1060 / 4))) for k in range(5)]
        n = c.null(p=Anim(keys, EASE), r=Anim([(t0, -6), (t0 + dur / 2, 6), (t0 + dur, -4)], EASE), ip=t0, op=min(E, t0 + dur + 1))
        c.layer([group([path([(0, 62), (12, 110), (-8, 160), (6, 210)], [(0, 0), (-10, -12), (10, -12), (0, 0)], [(0, 0), (10, 12), (-10, 12), (0, 0)], closed=False), stroke('#ffffff', 3, 80)])], parent=n, ip=t0, op=min(E, t0 + dur + 1))
        c.layer([group([path([(-10, 70), (10, 70), (0, 56)]), fill(col)])], parent=n, ip=t0, op=min(E, t0 + dur + 1))
        light = '#ffffff'
        c.layer([group([ellipse(110, 132), gradient([(0, light), (0.25, col), (1, col)], (-30, -50), (40, 60))], p=(0, 0))], parent=n, ip=t0, op=min(E, t0 + dur + 1))
        c.layer([group([ellipse(22, 34), fill('#ffffff')], p=(-28, -32), r=25)], o=55, parent=n, ip=t0, op=min(E, t0 + dur + 1))
    confetti(c, 22, n=46, dur=55)
    return c


def crown():
    c = Comp('crown', 720, 720, 3.0)
    E = c.op
    rays(c, 360, 360, 18, 380, 36, '#ffd60a', 0, E, opacity=35, spin=70)
    glow(c, 360, 360, 300, '#ffb703', 0, E, peak=60)
    pos = Anim([(0, (360, -160)), (16, (360, 380)), (22, (360, 345)), (28, (360, 370)), (E - 12, (360, 360)), (E, (360, 300))], OUT)
    n = c.null(p=pos, s=Anim([(0, 90), (15, 100), (17, (115, 85)), (23, (96, 104)), (28, 100), (E - 10, 100), (E, 70)], EASE),
               r=Anim([(0, -12), (16, 4), (26, -2), (32, 0)], EASE), o=fade_out(E))
    gold = gradient([(0, '#fff1a8'), (0.45, '#ffc300'), (1, '#b7791f')], (0, -120), (0, 90))
    body = path([(-170, 60), (-180, -80), (-95, 0), (0, -130), (95, 0), (180, -80), (170, 60)])
    c.layer([group([body, gold, stroke('#8a5a00', 5, 80)])], parent=n)
    c.layer([group([rect(360, 64, 0, 76, 14), gradient([(0, '#ffd166'), (1, '#9a6700')], (0, 44), (0, 108)), stroke('#8a5a00', 5, 80)])], parent=n)
    tips = [group([ellipse(34), fill('#fff1a8'), stroke('#b7791f', 4)], p=pt) for pt in [(-180, -86), (0, -138), (180, -86), (-95, -6), (95, -6)]]
    c.layer(tips, parent=n)
    jewels = [group([ellipse(44), gradient([(0, '#ff8fa3'), (1, '#c9184a')], (0, -22), (0, 22)), stroke('#ffffff', 3, 70)], p=(0, 76)),
              group([ellipse(32), gradient([(0, '#90e0ef'), (1, '#0077b6')], (0, -16), (0, 16))], p=(-110, 76)),
              group([ellipse(32), gradient([(0, '#95d5b2'), (1, '#2d6a4f')], (0, -16), (0, 16))], p=(110, 76)),
              group([polygon(4, 22), fill('#e0aaff')], p=(0, -40))]
    c.layer(jewels, parent=n)
    c.layer([group([path([(-20, -100), (14, -100), (-30, 110), (-64, 110)]), fill('#ffffff', 45)])],
            p=Anim([(26, (-200, 0)), (50, (200, 0))], EASE), o=Anim([(26, 0), (34, 100), (46, 100), (50, 0)], LIN), ip=26, op=51, parent=n)
    burst(c, 360, 380, 16, n=18, radius=320, colors=('#ffd60a', '#fff3b0', '#ffb703'), size=(20, 32), shape='star', dur=26)
    for i, (x, y) in enumerate([(180, 274), (360, 222), (540, 274), (180, 470), (560, 470)]):
        sparkle(c, x, y, 24 + i * 7, 38)
    return c


def ring():
    c = Comp('ring', 720, 720, 3.0)
    E = c.op
    rays(c, 360, 300, 20, 380, 26, '#e0fbfc', 0, E, opacity=45, spin=-60)
    glow(c, 360, 300, 300, '#90e0ef', 0, E, peak=60)
    spin = Anim([(0, (0, 0)), (10, (110, 110)), (18, (20, 100)), (26, (100, 100)), (34, (30, 100)), (42, (100, 100)), (E - 10, (100, 100)), (E, (60, 60))], EASE)
    n = c.null(p=Anim([(0, (360, 400)), (40, (360, 380)), (E, (360, 330))], EASE), s=spin, o=fade_out(E))
    c.layer([group([ellipse(290, 290), stroke('#b7791f', 30)], p=(0, 80)), group([ellipse(290, 290), stroke('#ffd166', 14)], p=(0, 76)),
             group([ellipse(262, 262), stroke('#fff1a8', 4, 70)], p=(0, 74))], parent=n)
    gem_top = path([(-90, -70), (-50, -120), (50, -120), (90, -70)])
    gem_bot = path([(-90, -70), (90, -70), (0, 30)])
    facets = [group([path([(-50, -120), (-25, -70), (0, -120), (25, -70), (50, -120)], closed=False), stroke('#ffffff', 3, 80)]),
              group([path([(-90, -70), (-25, -70), (0, 30), (25, -70), (90, -70)], closed=False), stroke('#ffffff', 3, 60)])]
    c.layer([group([gem_bot, gradient([(0, '#caf0f8'), (1, '#48cae4')], (0, -70), (0, 30))]), group([gem_top, gradient([(0, '#ffffff'), (1, '#90e0ef')], (0, -120), (0, -70))])] + facets,
            p=(0, -40), parent=n)
    c.layer([group([rect(10, 26, x, -48, 3), fill('#ffd166')]) for x in (-70, 70)], parent=n)
    for i in range(6):
        sparkle(c, 360 + [-60, 50, -20, 70, -80, 20][i], 230 + [-40, -20, 20, 0, 10, -60][i], 20 + i * 9, 44, '#e0fbfc')
    burst(c, 360, 300, 22, n=16, radius=300, colors=('#ffffff', '#90e0ef', '#caf0f8'), size=(14, 24), shape='star', dur=26)
    return c


def fireworks():
    c = Comp('fireworks', 720, 900, 3.6)
    E = c.op
    shots = [(200, 300, 0, ('#ff4d6d', '#ffccd5')), (520, 250, 12, ('#ffd60a', '#fff3b0')), (360, 420, 24, ('#4cc9f0', '#caf0f8')),
             (150, 520, 36, ('#c77dff', '#e0aaff')), (560, 480, 46, ('#06d6a0', '#b7efc5')), (360, 200, 58, ('#ff9f1c', '#ffffff'))]
    for i, (x, y, t0, cols) in enumerate(shots):
        rise = 16
        c.layer([group([ellipse(10), fill(cols[1])])], p=Anim([(t0, (x + 30, 920)), (t0 + rise, (x, y))], OUT), o=Anim([(t0, 100), (t0 + rise, 100), (t0 + rise + 1, 0)], LIN), ip=t0, op=t0 + rise + 1)
        c.layer([group([rect(4, 60), fill(cols[1], 60)])], p=Anim([(t0, (x + 30, 950)), (t0 + rise, (x, y + 30))], OUT), o=Anim([(t0, 60), (t0 + rise, 0)], LIN), ip=t0, op=t0 + rise + 1)
        b = t0 + rise
        glow(c, x, y, 160, cols[0], b, min(E, b + 26), peak=55)
        burst(c, x, y, b, n=34, radius=270, colors=cols, size=(12, 20), dur=32, rnd=random.Random(i), gravity=50)
        burst(c, x, y, b + 2, n=12, radius=110, colors=('#ffffff',), size=(6, 10), dur=24, rnd=random.Random(i + 50), shape='star', gravity=20)
        ring_wave(c, x, y, b, cols[1], 20, 300, 4, 18)
    return c


# =====================================================================================
# LARGE / SUPER GIFTS (720 x 1280, full screen)
# =====================================================================================
def car():
    c = Comp('car', 720, 1280, 4.5)
    E = c.op
    Y = 760
    rnd = random.Random(21)
    for i in range(16):  # speed lines
        t0 = rnd.randint(0, 26) if i < 10 else rnd.randint(96, 116)
        y = Y + rnd.uniform(-160, 120)
        c.layer([group([rect(rnd.uniform(120, 260), 5, 0, 0, 2), fill('#ffffff', 70)])], p=Anim([(t0, (900, y)), (t0 + 12, (-200, y))], LIN), ip=t0, op=t0 + 13)
    glow(c, 360, Y + 80, 330, '#ff006e', 20, 110, peak=45)
    c.layer([group([rect(720, 8, 0, 0, 4), gradient([(0, '#ffffff'), (1, '#ffffff')], (-360, 0), (360, 0), alpha=[(0, 0), (0.5, 0.8), (1, 0)])])],
            p=(360, Y + 112), o=Anim([(20, 0), (32, 100), (100, 100), (115, 0)], LIN))
    pos = Anim([(0, (-480, Y)), (30, (360, Y)), (96, (360, Y)), (122, (1250, Y))], OUT)
    pos.keys = [(0, (-480, Y)), (30, (360, Y)), (96, (360, Y)), (122, (1250, Y))]
    n = c.null(p=pos, s=Anim([(28, 100), (31, (104, 94)), (36, (98, 102)), (40, 100)], EASE))
    c.layer([group([ellipse(560, 50), fill('#000000', 35)], p=(0, 92))], parent=n)
    cone = group([path([(250, -10), (720, -120), (720, 110)]), gradient([(0, '#fff3b0'), (1, '#fff3b0')], (250, 0), (720, 0), alpha=[(0, 0.75), (1, 0)])])
    c.layer([cone], o=Anim([(28, 0), (40, 90), (90, 90), (100, 0)], LIN), parent=n)
    body = smooth_path([(-280, 48), (-286, -6), (-230, -36), (-130, -48), (-60, -112), (80, -116), (170, -56), (262, -40), (292, 4), (284, 48)], 0.12)
    c.layer([group([body, gradient([(0, '#ff595e'), (0.5, '#d00000'), (1, '#6a040f')], (0, -116), (0, 50)), stroke('#3d0008', 4, 60)])], parent=n)
    c.layer([group([path([(-50, -100), (72, -104), (140, -52), (-104, -46)]), gradient([(0, '#4a5d7e'), (1, '#0b132b')], (0, -104), (0, -46))]),
             group([path([(18, -100), (28, -100), (16, -48), (6, -48)]), fill('#d00000')]),
             group([path([(-30, -96), (0, -96), (-40, -52), (-70, -52)]), fill('#ffffff', 25)])], parent=n)
    c.layer([group([path([(-250, 0), (250, -16)], closed=False), stroke('#ffffff', 5, 45)]),
             group([ellipse(30, 18), fill('#fff3b0')], p=(270, -12)), group([ellipse(24, 16), fill('#ff4d6d')], p=(-272, -8))], parent=n)
    spin = Anim([(0, 0), (30, 1440), (96, 1440), (122, 2900)], OUT)
    for wx in (-170, 180):
        c.layer([group([ellipse(124), fill('#111111')]), group([ellipse(76), gradient([(0, '#f8f9fa'), (1, '#6c757d')], (0, -38), (0, 38))]),
                 group([star(5, 34, 12), fill('#343a40')]), group([ellipse(18), fill('#adb5bd')])], p=(wx, 52), r=spin, parent=n)
    burst(c, 160, Y + 70, 28, n=14, radius=170, colors=('#adb5bd', '#dee2e6'), size=(16, 30), dur=24, rnd=random.Random(4))
    for i, (x, y) in enumerate([(300, Y - 100), (440, Y - 60), (220, Y - 20), (520, Y - 10)]):
        sparkle(c, x, y, 40 + i * 9, 46)
    return c


def rocket():
    c = Comp('rocket', 720, 1280, 4.5)
    E = c.op
    rnd = random.Random(31)
    for i in range(30):
        t0 = rnd.randint(30, 110)
        x = rnd.uniform(20, 700)
        c.layer([group([rect(4, rnd.uniform(40, 120), 0, 0, 2), fill('#ffffff', 70)])], p=Anim([(t0, (x, -100)), (t0 + 14, (x, 1400))], LIN), ip=t0, op=t0 + 15)
    for i in range(18):  # launch smoke
        t0 = rnd.randint(0, 26)
        x = 360 + rnd.uniform(-200, 200)
        s0 = rnd.uniform(60, 130)
        c.layer([group([ellipse(s0), fill('#e9ecef')])], p=Anim([(t0, (360, 1240)), (t0 + 40, (x, 1240 - rnd.uniform(0, 160)))], OUT),
                s=Anim([(t0, 40), (t0 + 40, 220)], OUT), o=Anim([(t0, 90), (t0 + 40, 0)], LIN), ip=t0, op=t0 + 41)
    pos = Anim([(0, (360, 1500)), (40, (360, 700)), (46, (366, 694)), (52, (354, 706)), (58, (364, 698)), (64, (356, 702)), (70, (362, 698)), (80, (360, 700)), (124, (360, -400))], EASE)
    n = c.null(p=pos)
    glow(c, 0, 220, 180, '#ff9f1c', 0, 126, peak=70, parent=n)
    flick = Anim([(k, (100 + (8 if k % 2 else -8), 100 + (-12 if k % 2 else 14))) for k in range(0, 128, 4)], EASE)
    c.layer([group([smooth_path([(0, 360), (60, 190), (0, 130), (-60, 190)], 0.3), gradient([(0, '#fff7c2'), (0.4, '#ffd166'), (1, '#ff4800')], (0, 140), (0, 360))])], p=(0, 130), a=(0, 130), s=flick, parent=n)
    c.layer([group([smooth_path([(0, 260), (26, 180), (0, 140), (-26, 180)], 0.3), fill('#ffffff', 85)])], p=(0, 130), a=(0, 130), s=flick, parent=n)
    fin = gradient([(0, '#ff595e'), (1, '#9d0208')], (0, 40), (0, 160))
    c.layer([group([path([(-80, 40), (-150, 150), (-150, 180), (-74, 130)]), fin]), group([path([(80, 40), (150, 150), (150, 180), (74, 130)]), fin]),
             group([rect(20, 120, 0, 120, 10), fin])], parent=n)
    body = smooth_path([(0, -260), (78, -120), (84, 120), (60, 140), (-60, 140), (-84, 120), (-78, -120)], 0.18)
    c.layer([group([body, gradient([(0, '#ffffff'), (0.6, '#dee2e6'), (1, '#adb5bd')], (-84, 0), (84, 0)), stroke('#6c757d', 4, 60)])], parent=n)
    c.layer([group([smooth_path([(0, -262), (52, -170), (-52, -170)], 0.2), gradient([(0, '#ff595e'), (1, '#9d0208')], (0, -260), (0, -170))])], parent=n)
    c.layer([group([ellipse(84), fill('#adb5bd')], p=(0, -60)), group([ellipse(64), gradient([(0, '#90e0ef'), (1, '#023e8a')], (0, -32), (0, 32))], p=(0, -60)),
             group([ellipse(18, 12), fill('#ffffff', 80)], p=(-14, -74), r=-30)], parent=n)
    for i, (x, y) in enumerate([(200, 560), (520, 600), (240, 820), (500, 860)]):
        sparkle(c, x, y, 44 + i * 6, 44)
    return c


def love_storm():
    c = Comp('lovestorm', 720, 1280, 4.5)
    E = c.op
    rnd = random.Random(41)
    cols = ['#ff4d6d', '#ff8fab', '#c9184a', '#ffccd5', '#f72585', '#ff0a54']
    for i in range(48):
        t0 = rnd.randint(0, 80)
        x = rnd.uniform(30, 690)
        sz = rnd.uniform(34, 96)
        dur = rnd.randint(46, 70)
        keys = [(t0 + k * dur / 3, (x + (40 if k % 2 else -40) * rnd.uniform(0.5, 1), 1360 - k * 1500 / 3)) for k in range(4)]
        c.layer(heart_items(sz, hexc(rnd.choice(cols))), p=Anim(keys, EASE), r=Anim([(t0, -20), (t0 + dur, 20)], EASE),
                o=Anim([(t0, 0), (t0 + 6, 90), (t0 + dur - 10, 90), (t0 + dur, 0)], LIN), ip=t0, op=t0 + dur + 1)
    glow(c, 360, 640, 360, '#ff0a54', 10, E, peak=55)
    beat = Anim([(10, 0), (20, 125), (25, 92), (30, 110), (34, 100), (46, 116), (51, 97), (58, 100), (70, 114), (75, 98), (82, 100), (E - 12, 100), (E, 60)], EASE)
    n = c.null(p=(360, 640), s=beat, o=Anim([(10, 100), (E - 12, 100), (E, 0)], LIN), ip=10)
    c.layer(heart_items(330, grad=gradient([(0, '#ff8fab'), (0.5, '#ff0a54'), (1, '#800f2f')], (0, -160), (0, 170))), parent=n, ip=10)
    c.layer([group([ellipse(64, 34), fill('#ffffff')], p=(-80, -80), r=-35)], o=60, parent=n, ip=10)
    for t in (20, 46, 70):
        ring_wave(c, 360, 640, t, '#ffccd5', 120, 760, 10, 24)
    burst(c, 360, 640, 22, n=20, radius=420, colors=cols, size=(26, 44), shape='heart', dur=32)
    for i in range(8):
        sparkle(c, rnd.uniform(80, 640), rnd.uniform(300, 1000), 20 + i * 10, 44, '#fff0f3')
    return c


def palace():
    c = Comp('palace', 720, 1280, 5.0)
    E = c.op
    rays(c, 360, 640, 22, 700, 50, '#ffd60a', 30, E, opacity=25, spin=40)
    glow(c, 360, 620, 420, '#c77dff', 0, E, peak=50)
    glow(c, 360, 560, 260, '#ffd166', 30, E, peak=55)
    n = c.null(p=Anim([(0, (360, 1550)), (40, (360, 820)), (E - 15, (360, 810)), (E, (360, 860))], OUT), o=Anim([(0, 100), (E - 12, 100), (E, 0)], LIN))
    gold = lambda y0, y1: gradient([(0, '#fff1a8'), (0.5, '#ffc300'), (1, '#9a6700')], (0, y0), (0, y1))
    dark = '#4a2c00'
    c.layer([group([rect(640, 60, 0, 250, 8), gold(220, 280)]), group([rect(600, 26, 0, 210, 4), gold(197, 223)])], parent=n)
    for mx in (-290, 290):  # minarets
        c.layer([group([rect(44, 400, mx, 30, 6), gold(-170, 230)]), group([rect(60, 16, mx, -60, 4), gold(-68, -52)]), group([rect(60, 16, mx, 60, 4), gold(52, 68)]),
                 group([ellipse(64, 56), gold(-210, -150)], p=(mx, -190)), group([rect(6, 40, mx, -232, 3), fill('#ffd166')]), group([ellipse(12), fill('#fff1a8')], p=(mx, -254))], parent=n)
    c.layer([group([rect(420, 220, 0, 100, 6), gold(-10, 210)]), stroke_group := group([rect(420, 220, 0, 100, 6), stroke('#7a4f00', 4, 60)])], parent=n)
    arches = []
    for ax, w, h in [(0, 110, 150), (-140, 70, 100), (140, 70, 100)]:
        top = 210 - h
        arches.append(group([path([(-w / 2, 210), (-w / 2, top + w / 2), (0, top), (w / 2, top + w / 2), (w / 2, 210)],
                                  [(0, 0), (0, 0), (-w / 3, 0), (0, -w / 3), (0, 0)], [(0, 0), (0, -w / 3), (w / 3, 0), (0, 0), (0, 0)]), fill(dark, 85)], p=(ax, 0)))
    c.layer(arches, parent=n)
    for sx in (-150, 150):  # side chhatris
        c.layer([group([rect(90, 70, sx, -45, 4), gold(-80, -10)]), group([ellipse(110, 96), gold(-150, -60)], p=(sx, -100)), group([rect(6, 36, sx, -160, 3), fill('#ffd166')])], parent=n)
    c.layer([group([rect(200, 60, 0, -40, 6), gold(-70, -10)])], parent=n)
    dome = smooth_path([(0, -330), (60, -260), (130, -150), (110, -70), (-110, -70), (-130, -150), (-60, -260)], 0.22)
    c.layer([group([dome, gold(-330, -70)]), group([dome, stroke('#7a4f00', 4, 50)]), group([rect(8, 70, 0, -360, 3), fill('#ffd166')]), group([ellipse(20), fill('#fff1a8')], p=(0, -400)),
             group([ellipse(60, 110), fill('#ffffff', 25)], p=(-50, -200), r=20)], parent=n)
    for i, (x, y, t0, cols) in enumerate([(200, 240, 46, ('#ff4d6d', '#ffccd5')), (520, 220, 60, ('#4cc9f0', '#ffffff')), (360, 160, 78, ('#ffd60a', '#fff3b0')), (150, 330, 96, ('#c77dff', '#ffffff')), (570, 320, 110, ('#06d6a0', '#ffffff'))]):
        burst(c, x, y, t0, n=24, radius=170, colors=cols, size=(9, 15), dur=28, rnd=random.Random(60 + i), gravity=30)
        glow(c, x, y, 120, cols[0], t0, t0 + 24, peak=50)
    for i, (x, y) in enumerate([(360, 430), (210, 640), (510, 640), (360, 580), (90, 660), (630, 660)]):
        sparkle(c, x, y, 44 + i * 11, 46)
    return c


def meteor():
    c = Comp('meteor', 720, 1280, 5.0)
    E = c.op
    rnd = random.Random(51)
    for i in range(46):  # twinkling stars
        t0 = rnd.randint(0, 30)
        c.layer([group([ellipse(rnd.uniform(3, 7)), fill('#ffffff')])], p=(rnd.uniform(0, 720), rnd.uniform(0, 1280)),
                o=Anim([(t0, 0), (t0 + 10, 90), (t0 + 40, 30), (t0 + 70, 90), (E - 10, 60), (E, 0)], EASE), ip=t0)
    ang = math.radians(125)  # travel direction: down-left
    dx, dy = math.cos(ang), math.sin(ang)
    for i in range(30):
        t0 = rnd.randint(0, 120)
        sx, sy = rnd.uniform(200, 900), rnd.uniform(-200, 600)
        L = rnd.uniform(200, 380)
        dur = rnd.randint(14, 24)
        tail = group([rect(L, 8, -L / 2, 0, 4), gradient([(0, '#ffffff'), (1, '#ffd166')], (-L, 0), (0, 0), alpha=[(0, 0), (1, 0.95)])])
        head = group([ellipse(18), fill('#ffffff')])
        c.layer([tail, head], p=Anim([(t0, (sx, sy)), (t0 + dur, (sx + dx * 1100, sy + dy * 1100))], LIN), r=math.degrees(ang),
                o=Anim([(t0, 0), (t0 + 3, 100), (t0 + dur - 4, 100), (t0 + dur, 0)], LIN), ip=t0, op=t0 + dur + 1)
    # the big one
    t0 = 60
    big = c.null(p=Anim([(t0, (820, -120)), (t0 + 34, (360, 640))], IN), r=math.degrees(ang), ip=t0, op=t0 + 35)
    c.layer([group([rect(520, 26, -260, 0, 13), gradient([(0, '#ff7b00'), (1, '#fff3b0')], (-520, 0), (0, 0), alpha=[(0, 0), (1, 1)])]),
             group([ellipse(70), gradient([(0, '#ffffff'), (1, '#ffd166')], (0, 0), (35, 0), radial=True)])], parent=big, ip=t0, op=t0 + 35)
    glow(c, 0, 0, 120, '#ffd166', t0, t0 + 35, pulse=False, peak=80, parent=big)
    hit = t0 + 34
    glow(c, 360, 640, 520, '#fff3b0', hit, hit + 30, peak=85)
    for k in range(3):
        ring_wave(c, 360, 640, hit + k * 6, ['#ffffff', '#ffd166', '#ff7b00'][k], 60, 1100, 14, 26)
    burst(c, 360, 640, hit, n=30, radius=520, colors=('#ffffff', '#ffd166', '#ff9f1c'), size=(14, 26), shape='streak', dur=30)
    burst(c, 360, 640, hit + 4, n=16, radius=360, colors=('#ffffff',), size=(20, 34), shape='star', dur=28, rnd=random.Random(2))
    return c


def galaxy():
    c = Comp('galaxy', 720, 1280, 5.0)
    E = c.op
    glow(c, 360, 640, 520, '#7b2cbf', 0, E, peak=55)
    glow(c, 360, 640, 260, '#4cc9f0', 0, E, peak=55)
    n = c.null(p=(360, 640), s=Anim([(0, 20), (30, 100), (E - 14, 108), (E, 60)], OUT), r=Anim([(0, 0), (E, 150)], LIN), o=Anim([(0, 0), (12, 100), (E - 12, 100), (E, 0)], LIN))
    rnd = random.Random(61)
    dots = []
    for arm in range(3):
        for k in range(46):
            tt = k / 46
            a = arm * 2 * math.pi / 3 + tt * 3.4 * math.pi / 2 + rnd.uniform(-0.12, 0.12)
            rr = 30 + tt * 330 + rnd.uniform(-14, 14)
            col = rnd.choice(['#ffffff', '#caf0f8', '#e0aaff', '#ffccd5', '#90e0ef'])
            dots.append(group([ellipse(rnd.uniform(4, 12) * (1.2 - tt * 0.5)), fill(col)], p=(math.cos(a) * rr, math.sin(a) * rr * 0.62)))
    c.layer(dots, parent=n)
    c.layer([group([ellipse(110, 80), gradient([(0, '#ffffff'), (1, '#ffffff')], (0, 0), (55, 0), radial=True, alpha=[(0, 1), (1, 0)])])], parent=n)
    pl = c.null(p=Anim([(20, (560, 1080)), (40, (540, 960)), (90, (540, 940)), (E, (540, 960))], EASE), s=Anim([(20, 0), (40, 100)], OUT), ip=20)
    c.layer([group([ellipse(260, 70), stroke('#e0aaff', 8, 80)], r=-18)], parent=pl, ip=20)
    c.layer([group([ellipse(150), gradient([(0, '#ffd166'), (0.6, '#f77f00'), (1, '#9d0208')], (-50, -60), (60, 70))])], parent=pl, ip=20)
    c.layer([group([path([(-130, 20), (130, -64)], [(0, 0), (60, 30)], [(60, 30), (0, 0)], closed=False), stroke('#e0aaff', 8, 80)], r=0)], parent=pl, ip=20)
    for i in range(4):
        t0 = 30 + i * 22
        sx, sy = rnd.uniform(500, 760), rnd.uniform(0, 400)
        c.layer([group([rect(200, 4, -100, 0, 2), gradient([(0, '#ffffff'), (1, '#ffffff')], (-200, 0), (0, 0), alpha=[(0, 0), (1, 1)])]), group([ellipse(10), fill('#ffffff')])],
                p=Anim([(t0, (sx, sy)), (t0 + 18, (sx - 600, sy + 420))], LIN), r=145, o=Anim([(t0, 0), (t0 + 3, 100), (t0 + 15, 100), (t0 + 18, 0)], LIN), ip=t0, op=t0 + 19)
    for i in range(10):
        sparkle(c, rnd.uniform(60, 660), rnd.uniform(200, 1100), 14 + i * 11, 40, '#e0aaff')
    return c


# =====================================================================================
# ENTRY EFFECTS (720 x 200). The app draws avatar + name on top (left side).
# =====================================================================================
def entry(name, c1, c2, accent, particle):
    c = Comp(name, 720, 200, 3.0)
    E = c.op
    band = c.null(p=Anim([(0, (-420, 100)), (14, (360, 100)), (74, (360, 100)), (88, (1150, 100))], OUT), o=Anim([(0, 100), (78, 100), (88, 0)], LIN))
    glow(c, 0, 0, 340, c2, 6, 88, peak=45, parent=band)
    c.layer([group([rect(660, 124, 0, 0, 62), gradient([(0, c1), (1, c2)], (-330, 0), (330, 0), alpha=[(0, 0.97), (0.75, 0.9), (1, 0.15)]), stroke(accent, 4, 85)])], parent=band)
    c.layer([group([rect(640, 4, 10, -48, 2), gradient([(0, '#ffffff'), (1, '#ffffff')], (-320, 0), (320, 0), alpha=[(0, 0), (0.4, 0.8), (1, 0)])])], parent=band)
    c.layer([group([path([(-14, -58), (24, -58), (-6, 58), (-44, 58)]), fill('#ffffff', 55)])], p=Anim([(16, (-240, 0)), (40, (280, 0))], EASE),
            o=Anim([(16, 0), (20, 100), (36, 100), (40, 0)], LIN), ip=16, op=41, parent=band)
    # left badge ring where the avatar sits
    c.layer([group([ellipse(118), stroke(accent, 6, dash=(30, 12))]), group([ellipse(132), stroke('#ffffff', 2, 60)])],
            p=(-262, 0), r=Anim([(0, 0), (E, 120)], LIN), parent=band)
    rnd = random.Random(sum(map(ord, name)))
    for i in range(14):
        t0 = rnd.randint(2, 60)
        x0, y0 = rnd.uniform(-300, 320), rnd.uniform(-60, 60)
        if particle == 'fire':
            g = group([smooth_path([(0, -18), (8, 0), (0, 8), (-8, 0)], 0.3), fill(rnd.choice(['#ffd166', '#ff7b00', '#ff4800']))])
            pos = Anim([(t0, (x0, y0)), (t0 + 22, (x0 - 20, y0 - 70))], LIN)
        elif particle == 'streak':
            g = group([rect(rnd.uniform(40, 90), 4, 0, 0, 2), fill(rnd.choice([accent, '#ffffff']))])
            pos = Anim([(t0, (x0 + 120, y0)), (t0 + 14, (x0 - 220, y0))], LIN)
        else:
            g = group([star(4 if particle == 'sparkle' else 5, 9, 3), fill(rnd.choice([accent, '#ffffff']))])
            pos = Anim([(t0, (x0, y0)), (t0 + 22, (x0 - 60, y0 + rnd.uniform(-30, 30)))], LIN)
        c.layer([g], p=pos, o=Anim([(t0, 0), (t0 + 4, 100), (t0 + 18, 100), (t0 + 22, 0)], LIN), ip=t0, op=t0 + 23, parent=band)
    if name == 'entry_royal':
        cr = group([path([(-26, 12), (-28, -14), (-12, 0), (0, -22), (12, 0), (28, -14), (26, 12)]), fill('#ffd60a'), stroke('#9a6700', 2)])
        c.layer([cr], p=(-262, -74), parent=band)
    return c


# =====================================================================================
# AVATAR FRAMES (300 x 300, seamless 2 s loop). Avatar sits in the centre (diameter ~200).
# =====================================================================================
def frame(name, c1, c2, orbit):
    c = Comp(name, 300, 300, 2.0)
    E = c.op
    c.layer([group([ellipse(250), gradient([(0, c1), (1, c1)], (0, 0), (125, 0), radial=True, alpha=[(0, 0), (0.78, 0), (0.86, 0.55), (1, 0)])])],
            o=Anim([(0, 60), (E / 2, 100), (E, 60)], EASE))
    c.layer([group([ellipse(222), stroke(c1, 10, 100, dash=(38, 16), dash_offset=0)])], r=Anim([(0, 0), (E, 360)], LIN))
    c.layer([group([ellipse(236), stroke(c2, 3, 80, dash=(6, 10))])], r=Anim([(0, 0), (E, -360)], LIN))
    orb = c.null(p=(150, 150), r=Anim([(0, 0), (E, 360)], LIN))
    for i in range(3):
        a = math.radians(i * 120)
        x, y = math.cos(a) * 114, math.sin(a) * 114
        if orbit == 'heart':
            items = heart_items(26, hexc(c2))
        else:
            items = [group([star(5 if orbit == 'star' else 4, 15, 6), fill(c2)])]
        c.layer(items, p=(x, y), s=Anim([(0, 80), (E / 2, 120), (E, 80)], EASE), parent=orb)
    if name == 'frame_royal':
        cr = group([path([(-30, 14), (-32, -16), (-14, 0), (0, -26), (14, 0), (32, -16), (30, 14)]), gradient([(0, '#fff1a8'), (1, '#b7791f')], (0, -26), (0, 14)), stroke('#7a4f00', 2)])
        c.layer([cr], p=(150, 34))
    return c


ALL = [rose, heart, chai, samosa, lucky_star, diya, balloons, crown, ring, fireworks, car, rocket, love_storm, palace, meteor, galaxy]

if __name__ == '__main__':
    for fn in ALL:
        comp = fn()
        comp.save(os.path.join(OUT_DIR, f'{comp.name}.json'))
    for args in [('entry_gold', '#b7791f', '#ffd166', '#fff1a8', 'sparkle'), ('entry_neon', '#3a0ca3', '#f72585', '#4cc9f0', 'streak'),
                 ('entry_royal', '#3c096c', '#9d4edd', '#ffd60a', 'star'), ('entry_fire', '#9d0208', '#ff7b00', '#ffd166', 'fire')]:
        entry(*args).save(os.path.join(OUT_DIR, f'{args[0]}.json'))
    for args in [('frame_gold', '#ffc300', '#fff1a8', 'star'), ('frame_neon', '#4cc9f0', '#f72585', 'sparkle'),
                 ('frame_hearts', '#ff4d6d', '#ff8fab', 'heart'), ('frame_royal', '#9d4edd', '#ffd60a', 'star')]:
        frame(*args).save(os.path.join(OUT_DIR, f'{args[0]}.json'))
    print('written', len(os.listdir(OUT_DIR)), 'files to', OUT_DIR)
