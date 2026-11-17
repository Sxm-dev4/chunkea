"""Reconstruye cada iPhone con el detalle del teléfono real.

El .blend trae cada celular como piezas simples (losa, módulo y discos). Aquí se leen sus
medidas —que ya calzan con el forro— y se reemplazan por: cuerpo con marco metálico y líneas
de antena, botones, puerto, módulo de cámara según el modelo, lentes con aro, flash, LiDAR,
micrófono, logo y pantalla. Los colores no van en la geometría: cada material se pinta
después según src/data/iphones.json (en la página y en el render).

Coordenadas locales del forro, en milímetros: la tapa trasera mira a -Z y la cámara queda en +X.
"""
import json
import math
import os
import re

import bmesh
import bpy
from mathutils import Vector

MM = 0.001
BACK = Vector((0, 0, -1))
FRONT = Vector((0, 0, 1))
DOWN = Vector((0, -1, 0))

with open(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "iphones.json"),
    encoding="utf-8",
) as fh:
    SPECS = json.load(fh)


def slug_of(name):
    return name.lower().replace(" ", "-")


def spec_for(slug):
    spec = SPECS[slug]
    if "like" in spec:
        spec = {**spec_for(spec["like"]), **{k: v for k, v in spec.items() if k != "like"}}
    return spec


# Colores sólo para distinguir materiales al exportar (si fueran iguales se fusionarían)
PREVIEW = {
    "Tel_Trasera": (0.30, 0.32, 0.40),
    "Tel_Marco": (0.55, 0.55, 0.58),
    "Tel_Antena": (0.42, 0.42, 0.44),
    "Tel_Frontal": (0.010, 0.010, 0.012),
    "Tel_Modulo": (0.26, 0.28, 0.36),
    "Tel_AroLente": (0.50, 0.50, 0.54),
    "Tel_Lente": (0.004, 0.005, 0.010),
    "Tel_Pantalla": (0.02, 0.02, 0.05),
    "Tel_Logo": (0.70, 0.70, 0.74),
    "Tel_Puerto": (0.015, 0.015, 0.015),
    "Render_Flash": (0.97, 0.9, 0.68),
    "Render_Sensor": (0.006, 0.006, 0.008),
}


def material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        node = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        node.inputs["Base Color"].default_value = (*PREVIEW.get(name, (0.5, 0.5, 0.5)), 1)
    return mat


def measure(obj, case):
    """Caja (mm, coordenadas del forro) y radio de esquina de una pieza del .blend."""
    to_case = case.matrix_world.inverted() @ obj.matrix_world
    points = [to_case @ v.co for v in obj.data.vertices]
    lo = Vector(min(p[i] for p in points) for i in range(3)) / MM
    hi = Vector(max(p[i] for p in points) for i in range(3)) / MM
    top = [p for p in points if p.y / MM > hi.y - 0.01]
    corner = hi.x - max(p.x for p in top) / MM
    return lo, hi, corner


class Build:
    """Malla en construcción: caras con material y, si hace falta, orientación fija."""

    def __init__(self, origin=(0.0, 0.0, 0.0)):
        self.bm = bmesh.new()
        self.mats = []
        self.fixed = set()
        self.origin = origin  # punto (mm) que queda como origen del objeto

    def vert(self, x, y, z):
        ox, oy, oz = self.origin
        return self.bm.verts.new(((x - ox) * MM, (y - oy) * MM, (z - oz) * MM))

    def face(self, verts, mat, want=None):
        try:
            face = self.bm.faces.new(verts)
        except ValueError:
            return None
        if mat not in self.mats:
            self.mats.append(mat)
        face.material_index = self.mats.index(mat)
        face.smooth = True
        if want is not None:
            face.normal_update()
            if face.normal.dot(want) < 0:
                face.normal_flip()
            self.fixed.add(face)
        return face

    def finish(self, name, collection, parent):
        solid = [f for f in self.bm.faces if f not in self.fixed]
        if solid:
            bmesh.ops.recalc_face_normals(self.bm, faces=solid)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.mats:
            mesh.materials.append(material(mat))
        mesh.set_sharp_from_angle(angle=math.radians(38))
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        obj.parent = parent
        obj.location = Vector(self.origin) * MM
        return obj


"""---------- Contornos ----------"""


def template(hx, hy, r, seg=10, bands=()):
    """Recorrido de un rectángulo redondeado. `bands`: (borde, posición, ancho) de cada línea de antena."""
    cuts = {"right": [], "top": [], "left": [], "bottom": []}
    for index, (edge, pos, width) in enumerate(bands):
        cuts[edge] += [(pos - width / 2, index), (pos + width / 2, index)]
    out = []

    def corner(sx, sy, start):
        for i in range(seg + 1):
            out.append(("c", sx, sy, start + math.pi / 2 * i / seg, None))

    for pos, band in sorted(cuts["right"]):
        out.append(("x", 1, pos, 0, band))
    corner(1, 1, 0)
    for pos, band in sorted(cuts["top"], reverse=True):
        out.append(("y", 1, pos, 0, band))
    corner(-1, 1, math.pi / 2)
    for pos, band in sorted(cuts["left"], reverse=True):
        out.append(("x", -1, pos, 0, band))
    corner(-1, -1, math.pi)
    for pos, band in sorted(cuts["bottom"]):
        out.append(("y", -1, pos, 0, band))
    corner(1, -1, math.pi * 1.5)
    return out


def ring_points(tpl, hx, hy, r, inset):
    radius = max(r - inset, 0.02)
    points = []
    for kind, a, b, angle, _ in tpl:
        if kind == "c":
            points.append((a * (hx - r) + radius * math.cos(angle), b * (hy - r) + radius * math.sin(angle)))
        elif kind == "x":
            points.append((a * (hx - inset), b))
        else:
            points.append((b, a * (hy - inset)))
    return points


def loft(build, tpl, hx, hy, r, cx, cy, rings, cap0, cap1, band_mat=None):
    """Une anillos (retranqueo, z, material de la franja hasta el siguiente) y tapa los extremos."""
    loops = [
        [build.vert(cx + x, cy + y, z) for x, y in ring_points(tpl, hx, hy, r, inset)] for inset, z, _ in rings
    ]
    count = len(tpl)
    for j in range(len(rings) - 1):
        mat = rings[j][2]
        for i in range(count):
            k = (i + 1) % count
            antenna = band_mat and mat == "Tel_Marco" and tpl[i][4] is not None and tpl[i][4] == tpl[k][4]
            build.face((loops[j][i], loops[j][k], loops[j + 1][k], loops[j + 1][i]), band_mat if antenna else mat)
    if cap0:
        build.face(loops[0], cap0)
    if cap1:
        build.face(loops[-1][::-1], cap1)


def lathe(build, cx, cy, profile, seg=40):
    """Pieza de revolución: perfil de (radio, z, material de la franja); tapa los dos extremos."""
    angles = [2 * math.pi * i / seg for i in range(seg)]
    rings = [[build.vert(cx + r * math.cos(a), cy + r * math.sin(a), z) for a in angles] for r, z, _ in profile]
    for j in range(len(profile) - 1):
        for i in range(seg):
            k = (i + 1) % seg
            build.face((rings[j][i], rings[j][k], rings[j + 1][k], rings[j + 1][i]), profile[j][2])
    build.face(rings[0], profile[0][2])
    build.face(rings[-1][::-1], profile[-1][2])


def disc(build, cx, cy, radius, z, mat, want=BACK, seg=24):
    build.face(
        [build.vert(cx + radius * math.cos(2 * math.pi * i / seg), cy + radius * math.sin(2 * math.pi * i / seg), z) for i in range(seg)],
        mat,
        want,
    )


def rrect(build, cx, cy, hx, hy, r, z, mat, want, seg=8):
    tpl = template(hx, hy, r, seg)
    build.face([build.vert(cx + x, cy + y, z) for x, y in ring_points(tpl, hx, hy, r, 0)], mat, want)


def stadium(half_length, radius, seg=6):
    """Contorno de una pastilla alargada sobre el primer eje."""
    points = []
    for i in range(seg + 1):
        a = -math.pi / 2 + math.pi * i / seg
        points.append((half_length - radius + radius * math.cos(a), radius * math.sin(a)))
    for i in range(seg + 1):
        a = math.pi / 2 + math.pi * i / seg
        points.append((-(half_length - radius) + radius * math.cos(a), radius * math.sin(a)))
    return points


"""---------- Logo ----------"""

LOGO_PATH = (
    "M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 "
    "6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 "
    "2.13-9.501 3.24-12.742 3.35-4.929.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08"
    "-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.378 0-10.857 2.346-20.221 7.045-28.068 3.693-6.303 "
    "8.606-11.275 14.755-14.925s12.793-5.51 19.948-5.629c3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 "
    "3.599 12.238 3.599 1.339 0 5.877-1.416 13.57-4.239 7.275-2.618 13.415-3.702 18.445-3.275 13.63 1.1 23.87 "
    "6.473 30.68 16.153-12.19 7.386-18.22 17.731-18.1 31.002.11 10.337 3.86 18.939 11.23 25.769 3.34 3.17 7.07 "
    "5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.102-2.96 15.667-8.86 22.669-7.12 8.324-15.732 "
    "13.134-25.071 12.375a25.222 25.222 0 0 1-.188-3.07c0-7.778 3.386-16.102 9.399-22.908 3.002-3.446 6.82-6.311 "
    "11.45-8.597 4.62-2.252 8.99-3.497 13.1-3.71.12 1.083.17 2.166.17 3.24z"
)


def logo_contours(samples=5):
    """Contornos del logo, de alto 1 y centrados, ya espejados para verse desde atrás."""
    tokens = re.findall(r"[A-Za-z]|-?\d*\.?\d+", LOGO_PATH)
    contours, points = [], []
    cur = start = last_c2 = (0.0, 0.0)
    cmd, i = "", 0

    def take(n):
        nonlocal i
        values = [float(t) for t in tokens[i : i + n]]
        i += n
        return values

    def curve(c1, c2, end):
        for s in range(1, samples + 1):
            t = s / samples
            u = 1 - t
            points.append(
                tuple(u**3 * cur[a] + 3 * u * u * t * c1[a] + 3 * u * t * t * c2[a] + t**3 * end[a] for a in (0, 1))
            )

    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd in "Zz":
                contours.append(points[:-1] if points[-1] == points[0] else points)
                points = []
                cur = start
            continue
        if cmd == "M":
            cur = start = last_c2 = tuple(take(2))
            points = [cur]
        elif cmd == "c":
            a, b, c, d, e, f = take(6)
            c1, c2, end = (cur[0] + a, cur[1] + b), (cur[0] + c, cur[1] + d), (cur[0] + e, cur[1] + f)
            curve(c1, c2, end)
            cur, last_c2 = end, c2
        elif cmd == "s":
            c, d, e, f = take(4)
            c1 = (2 * cur[0] - last_c2[0], 2 * cur[1] - last_c2[1])
            c2, end = (cur[0] + c, cur[1] + d), (cur[0] + e, cur[1] + f)
            curve(c1, c2, end)
            cur, last_c2 = end, c2
        elif cmd == "a":
            values = take(7)
            cur = last_c2 = (cur[0] + values[5], cur[1] + values[6])
            points.append(cur)
        else:
            raise ValueError(f"Comando de trazo no soportado: {cmd}")
    xs = [p[0] for c in contours for p in c]
    ys = [p[1] for c in contours for p in c]
    mid_x, mid_y, height = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(ys) - min(ys)
    return [[(-(x - mid_x) / height, -(y - mid_y) / height) for x, y in contour] for contour in contours]


LOGO = logo_contours()


"""---------- Piezas ----------"""


def body_rings(spec, zb, zf):
    """Perfil del canto, de la tapa trasera (zb) al frente (zf)."""
    depth = zf - zb
    back = "Tel_Marco" if spec.get("unibody") else "Tel_Trasera"
    frame, front = "Tel_Marco", "Tel_Frontal"
    edge = spec["edge"]
    if edge == "round":  # canto curvo (11, SE): el vidrio dobla hacia el marco
        radius, steps, glass = depth * 0.44, 8, 3
    elif edge == "contour":  # canto plano con borde suavizado (15 en adelante)
        radius, steps, glass = min(1.3, depth * 0.24), 5, 0
    else:  # canto plano (12 a 14)
        radius, steps, glass = 0.4, 3, 0
    arc = [
        (radius * (1 - math.sin(t)), radius * (1 - math.cos(t)))
        for t in (math.pi / 2 * i / steps for i in range(steps + 1))
    ]
    rings = []
    if edge == "flat":
        rings.append((0.75, zb, frame))
    for i, (inset, drop) in enumerate(arc):
        rings.append((inset, zb + drop, back if i < glass else frame))
    for i, (inset, drop) in enumerate(reversed(arc)):
        rings.append((inset, zf - drop, front if i >= steps - glass else frame))
    if edge == "flat":
        rings.append((0.75, zf, front))
    return rings, back, front


def slab_rings(z_base, z_top, radius, mat, steps=4):
    """Pieza que sobresale de la tapa (hacia -Z) con el borde superior redondeado."""
    rings = [(0, z_base, mat)]
    for i in range(steps + 1):
        t = math.pi / 2 * i / steps
        rings.append((radius * (1 - math.cos(t)), z_top + radius * (1 - math.sin(t)), mat))
    return rings


def add_button(build, side, y, length, z, height, hx, out, mat):
    outline = stadium(length / 2, height / 2)
    inner = [build.vert(side * (hx - 0.5), y + a, z + b) for a, b in outline]
    outer = [build.vert(side * (hx + out), y + a, z + b) for a, b in outline]
    count = len(outline)
    for i in range(count):
        k = (i + 1) % count
        build.face((inner[i], inner[k], outer[k], outer[i]), mat)
    build.face(inner, mat)
    build.face(outer[::-1], mat)


def add_lens(build, cx, cy, ring_radius, glass_radius, z_base, height):
    """Aro metálico con el cristal apenas hundido."""
    z = lambda h: z_base - h  # noqa: E731
    ring = "Tel_AroLente"
    lathe(
        build,
        cx,
        cy,
        [
            (ring_radius, z_base + 0.2, ring),
            (ring_radius, z(height - 0.22), ring),
            (ring_radius - 0.07, z(height - 0.07), ring),
            (ring_radius - 0.22, z(height), ring),
            (glass_radius + 0.18, z(height), ring),
            (glass_radius, z(height - 0.14), "Tel_Lente"),
        ],
    )


def add_flash(build, x, y, z, radius=2.45):
    disc(build, x, y, radius + 0.28, z - 0.03, "Render_Sensor")
    disc(build, x, y, radius, z - 0.06, "Render_Flash")


def add_mic(build, x, y, z):
    disc(build, x, y, 0.45, z - 0.05, "Tel_Puerto", seg=12)


def add_lidar(build, x, y, z):
    disc(build, x, y, 2.5, z - 0.05, "Render_Sensor")


def rebuild_phone(collection, case):
    """Cambia las piezas simples del .blend por el iPhone detallado. Devuelve la zona de cámara."""
    spec = spec_for(slug_of(collection.name))

    def find(prefix):
        return sorted((o for o in collection.objects if o.name.startswith(prefix)), key=lambda o: o.name)

    tel = find("Tel_")[0]
    suffix = tel.name[len("Tel_") :]
    tel_lo, tel_hi, tel_r = measure(tel, case)
    mod_lo, mod_hi, mod_r = measure(find("TelModulo_")[0], case)
    lenses = []
    for lens, ring in zip(find("TelLente_"), find("TelAro_")):
        lens_lo, lens_hi, _ = measure(lens, case)
        ring_lo, ring_hi, _ = measure(ring, case)
        lenses.append(
            {
                "x": (lens_lo.x + lens_hi.x) / 2,
                "y": (lens_lo.y + lens_hi.y) / 2,
                "glass": (lens_hi.x - lens_lo.x) / 2,
                "ring": (ring_hi.x - ring_lo.x) / 2,
                "top": ring_lo.z,
            }
        )
    if (mod_lo.z + mod_hi.z) > (tel_lo.z + tel_hi.z) or lenses[0]["x"] < 0:
        raise SystemExit(f"{collection.name}: se esperaba la tapa hacia -Z y la cámara en +X")
    for prefix in ("Tel_", "TelModulo_", "TelLente_", "TelAro_", "TelPantalla_"):
        for obj in find(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)

    hx, hy = (tel_hi.x - tel_lo.x) / 2, (tel_hi.y - tel_lo.y) / 2
    zb, zf = tel_lo.z, tel_hi.z
    zc = (zb + zf) / 2
    kind = spec["module"]
    mod_cx, mod_cy = (mod_lo.x + mod_hi.x) / 2, (mod_lo.y + mod_hi.y) / 2
    raised = kind in ("cuadrado", "pastilla", "meseta")
    zm = mod_lo.z if raised else zb  # donde se apoyan las lentes

    """Cuerpo: tapa, marco con líneas de antena, frente y botones"""
    body = Build()
    side_y = hy - 12
    bands = [
        ("right", side_y, 1.2),
        ("right", -side_y, 1.2),
        ("left", side_y, 1.2),
        ("left", -side_y, 1.2),
        ("top", -hx * 0.42, 1.2),
        ("bottom", hx - 13, 1.2),
        ("bottom", -(hx - 13), 1.2),
    ]
    rings, back_mat, front_mat = body_rings(spec, zb, zf)
    loft(body, template(hx, hy, tel_r, 10, bands), hx, hy, tel_r, 0, 0, rings, back_mat, front_mat, "Tel_Antena")

    height = 2 * hy
    at = lambda fraction: hy - fraction * height  # noqa: E731
    button_h = min(2.7, (zf - zb) * 0.36)
    if spec.get("action"):
        add_button(body, -1, at(0.165), 6.5, zc, button_h, hx, 0.4, "Tel_Marco")
        add_button(body, -1, at(0.27), 10.5, zc, button_h, hx, 0.4, "Tel_Marco")
        add_button(body, -1, at(0.355), 10.5, zc, button_h, hx, 0.4, "Tel_Marco")
        add_button(body, 1, at(0.285), 15.5, zc, button_h, hx, 0.4, "Tel_Marco")
    else:
        add_button(body, -1, at(0.16), 5.6, zc, button_h * 0.85, hx, 0.5, "Tel_Marco")
        add_button(body, -1, at(0.25), 9.5, zc, button_h, hx, 0.4, "Tel_Marco")
        add_button(body, -1, at(0.335), 9.5, zc, button_h, hx, 0.4, "Tel_Marco")
        add_button(body, 1, at(0.26), 11.5, zc, button_h, hx, 0.4, "Tel_Marco")
    if spec.get("control"):
        add_button(body, 1, at(0.64), 16.0, zc, button_h * 0.9, hx, 0.06, "Tel_Modulo")
    body.finish(f"Tel_{suffix}", collection, case)

    """Módulo de cámara"""
    if raised:
        module = Build()
        mod_hx, mod_hy = (mod_hi.x - mod_lo.x) / 2, (mod_hi.y - mod_lo.y) / 2
        mat = "Tel_Marco" if spec.get("unibody") else "Tel_Modulo"
        edge = 0.9 if kind == "meseta" else 0.55
        radius = min(mod_r, mod_hx - 0.01, mod_hy - 0.01)
        loft(module, template(mod_hx, mod_hy, radius, 12), mod_hx, mod_hy, radius, mod_cx, mod_cy,
             slab_rings(zb + 0.3, zm, edge, mat), mat, mat)
        module.finish(f"TelModulo_{suffix}", collection, case)

    """Lentes"""
    for index, lens in enumerate(lenses):
        build = Build((lens["x"], lens["y"], zm))  # centrado: el material dibuja los anillos del lente
        height_out = 0.4 if kind == "se" else (zm - lens["top"]) + 0.15
        add_lens(build, lens["x"], lens["y"], lens["ring"], lens["glass"], zm, height_out)
        build.finish(f"TelLente_{suffix}_{index}", collection, case)

    """Detalles planos: flash, sensores, micrófono, logo, puerto y parlantes"""
    detail = Build()
    logo_center = (0.0, 0.0)
    logo_z = zb - 0.04
    first = lenses[0]
    if kind == "cuadrado" and len(lenses) == 3:
        third = lenses[2]
        add_flash(detail, third["x"] - 1.5, first["y"] + 1.5, zm)
        low = (third["x"] - 1.5, lenses[1]["y"] - 1.5)
        if spec.get("lidar"):
            add_lidar(detail, *low, zm)
            add_mic(detail, third["x"] - third["ring"] - 1.7, third["y"], zm)
        else:
            add_mic(detail, *low, zm)
    elif kind == "cuadrado":
        second = lenses[1]
        if abs(first["x"] - second["x"]) < 1:  # una sobre otra: flash en la otra columna
            other = 2 * mod_cx - first["x"]
            add_flash(detail, other, mod_cy, zm)
            add_mic(detail, other, mod_cy - 7.5, zm)
        else:  # en diagonal: flash y micrófono en las esquinas libres
            add_flash(detail, second["x"], first["y"], zm)
            add_mic(detail, first["x"], second["y"], zm)
    elif kind == "pastilla":
        add_flash(detail, mod_lo.x - 5.0, mod_cy, zb)
        add_mic(detail, mod_cx, mod_cy, zm)
    elif kind == "meseta" and len(lenses) == 3:
        column = mod_lo.x + 9.5
        add_flash(detail, column, mod_hi.y - 10, zm)
        add_mic(detail, column, mod_cy, zm)
        add_lidar(detail, column, mod_lo.y + 10, zm)
        # Recuadro de vidrio bajo la meseta: ahí va el logo
        top, bottom = mod_lo.y - 5.5, -hy + 9
        rrect(detail, 0, (top + bottom) / 2, hx - 5, (top - bottom) / 2, 7, zb - 0.03, "Tel_Trasera", BACK)
        logo_center, logo_z = (0.0, (top + bottom) / 2), zb - 0.07
    elif kind == "meseta":
        add_flash(detail, mod_lo.x + 10, mod_cy, zm)
        add_mic(detail, mod_lo.x + 18, mod_cy, zm)
    elif kind == "se":
        add_mic(detail, first["x"] - 5.3, first["y"], zb)
        add_flash(detail, first["x"] - 9.6, first["y"], zb, 1.6)
    else:  # una sola lente sobre la tapa (16e, 17e)
        add_mic(detail, first["x"] - 7.6, first["y"], zb)
        add_flash(detail, first["x"] - 12.5, first["y"], zb)

    logo_h = height * 0.112
    for contour in LOGO:
        detail.face(
            [detail.vert(logo_center[0] + x * logo_h, logo_center[1] + y * logo_h, logo_z) for x, y in contour],
            "Tel_Logo",
            BACK,
        )

    port_y = -hy - 0.03
    usbc = spec["port"] == "usbc"
    outline = stadium(4.15, 1.25) if usbc else stadium(3.8, 0.8)
    detail.face([detail.vert(x, port_y, zc + z) for x, z in outline], "Tel_Puerto", DOWN)
    for side in (-1, 1):
        for hole in range(5 if side > 0 else 4):
            x = side * (9.2 + hole * 2.1)
            detail.face(
                [detail.vert(x + 0.55 * math.cos(a), port_y, zc + 0.55 * math.sin(a)) for a in (math.pi / 4 * i for i in range(8))],
                "Tel_Puerto",
                DOWN,
            )
    if spec["front"] == "home":
        disc(detail, 0, -hy + 8.7, 5.6, zf + 0.02, "Tel_Marco", FRONT, 32)
        disc(detail, 0, -hy + 8.7, 5.0, zf + 0.04, "Tel_Frontal", FRONT, 32)
    detail.finish(f"TelDetalle_{suffix}", collection, case)

    """Pantalla"""
    screen = Build()
    bezel = spec["bezel"]
    if spec["front"] == "home":
        rrect(screen, 0, 0, hx - bezel, hy - 17.3, 0.2, zf + 0.03, "Tel_Pantalla", FRONT, 2)
    else:
        rrect(screen, 0, 0, hx - bezel, hy - bezel, max(tel_r - bezel, 1.5), zf + 0.03, "Tel_Pantalla", FRONT, 10)
    screen.finish(f"TelPantalla_{suffix}", collection, case)

    return mod_lo * MM, mod_hi * MM
