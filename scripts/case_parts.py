"""Pose común del render (render-cases.py) y del modelo 3D (export-cases-3d.py).

El iPhone detallado se arma en iphone_parts.py a partir de las piezas simples del .blend.
"""
import math

import bpy
from mathutils import Matrix, Vector

from iphone_parts import measure, rebuild_phone


def prepare_model(collection, rebuild):
    """Arma el iPhone (si `rebuild`) y deja el forro centrado, con la tapa hacia -Y y parado en Z."""
    case = next(o for o in collection.objects if o.name.startswith("Case_"))
    if rebuild:
        mod_lo, mod_hi = rebuild_phone(collection, case)
    else:
        lo, hi, _ = measure(next(o for o in collection.objects if o.name.startswith("TelModulo_")), case)
        mod_lo, mod_hi = lo * 0.001, hi * 0.001

    # En el .blend la tapa trasera mira a -Z local: de pie quedaría hacia +Y, así que se voltea
    base = Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
    case.matrix_world = base
    bpy.context.view_layer.update()
    corners = [case.matrix_world @ Vector(c) for c in case.bound_box]
    middle = sum(corners, Vector()) / 8
    case.matrix_world = Matrix.Translation(-middle) @ base
    return {"case": case, "module_bounds": (mod_lo, mod_hi), "collection": collection}


def box_corners(case, lo, hi):
    """Esquinas (en el mundo) de una caja dada en coordenadas del forro."""
    return [case.matrix_world @ Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
