"""Geometría común del render (render-cases.py) y del modelo 3D (export-cases-3d.py):
pose de cada forro y piezas de la cámara que no vienen en el .blend (flash y LiDAR).
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def local_bounds(obj, reference):
    to_ref = reference.matrix_world.inverted() @ obj.matrix_world
    points = [to_ref @ Vector(c) for c in obj.bound_box]
    return (
        Vector(min(p[i] for p in points) for i in range(3)),
        Vector(max(p[i] for p in points) for i in range(3)),
    )


def add_disc(name, radius, depth, xy, z, material, parent, collection):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, segments=48, radius1=radius, radius2=radius, depth=depth, cap_ends=True)
    for face in bm.faces:
        face.smooth = len(face.verts) == 4
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.matrix_basis = Matrix.Translation((xy[0], xy[1], z))
    return obj


def place_camera_parts(
    collection, case, mod_lo, mod_hi, lens_centers, lens_radius, back_sign, tel_back_z, flash_mat, sensor_mat
):
    """Flash arriba y sensor abajo (sólo Pro), en la esquina del módulo más alejada de las lentes.

    Visto desde atrás, la derecha de la imagen corresponde a x * back_sign en coordenadas locales.
    """
    z = (mod_hi.z if back_sign > 0 else mod_lo.z) + back_sign * 0.00012
    margin = 0.0052  # lejos del borde redondeado del módulo
    step = 0.0005
    right_x = mod_hi.x if back_sign > 0 else mod_lo.x
    candidates = []
    x = mod_lo.x + margin
    while x <= mod_hi.x - margin:
        y = mod_lo.y + margin
        while y <= mod_hi.y - margin:
            candidates.append(Vector((x, y)))
            y += step
        x += step
    lens_xy = [Vector((c.x, c.y)) for c in lens_centers]
    placed = []

    def choose(radius, corner_y):
        target = Vector((right_x, corner_y))
        needed = lens_radius + radius + 0.0012
        free = [
            c
            for c in candidates
            if all((c - l).length >= needed for l in lens_xy) and all((c - p).length >= radius + 0.0052 for p in placed)
        ]
        return min(free, key=lambda c: (c - target).length) if free else None

    spot = choose(0.0027, mod_hi.y)
    if spot:
        placed.append(spot)
        add_disc("Render_Flash", 0.0027, 0.0004, spot, z, flash_mat, case, collection)
    else:
        # Módulo angosto (16, 17, 16e…): como en el teléfono real, el flash va justo al lado
        beside_x = right_x + back_sign * 0.0052
        tel_z = tel_back_z + back_sign * 0.00012
        add_disc("Render_Flash", 0.0027, 0.0004, (beside_x, mod_hi.y - 0.0062), tel_z, flash_mat, case, collection)
    if len(lens_centers) == 3:
        spot = choose(0.0024, mod_lo.y)
        if spot:
            placed.append(spot)
            add_disc("Render_LiDAR", 0.0024, 0.0004, spot, z, sensor_mat, case, collection)


def prepare_model(collection, add_parts, flash_mat, sensor_mat):
    """Agrega las piezas de cámara y deja el forro centrado, con la tapa trasera hacia -Y y parado en Z."""
    case = next(o for o in collection.objects if o.name.startswith("Case_"))
    tel = next(o for o in collection.objects if o.name.startswith("Tel_"))
    module = next(o for o in collection.objects if o.name.startswith("TelModulo_"))
    lenses = [o for o in collection.objects if o.name.startswith("TelLente_")]
    tel_lo, tel_hi = local_bounds(tel, case)
    mod_lo, mod_hi = local_bounds(module, case)
    back_sign = 1.0 if (mod_lo.z + mod_hi.z) > (tel_lo.z + tel_hi.z) else -1.0
    centers, radii = [], []
    for lens in lenses:
        lo, hi = local_bounds(lens, case)
        centers.append((lo + hi) / 2)
        radii.append(max(hi.x - lo.x, hi.y - lo.y) / 2)
    ring_radius = max(radii) * 1.28
    if add_parts:
        tel_back_z = tel_hi.z if back_sign > 0 else tel_lo.z
        place_camera_parts(
            collection, case, mod_lo, mod_hi, centers, ring_radius, back_sign, tel_back_z, flash_mat, sensor_mat
        )

    base = Matrix.Rotation(math.radians(90), 4, "X")
    if back_sign < 0:
        base = Matrix.Rotation(math.pi, 4, "Z") @ base
    case.matrix_world = base
    bpy.context.view_layer.update()
    corners = [case.matrix_world @ Vector(c) for c in case.bound_box]
    middle = sum(corners, Vector()) / 8
    case.matrix_world = Matrix.Translation(-middle) @ base
    return {"case": case, "module": module, "collection": collection}
