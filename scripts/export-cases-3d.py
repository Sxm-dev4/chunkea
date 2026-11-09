"""Exporta a GLB el modelo de cada forro con su celular, en la misma pose que los renders.

Uso: blender -b --factory-startup --disable-autoexec chunkea_sin_chunkis.blend --python export-cases-3d.py --
       --outdir carpeta [--models "iPhone 16 Pro,iPhone 15"]
Después: npm run models:process -- carpeta
Los materiales finales se crean en la página (src/builder/view3d/phoneModel.ts) según su nombre.
"""
import argparse
import os
import sys

import addon_utils
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from case_parts import prepare_model  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("--outdir", required=True)
parser.add_argument("--models", default="")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
os.makedirs(args.outdir, exist_ok=True)
addon_utils.enable("io_scene_gltf2")

MODELS = [c for c in bpy.data.collections if c.name.startswith("iPhone")]
wanted = [m.strip() for m in args.models.split(",") if m.strip()]
selected = [c for c in MODELS if not wanted or c.name in wanted]



def simple_material(name, color):
    # Colores distintos: si fueran iguales, la optimización los fusionaría en uno solo
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = color
    return material


flash_mat = simple_material("Render_Flash", (0.97, 0.9, 0.68, 1))
sensor_mat = simple_material("Render_Sensor", (0.006, 0.006, 0.008, 1))

for collection in selected:
    prepare_model(collection, True, flash_mat, sensor_mat)
bpy.context.view_layer.update()

for collection in selected:
    # Hay forros ocultos en el .blend: oculto no se puede seleccionar y el exportador lo omitiría
    for obj in bpy.context.view_layer.objects:
        inside = obj.name in collection.objects
        if inside:
            obj.hide_set(False)
        obj.select_set(inside)
    missing = [o.name for o in collection.objects if not o.select_get()]
    if missing:
        raise SystemExit(f"{collection.name}: no se pudo seleccionar {missing}")
    name = collection.name.lower().replace(" ", "-")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(args.outdir, f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
    print(f"GLB {name}", flush=True)
print("GLB_OK", len(selected), flush=True)
