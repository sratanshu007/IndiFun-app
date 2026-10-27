"""Small toolkit to author Lottie (bodymovin) animations in Python.

All artwork here is original: simple vector shapes animated with keyframes.
Output JSON plays in lottie-web, lottie-react-native, Flutter `lottie`, Android and iOS Lottie.
"""
import json
import math
import random

FPS = 30

# ---------- colours ----------
def hexc(h, a=1.0):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [a]


# ---------- easing ----------
EASE = ({'x': [0.42], 'y': [0]}, {'x': [0.58], 'y': [1]})          # ease in-out
OUT = ({'x': [0.16], 'y': [0.6]}, {'x': [0.3], 'y': [1]})           # fast start, soft stop
IN = ({'x': [0.6], 'y': [0]}, {'x': [0.9], 'y': [0.5]})             # slow start
LIN = ({'x': [0], 'y': [0]}, {'x': [1], 'y': [1]})


class Anim:
    """Keyframed value: Anim([(frame, value), ...], ease=EASE)."""

    def __init__(self, keys, ease=EASE):
        self.keys = sorted(keys, key=lambda k: k[0])
        self.ease = ease


def _norm(kind, v):
    if kind in ('p', 'a'):
        return [float(v[0]), float(v[1]), 0.0]
    if kind == 's':
        if isinstance(v, (int, float)):
            return [float(v), float(v), 100.0]
        return [float(v[0]), float(v[1]), 100.0]
    if kind in ('2d',):
        if isinstance(v, (int, float)):
            return [float(v), float(v)]
        return [float(v[0]), float(v[1])]
    if kind == 'col':
        return list(v)
    if isinstance(v, (list, tuple)):
        return [float(x) for x in v]
    return [float(v)]


def prop(v, kind='1d'):
    if isinstance(v, Anim):
        out = []
        for idx, (t, val) in enumerate(v.keys):
            k = {'t': t, 's': _norm(kind, val)}
            if idx < len(v.keys) - 1:
                o, i = v.ease
                k['o'] = o
                k['i'] = i
            out.append(k)
        return {'a': 1, 'k': out}
    n = _norm(kind, v)
    return {'a': 0, 'k': n if len(n) > 1 else n[0]}


# ---------- shape items ----------
def ellipse(w, h=None, x=0, y=0):
    return {'ty': 'el', 'd': 1, 'p': prop((x, y), '2d'), 's': prop(w if isinstance(w, Anim) else (w, h if h is not None else w), '2d')}


def rect(w, h, x=0, y=0, r=0):
    return {'ty': 'rc', 'd': 1, 'p': prop((x, y), '2d'), 's': prop((w, h), '2d'), 'r': prop(r)}


def star(points, outer, inner, x=0, y=0, rot=0, roundness=0):
    return {'ty': 'sr', 'sy': 1, 'd': 1, 'pt': prop(points), 'p': prop((x, y), '2d'), 'r': prop(rot),
            'ir': prop(inner), 'is': prop(roundness), 'or': prop(outer), 'os': prop(roundness)}


def polygon(points, radius, x=0, y=0, rot=0):
    return {'ty': 'sr', 'sy': 2, 'd': 1, 'pt': prop(points), 'p': prop((x, y), '2d'), 'r': prop(rot),
            'or': prop(radius), 'os': prop(0)}


def path(verts, ins=None, outs=None, closed=True):
    n = len(verts)
    ins = ins or [[0, 0]] * n
    outs = outs or [[0, 0]] * n
    return {'ty': 'sh', 'd': 1, 'ks': {'a': 0, 'k': {'c': closed, 'v': [list(map(float, p)) for p in verts],
                                                        'i': [list(map(float, p)) for p in ins], 'o': [list(map(float, p)) for p in outs]}}}


def smooth_path(verts, tension=0.35, closed=True):
    """Catmull-Rom style smoothing: gives soft organic outlines from a few points."""
    n = len(verts)
    ins, outs = [], []
    for i in range(n):
        p0 = verts[(i - 1) % n] if closed or i > 0 else verts[i]
        p2 = verts[(i + 1) % n] if closed or i < n - 1 else verts[i]
        dx, dy = (p2[0] - p0[0]) * tension, (p2[1] - p0[1]) * tension
        ins.append([-dx, -dy])
        outs.append([dx, dy])
    return path(verts, ins, outs, closed)


def fill(color, opacity=100):
    if isinstance(color, str):
        color = hexc(color)
    c = prop(color, 'col')
    return {'ty': 'fl', 'c': c, 'o': prop(opacity), 'r': 1}


def stroke(color, width, opacity=100, dash=None, dash_offset=0):
    if isinstance(color, str):
        color = hexc(color)
    s = {'ty': 'st', 'c': prop(color, 'col'), 'o': prop(opacity), 'w': prop(width), 'lc': 2, 'lj': 2, 'ml': 4}
    if dash:
        s['d'] = [{'n': 'd', 'nm': 'dash', 'v': prop(dash[0])}, {'n': 'g', 'nm': 'gap', 'v': prop(dash[1])},
                  {'n': 'o', 'nm': 'offset', 'v': prop(dash_offset)}]
    return s


def gradient(stops, start, end, radial=False, opacity=100, alpha=None):
    """stops: [(offset, '#hex'), ...]; alpha: optional [(offset, 0..1), ...]."""
    k = []
    for off, col in stops:
        k += [off] + hexc(col)[:3]
    if alpha:
        for off, a in alpha:
            k += [off, a]
    g = {'ty': 'gf', 'o': prop(opacity), 'r': 1, 'g': {'p': len(stops), 'k': {'a': 0, 'k': k}},
         's': prop(start, '2d'), 'e': prop(end, '2d'), 't': 2 if radial else 1}
    if radial:
        g['h'] = prop(0)
        g['a'] = prop(0)
    return g


def trim(start=0, end=100, offset=0):
    return {'ty': 'tm', 's': prop(start), 'e': prop(end), 'o': prop(offset), 'm': 1}


def tr(p=(0, 0), a=(0, 0), s=100, r=0, o=100):
    sv = s if isinstance(s, Anim) else ((s, s) if isinstance(s, (int, float)) else s)
    return {'ty': 'tr', 'p': prop(p, '2d'), 'a': prop(a, '2d'), 's': prop(sv, '2d'),
            'r': prop(r), 'o': prop(o), 'sk': prop(0), 'sa': prop(0)}


def group(items, p=(0, 0), s=100, r=0, o=100, a=(0, 0), name='g'):
    return {'ty': 'gr', 'nm': name, 'it': list(items) + [tr(p, a, s, r, o)]}


# ---------- composition ----------
class Comp:
    def __init__(self, name, w, h, seconds, fps=FPS):
        self.name, self.w, self.h, self.fps = name, w, h, fps
        self.op = int(round(seconds * fps))
        self.layers = []
        self._ind = 0

    def layer(self, shapes, p=None, s=100, r=0, o=100, a=(0, 0), ip=0, op=None, parent=None, name=None, masks=None):
        """Adds a shape layer. Layers added first are drawn on top (Lottie order)."""
        self._ind += 1
        if p is None:
            p = (0, 0) if parent else (self.w / 2, self.h / 2)
        ks = {'o': prop(o), 'r': prop(r), 'p': prop(p, 'p'), 'a': prop(a, 'a'), 's': prop(s, 's')}
        # Lottie paints the first shape item on top; we list shapes bottom-to-top, so reverse here.
        L = {'ddd': 0, 'ind': self._ind, 'ty': 4, 'nm': name or f'l{self._ind}', 'sr': 1, 'ks': ks, 'ao': 0,
             'shapes': list(reversed(shapes)), 'ip': ip, 'op': op if op is not None else self.op, 'st': 0, 'bm': 0}
        if parent:
            L['parent'] = parent
        if masks:
            L['hasMask'] = True
            L['masksProperties'] = masks
        self.layers.append(L)
        return self._ind

    def null(self, p=None, s=100, r=0, o=100, ip=0, op=None, name=None, parent=None):
        self._ind += 1
        if p is None:
            p = (0, 0) if parent else (self.w / 2, self.h / 2)
        ks = {'o': prop(o), 'r': prop(r), 'p': prop(p, 'p'), 'a': prop((0, 0), 'a'), 's': prop(s, 's')}
        L = {'ddd': 0, 'ind': self._ind, 'ty': 3, 'nm': name or f'n{self._ind}', 'sr': 1, 'ks': ks,
             'ao': 0, 'ip': ip, 'op': op if op is not None else self.op, 'st': 0, 'bm': 0}
        if parent:
            L['parent'] = parent
        self.layers.append(L)
        return self._ind

    def json(self):
        # Lottie does not pass a parent's opacity to its children, so copy a parent's (or grandparent's)
        # opacity onto children that have none of their own.
        import copy
        by_ind = {L['ind']: L for L in self.layers}
        for L in self.layers:
            o = L['ks']['o']
            if o.get('a') == 0 and o.get('k') in (100, [100]):
                par = by_ind.get(L.get('parent'))
                while par is not None:
                    po = par['ks']['o']
                    if not (po.get('a') == 0 and po.get('k') in (100, [100])):
                        L['ks']['o'] = copy.deepcopy(po)
                        break
                    par = by_ind.get(par.get('parent'))
        # Lottie draws the first layer on top; we add background-first, so reverse here.
        return {'v': '5.7.4', 'fr': self.fps, 'ip': 0, 'op': self.op, 'w': self.w, 'h': self.h, 'nm': self.name,
                'ddd': 0, 'assets': [], 'layers': list(reversed(self.layers)), 'markers': []}

    def save(self, path):
        def rnd(x):
            if isinstance(x, float):
                r = round(x, 2)
                return int(r) if r == int(r) else r
            if isinstance(x, list):
                return [rnd(v) for v in x]
            if isinstance(x, dict):
                return {k: rnd(v) for k, v in x.items()}
            return x
        with open(path, 'w') as f:
            json.dump(rnd(self.json()), f, separators=(',', ':'))


# ---------- reusable effects ----------
def heart_items(size, color=None, grad=None):
    """Heart made of a rotated square and two circles (classic construction)."""
    s = size / 1.6
    d = s / math.sqrt(2)
    sq = group([rect(s, s, 0, 0, s * 0.04)], r=45, name='sq')
    items = [sq, ellipse(s, s, -d / 2, -d / 2), ellipse(s, s, d / 2, -d / 2)]
    paint = grad if grad else fill(color)
    return [group(items + [paint], p=(0, d * 0.18), name='heart')]


def sparkle(comp, x, y, t0, size=24, color='#ffffff', dur=18, parent=None):
    """4-point twinkle that pops and spins."""
    sc = Anim([(t0, 0), (t0 + dur * 0.45, 100), (t0 + dur, 0)], OUT)
    rot = Anim([(t0, 0), (t0 + dur, 90)], LIN)
    shp = [group([star(4, size / 2, size / 9), fill(hexc(color))]), group([ellipse(size * 0.35), fill(hexc('#ffffff'))])]
    return comp.layer(shp, p=(x, y), s=sc, r=rot, ip=t0, op=t0 + dur + 1, parent=parent, name='fx_sparkle')


def burst(comp, cx, cy, t0, n=16, radius=180, colors=('#ffd700',), size=(10, 18), dur=22, rnd=None, shape='dot', parent=None, gravity=0):
    rnd = rnd or random.Random(7)
    for i in range(n):
        ang = (i / n) * 2 * math.pi + rnd.uniform(-0.15, 0.15)
        dist = radius * rnd.uniform(0.6, 1.05)
        sz = rnd.uniform(*size)
        col = hexc(rnd.choice(colors))
        ex, ey = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist + gravity
        if shape == 'star':
            g = group([star(5, sz / 2, sz / 4.5), fill(col)])
        elif shape == 'heart':
            g = heart_items(sz, col)[0]
        elif shape == 'streak':
            g = group([rect(sz * 2.2, sz * 0.35, 0, 0, sz * 0.2), fill(col)], r=math.degrees(ang))
        else:
            g = group([ellipse(sz), fill(col)])
        pos = Anim([(t0, (cx, cy)), (t0 + dur, (ex, ey))], OUT)
        op = Anim([(t0, 100), (t0 + dur * 0.6, 100), (t0 + dur, 0)], LIN)
        sc = Anim([(t0, 40), (t0 + dur * 0.3, 110), (t0 + dur, 50)], EASE)
        comp.layer([g], p=pos, o=op, s=sc, ip=t0, op=t0 + dur + 1, parent=parent, name='fx_burst')


def ring_wave(comp, cx, cy, t0, color='#ffffff', r0=20, r1=260, width=10, dur=20, parent=None):
    sz = Anim([(t0, (r0, r0)), (t0 + dur, (r1, r1))], OUT)
    shp = [group([{'ty': 'el', 'd': 1, 'p': prop((0, 0), '2d'), 's': prop(sz, '2d')}, stroke(hexc(color), width)])]
    op = Anim([(t0, 90), (t0 + dur, 0)], LIN)
    comp.layer(shp, p=(cx, cy), o=op, ip=t0, op=t0 + dur + 1, parent=parent, name='fx_ring')


def glow(comp, cx, cy, radius, color, t0=0, t1=None, pulse=True, peak=70, parent=None, op=None):
    t1 = t1 if t1 is not None else comp.op
    g = gradient([(0, color), (1, color)], (0, 0), (radius, 0), radial=True, alpha=[(0, 1), (0.45, 0.45), (1, 0)])
    shp = [group([ellipse(radius * 2), g])]
    if pulse:
        mid = (t0 + t1) / 2
        o = Anim([(t0, 0), (t0 + 8, peak), (mid, peak * 0.7), (t1 - 8, peak), (t1, 0)], EASE)
        s = Anim([(t0, 70), (t0 + 10, 100), (mid, 92), (t1, 105)], EASE)
    else:
        o, s = peak, 100
    return comp.layer(shp, p=(cx, cy), o=o, s=s, ip=t0, op=t1, parent=parent, name='fx_glow')


def confetti(comp, t0, n=40, area=None, colors=('#ff4d6d', '#ffd166', '#06d6a0', '#118ab2', '#c77dff'), dur=45, rnd=None):
    rnd = rnd or random.Random(11)
    w, h = area or (comp.w, comp.h)
    for _ in range(n):
        x = rnd.uniform(0.05, 0.95) * w
        start = t0 + rnd.randint(0, 12)
        y0 = -rnd.uniform(10, 120)
        y1 = h * rnd.uniform(0.55, 1.05)
        sz = rnd.uniform(10, 18)
        g = group([rect(sz, sz * 0.45, 0, 0, 2), fill(hexc(rnd.choice(colors)))])
        pos = Anim([(start, (x, y0)), (start + dur, (x + rnd.uniform(-80, 80), y1))], LIN)
        rot = Anim([(start, rnd.uniform(0, 180)), (start + dur, rnd.uniform(360, 900))], LIN)
        op = Anim([(start, 100), (start + dur * 0.75, 100), (start + dur, 0)], LIN)
        comp.layer([g], p=pos, r=rot, o=op, ip=start, op=start + dur + 1, name='fx_confetti')


def rays(comp, cx, cy, n, length, width, color, t0, t1, opacity=35, spin=60, parent=None):
    items = []
    for i in range(n):
        a = 360 * i / n
        items.append(group([path([(-width / 2, 0), (width / 2, 0), (0, -length)]), fill(hexc(color))], r=a))
    o = Anim([(t0, 0), (t0 + 10, opacity), (t1 - 10, opacity), (t1, 0)], EASE)
    r = Anim([(t0, 0), (t1, spin)], LIN)
    s = Anim([(t0, 40), (t0 + 12, 100), (t1, 110)], OUT)
    return comp.layer([group(items)], p=(cx, cy), o=o, r=r, s=s, ip=t0, op=t1, parent=parent, name='fx_rays')


# ---------- extra helpers (premium set) ----------
def anim_path(keys, ease=LIN):
    """Animated path: keys = [(frame, verts, ins, outs, closed), ...]."""
    out = []
    for idx, (t, v, i, o, c) in enumerate(keys):
        shp = {'c': c, 'v': [list(map(float, p)) for p in v], 'i': [list(map(float, p)) for p in i], 'o': [list(map(float, p)) for p in o]}
        e = {'t': t, 's': [shp]}
        if idx < len(keys) - 1:
            e['o'], e['i'] = ease
        out.append(e)
    return {'ty': 'sh', 'd': 1, 'ks': {'a': 1, 'k': out}}


def mirror(right):
    """Right-half outline from top-centre clockwise to bottom-centre -> full symmetric outline."""
    return list(right) + [(-x, y) for (x, y) in reversed(right[1:-1])]


def mask_of(path_item, inverted=False):
    return {'inv': inverted, 'mode': 'a', 'pt': path_item['ks'], 'o': prop(100), 'x': prop(0), 'nm': 'mask'}


def polar(r, a, cx=0, cy=0):
    return (cx + r * math.cos(a), cy + r * math.sin(a))
