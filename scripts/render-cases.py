"""Renders frontales con fondo transparente de cada forro, a la misma escala, para la página.

Uso: blender -b --factory-startup --disable-autoexec chunkea_sin_chunkis.blend --python render_cases.py --
       --outdir carpeta --height 1440 --samples 256 [--models "iPhone 16 Pro,iPhone 15"] [--skip-existing]
Escribe <slug>.png por modelo y cases.json con la posición del forro y la cámara en cada imagen.
"""
import argparse
import json
import math
import os
import sys
import time
import zlib

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from case_parts import prepare_model  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("--outdir", required=True)
parser.add_argument("--height", type=int, default=1440)
parser.add_argument("--samples", type=int, default=256)
parser.add_argument("--models", default="")
parser.add_argument("--skip-existing", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
os.makedirs(args.outdir, exist_ok=True)

scene = bpy.context.scene
MODELS = [c for c in bpy.data.collections if c.name.startswith("iPhone")]
wanted = [m.strip() for m in args.models.split(",") if m.strip()]
selected = [c for c in MODELS if not wanted or c.name in wanted]
missing = set(wanted) - {c.name for c in MODELS}
if missing:
    raise SystemExit(f"Modelos no encontrados: {missing}")

for name in ("Piso_Sombra", "Luz_Key", "Luz_Fill"):
    bpy.data.objects[name].hide_render = True
    bpy.data.objects[name].hide_viewport = True


def slug(name):
    return name.lower().replace(" ", "-")


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_inputs(node, **values):
    for key, value in values.items():
        node.inputs[key.replace("_", " ")].default_value = value


"""---------- Materiales ----------"""
PHONE = (0.018, 0.018, 0.022, 1)
case_mat = bpy.data.materials["Case_Transparente"]
node = principled(case_mat)
set_inputs(node, Base_Color=(0.985, 0.99, 0.995, 1), IOR=1.49)
nodes, links = case_mat.node_tree.nodes, case_mat.node_tree.links
coord = nodes.new("ShaderNodeTexCoord")


def noise_at(scale, detail, tree_nodes=nodes, tree_links=links, vector=None):
    tex = tree_nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = scale
    tex.inputs["Detail"].default_value = detail
    tree_links.new(vector if vector is not None else coord.outputs["Object"], tex.inputs["Vector"])
    return tex


# Huellas y zonas de grasa: manchas grandes y suaves que alteran el reflejo
smudge_large = noise_at(70, 5)
smudge_fine = noise_at(900, 3)
smudge_mix = nodes.new("ShaderNodeMath")
smudge_mix.operation = "MULTIPLY_ADD"
smudge_mix.inputs[1].default_value = 0.65
links.new(smudge_large.outputs["Fac"], smudge_mix.inputs[0])
links.new(smudge_fine.outputs["Fac"], smudge_mix.inputs[2])
rough = nodes.new("ShaderNodeMapRange")
rough.inputs["From Min"].default_value = 0.55
rough.inputs["From Max"].default_value = 1.05
rough.inputs["To Min"].default_value = 0.022
rough.inputs["To Max"].default_value = 0.055
links.new(smudge_mix.outputs[0], rough.inputs["Value"])
links.new(rough.outputs["Result"], node.inputs["Roughness"])

# Micropolvo: puntos muy escasos sobre el plástico
dust = nodes.new("ShaderNodeTexVoronoi")
dust.inputs["Scale"].default_value = 140
dust.feature = "F1"
links.new(coord.outputs["Object"], dust.inputs["Vector"])
dust_ramp = nodes.new("ShaderNodeMapRange")
dust_ramp.inputs["From Min"].default_value = 0.006
dust_ramp.inputs["From Max"].default_value = 0.011
dust_ramp.inputs["To Min"].default_value = 0.9
dust_ramp.inputs["To Max"].default_value = 1.0
links.new(dust.outputs["Distance"], dust_ramp.inputs["Value"])
links.new(dust_ramp.outputs["Result"], node.inputs["Transmission Weight"])

# Superficie: ondulación microscópica del plástico inyectado
micro = noise_at(1800, 2)
micro_bump = nodes.new("ShaderNodeBump")
micro_bump.inputs["Strength"].default_value = 0.012
micro_bump.inputs["Distance"].default_value = 0.0002
links.new(micro.outputs["Fac"], micro_bump.inputs["Height"])
links.new(micro_bump.outputs["Normal"], node.inputs["Normal"])

# Celular: vidrio esmerilado con grano fino; módulo pulido
back_mat = bpy.data.materials["Tel_Trasera"]
back_node = principled(back_mat)
set_inputs(back_node, Base_Color=(0.012, 0.012, 0.015, 1), Roughness=0.33, Coat_Weight=0.15, Coat_Roughness=0.3)
bn, bl = back_mat.node_tree.nodes, back_mat.node_tree.links
bc = bn.new("ShaderNodeTexCoord")
grain = noise_at(9000, 1, bn, bl, bc.outputs["Object"])
grain_bump = bn.new("ShaderNodeBump")
grain_bump.inputs["Strength"].default_value = 0.06
grain_bump.inputs["Distance"].default_value = 0.0002
bl.new(grain.outputs["Fac"], grain_bump.inputs["Height"])
bl.new(grain_bump.outputs["Normal"], back_node.inputs["Normal"])
set_inputs(principled(bpy.data.materials["Tel_Modulo"]), Base_Color=(0.012, 0.012, 0.015, 1), Roughness=0.17, Coat_Weight=0.3, Coat_Roughness=0.08)
set_inputs(principled(bpy.data.materials["Tel_AroLente"]), Base_Color=(0.22, 0.225, 0.24, 1), Metallic=1.0, Roughness=0.2)
set_inputs(principled(bpy.data.materials["Tel_Pantalla"]), Roughness=0.05)

lens_mat = bpy.data.materials["Tel_Lente"]
lens_node = principled(lens_mat)
n2, l2 = lens_mat.node_tree.nodes, lens_mat.node_tree.links
sample_lens = next(o for o in bpy.data.objects if o.name.startswith("TelLente_"))
thin = list(sample_lens.dimensions).index(min(sample_lens.dimensions))
tc = n2.new("ShaderNodeTexCoord")
center = n2.new("ShaderNodeVectorMath")
center.operation = "SUBTRACT"
center.inputs[1].default_value = (0.5, 0.5, 0.5)
l2.new(tc.outputs["Generated"], center.inputs[0])
flat = n2.new("ShaderNodeVectorMath")
flat.operation = "MULTIPLY"
flat.inputs[1].default_value = tuple(0.0 if i == thin else 2.0 for i in range(3))
l2.new(center.outputs[0], flat.inputs[0])
length = n2.new("ShaderNodeVectorMath")
length.operation = "LENGTH"
l2.new(flat.outputs[0], length.inputs[0])
color_ramp = n2.new("ShaderNodeValToRGB")
l2.new(length.outputs["Value"], color_ramp.inputs["Fac"])
stops = [
    (0.0, (0.002, 0.002, 0.004, 1)),
    (0.24, (0.002, 0.003, 0.006, 1)),
    (0.30, (0.009, 0.012, 0.024, 1)),
    (0.44, (0.003, 0.004, 0.007, 1)),
    (0.66, (0.006, 0.006, 0.008, 1)),
    (0.70, (0.022, 0.022, 0.026, 1)),
    (0.74, (0.004, 0.004, 0.005, 1)),
    (1.0, (0.003, 0.003, 0.004, 1)),
]
elements = color_ramp.color_ramp.elements
while len(elements) < len(stops):
    elements.new(0.5)
for element, (position, color) in zip(elements, stops):
    element.position = position
    element.color = color
l2.new(color_ramp.outputs["Color"], lens_node.inputs["Base Color"])
set_inputs(lens_node, Roughness=0.03, Coat_Weight=0.5, Coat_Roughness=0.01, Coat_IOR=1.5)
lens_node.inputs["Specular IOR Level"].default_value = 0.25
lens_node.inputs["Specular Tint"].default_value = (0.65, 0.75, 1.0, 1)
# Recubrimiento antirreflejo: película delgada que da el tono iridiscente de las lentes reales
lens_node.inputs["Thin Film Thickness"].default_value = 420.0
lens_node.inputs["Thin Film IOR"].default_value = 1.38

flash_mat = bpy.data.materials.new("Render_Flash")
flash_mat.use_nodes = True
flash_node = principled(flash_mat)
set_inputs(flash_node, Base_Color=(0.97, 0.9, 0.68, 1), Roughness=0.25, Coat_Weight=1.0, Coat_Roughness=0.04)
fn, fl = flash_mat.node_tree.nodes, flash_mat.node_tree.links
fc = fn.new("ShaderNodeTexCoord")
cells = fn.new("ShaderNodeTexVoronoi")
cells.inputs["Scale"].default_value = 2600
fl.new(fc.outputs["Object"], cells.inputs["Vector"])
cells_bump = fn.new("ShaderNodeBump")
cells_bump.inputs["Strength"].default_value = 0.5
cells_bump.inputs["Distance"].default_value = 0.0001
fl.new(cells.outputs["Distance"], cells_bump.inputs["Height"])
fl.new(cells_bump.outputs["Normal"], flash_node.inputs["Normal"])
sensor_mat = bpy.data.materials.new("Render_Sensor")
sensor_mat.use_nodes = True
set_inputs(principled(sensor_mat), Base_Color=(0.006, 0.006, 0.008, 1), Roughness=0.08, Coat_Weight=1.0, Coat_Roughness=0.02)


"""---------- Pose: todos de frente y centrados ----------"""
info = {c.name: prepare_model(c, c in selected, flash_mat, sensor_mat) for c in MODELS}
bpy.context.view_layer.update()

"""---------- Estudio ----------"""


def softbox(name, location, target, size, energy, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "RECTANGLE"
    light.size, light.size_y = size
    light.energy = energy
    light.color = color
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return obj


def soft_card(name, width, length, strength):
    """Softbox de bordes difuminados que sólo se ve reflejado (la cámara no lo ve)."""
    half_w, half_l = width / 2, length / 2
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(-half_w, -half_l, 0), (half_w, -half_l, 0), (half_w, half_l, 0), (-half_w, half_l, 0)], [], [(0, 1, 2, 3)])
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    emission = tree.nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (1.0, 0.985, 0.99, 1)
    tc = tree.nodes.new("ShaderNodeTexCoord")
    sep = tree.nodes.new("ShaderNodeSeparateXYZ")
    tree.links.new(tc.outputs["Generated"], sep.inputs[0])

    def feather(channel, edge):
        up = tree.nodes.new("ShaderNodeMapRange")
        up.interpolation_type = "SMOOTHSTEP"
        up.inputs["From Min"].default_value = 0.0
        up.inputs["From Max"].default_value = edge
        tree.links.new(channel, up.inputs["Value"])
        down = tree.nodes.new("ShaderNodeMapRange")
        down.interpolation_type = "SMOOTHSTEP"
        down.inputs["From Min"].default_value = 1.0
        down.inputs["From Max"].default_value = 1.0 - edge
        tree.links.new(channel, down.inputs["Value"])
        product = tree.nodes.new("ShaderNodeMath")
        product.operation = "MULTIPLY"
        tree.links.new(up.outputs["Result"], product.inputs[0])
        tree.links.new(down.outputs["Result"], product.inputs[1])
        return product

    across = feather(sep.outputs["X"], 0.42)
    along = feather(sep.outputs["Y"], 0.2)
    total = tree.nodes.new("ShaderNodeMath")
    total.operation = "MULTIPLY"
    tree.links.new(across.outputs[0], total.inputs[0])
    tree.links.new(along.outputs[0], total.inputs[1])
    scaled = tree.nodes.new("ShaderNodeMath")
    scaled.operation = "MULTIPLY"
    scaled.inputs[1].default_value = strength
    tree.links.new(total.outputs[0], scaled.inputs[0])
    tree.links.new(scaled.outputs[0], emission.inputs["Strength"])
    tree.links.new(emission.outputs[0], output.inputs["Surface"])
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.visible_camera = False
    obj.visible_diffuse = False
    obj.visible_shadow = False
    return obj


CARD_L = 0.55


def aim_card(card, offset, roll_deg):
    """Coloca el softbox para que su reflejo caiga en `offset` (x, z) sobre el forro."""
    t = distance / (distance + CARD_L)
    card.matrix_world = (
        Matrix.Translation((offset[0] / t, -CARD_L, offset[1] / t))
        @ Matrix.Rotation(math.radians(roll_deg), 4, "Y")
        @ Matrix.Rotation(math.radians(-90), 4, "X")
    )


origin = (0, 0, 0)
FRAME_H = 0.20  # 20 cm de alto en toda la imagen: deja aire para la sombra
LENS = 135
SENSOR_H = 24
distance = FRAME_H * LENS / SENSOR_H
softbox("Render_Principal", (-0.1, -0.9, 0.55), origin, (1.1, 0.6), 6.5)  # luz general suave
softbox("Render_Sombra", (-0.26, -0.6, 0.36), origin, (0.2, 0.2), 5, (1.0, 0.98, 0.96))  # proyecta la sombra física
softbox("Render_Rasante", (-0.16, -0.14, 0.26), (0.03, 0, -0.03), (0.3, 0.2), 1.3, (1.0, 0.96, 0.98))  # brillo que cae en diagonal
softbox("Render_Rebote", (0.1, -0.9, -0.6), origin, (1.1, 0.4), 0.9, (1.0, 0.92, 0.98))  # rebote inferior
softbox("Render_TiraIzq", (-0.42, -0.28, 0.05), origin, (0.1, 0.9), 5, (1.0, 0.97, 0.95))  # borde izquierdo
softbox("Render_TiraDer", (0.42, -0.2, 0.05), origin, (0.1, 0.9), 7, (1.0, 0.92, 0.98))  # borde derecho
card = soft_card("Render_Softbox", 0.15, 0.8, 0.5)  # reflejo suave en el plástico

# Superficie invisible bajo el forro: sólo conserva la sombra en la imagen transparente
floor_y = max((info[c.name]["case"].matrix_world @ Vector(v)).y for c in selected for v in info[c.name]["case"].bound_box) + 0.0003
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, floor_y, 0), rotation=(math.radians(90), 0, 0))
surface = bpy.context.object
surface.name = "Render_Superficie"
surface.is_shadow_catcher = True

# Luz para lo que atraviesa el plástico: el borde del forro se ve claro, sin iluminar de más la escena
world = bpy.data.worlds.new("Render_Mundo")
scene.world = world
world.use_nodes = True
tree = world.node_tree
background = next(n for n in tree.nodes if n.type == "BACKGROUND")
background.inputs[0].default_value = (1.0, 0.97, 0.99, 1)
light_path = tree.nodes.new("ShaderNodeLightPath")
strength = tree.nodes.new("ShaderNodeMix")
strength.data_type = "FLOAT"
strength.inputs["A"].default_value = 0.08
strength.inputs["B"].default_value = 0.34
# El rayo cruzó el plástico (1 a 3 veces) sin tocar el celular: un rayo que vio el celular
# lo cruza 4 veces o más (ida y vuelta por la tapa). Así el borde se ve claro y el celular sigue negro.
crossed = tree.nodes.new("ShaderNodeMath")
crossed.operation = "GREATER_THAN"
crossed.inputs[1].default_value = 0.5
tree.links.new(light_path.outputs["Transmission Depth"], crossed.inputs[0])
few = tree.nodes.new("ShaderNodeMath")
few.operation = "LESS_THAN"
few.inputs[1].default_value = 3.5
tree.links.new(light_path.outputs["Transmission Depth"], few.inputs[0])
no_diffuse = tree.nodes.new("ShaderNodeMath")
no_diffuse.operation = "LESS_THAN"
no_diffuse.inputs[1].default_value = 0.5
tree.links.new(light_path.outputs["Diffuse Depth"], no_diffuse.inputs[0])
both = tree.nodes.new("ShaderNodeMath")
both.operation = "MULTIPLY"
tree.links.new(crossed.outputs[0], both.inputs[0])
tree.links.new(few.outputs[0], both.inputs[1])
factor = tree.nodes.new("ShaderNodeMath")
factor.operation = "MULTIPLY"
tree.links.new(both.outputs[0], factor.inputs[0])
tree.links.new(no_diffuse.outputs[0], factor.inputs[1])
tree.links.new(factor.outputs[0], strength.inputs["Factor"])
tree.links.new(strength.outputs["Result"], background.inputs["Strength"])

"""---------- Cámara (misma escala para todos: 18 cm de alto en toda la imagen) ----------"""
camera_data = bpy.data.cameras.new("Render_Camara")
camera = bpy.data.objects.new("Render_Camara", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = LENS
camera_data.sensor_fit = "VERTICAL"
camera_data.sensor_height = SENSOR_H
camera.location = (0, -distance, 0)
camera.rotation_euler = Vector((0, distance, 0)).to_track_quat("-Z", "Y").to_euler()
camera_data.dof.use_dof = False

"""---------- Render ----------"""
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.01
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
scene.cycles.max_bounces = 16
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 8
scene.cycles.transmission_bounces = 16
scene.cycles.transparent_max_bounces = 8
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 0.5
scene.cycles.sample_clamp_indirect = 6
scene.render.film_transparent = True
scene.cycles.film_transparent_glass = True
scene.cycles.film_transparent_roughness = 0.1
scene.render.resolution_y = args.height
scene.render.resolution_x = args.height // 2
scene.render.resolution_percentage = 100
scene.render.use_compositing = False
scene.render.use_sequencer = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.image_settings.compression = 90
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.0


def image_box(obj):
    """Caja del objeto en la imagen: fracciones (0–1) medidas desde arriba a la izquierda."""
    points = [world_to_camera_view(scene, camera, obj.matrix_world @ Vector(c)) for c in obj.bound_box]
    return {
        "x0": round(min(p.x for p in points), 4),
        "x1": round(max(p.x for p in points), 4),
        "y0": round(1 - max(p.y for p in points), 4),
        "y1": round(1 - min(p.y for p in points), 4),
    }


manifest_path = os.path.join(args.outdir, "cases.json")
manifest = {}
if os.path.exists(manifest_path):
    with open(manifest_path, encoding="utf-8") as fh:
        manifest = json.load(fh)

start = time.time()
for index, collection in enumerate(selected, 1):
    for other in MODELS:
        other.hide_render = other is not collection
        other.hide_viewport = other is not collection
    bpy.context.view_layer.update()
    data = info[collection.name]
    name = slug(collection.name)
    png = os.path.join(args.outdir, f"{name}.png")
    manifest[name] = {
        "name": collection.name,
        "case": image_box(data["case"]),
        "camera": image_box(data["module"]),
        "lenses": len([o for o in collection.objects if o.name.startswith("TelLente_")]),
    }
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    if args.skip_existing and os.path.exists(png):
        print(f"CASES saltado {name}", flush=True)
        continue
    # Una toma nunca queda igual a la anterior: variación pequeña y reproducible por modelo
    seed = zlib.crc32(name.encode())
    jitter_x = ((seed & 0xFF) / 255 - 0.5) * 0.016
    jitter_z = (((seed >> 8) & 0xFF) / 255 - 0.5) * 0.016
    jitter_roll = (((seed >> 16) & 0xFF) / 255 - 0.5) * 7
    aim_card(card, (0.02 + jitter_x, 0.012 + jitter_z), -28 + jitter_roll)
    scene.render.filepath = png
    tic = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"CASES {index}/{len(selected)} {name} {time.time() - tic:.0f}s (total {time.time() - start:.0f}s)", flush=True)
print("CASES_OK", len(selected), flush=True)
