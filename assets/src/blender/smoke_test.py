"""Toolchain smoke test — NOT an asset. Proves headless Blender can build
geometry, assign named material slots, export a Y-up GLB, and render a PNG.

    blender -b --python assets/src/blender/smoke_test.py -- <out_dir>
"""
import sys
import bpy

out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = "METRIC"

# 0.8 x 0.8 x 0.08 m panel, bevelled, origin at its centre. Axis mapping check:
# Blender Z-up -> glTF Y-up, so the glTF bbox must read 0.8 (x) x 0.8 (y) x 0.08 (z):
# the panel's thickness runs along Blender Y, which exports as glTF -Z.
bpy.ops.mesh.primitive_cube_add(size=1)
box = bpy.context.object
box.name = "SmokeBox"
box.scale = (0.8, 0.08, 0.8)
bpy.ops.object.transform_apply(scale=True)
bevel = box.modifiers.new("Bevel", "BEVEL")
bevel.width = 0.01
bevel.segments = 2
bpy.ops.object.modifier_apply(modifier="Bevel")

body = bpy.data.materials.new("mat_body")
body.diffuse_color = (0.15, 0.15, 0.15, 1)
glow = bpy.data.materials.new("mat_emissive_dynamic")
glow.diffuse_color = (0.0, 1.0, 0.0, 1)
box.data.materials.append(body)
box.data.materials.append(glow)
for poly in box.data.polygons:  # the +Y face (glTF -Z) gets the second slot
    if poly.normal.y > 0.9:
        poly.material_index = 1

bpy.ops.export_scene.gltf(
    filepath=f"{out_dir}/smoke.glb",
    export_format="GLB",
    export_yup=True,
    export_apply=True,
)

# Render check (Workbench: needs no GPU; proves the render path + camera framing work).
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 640, 480
scene.render.filepath = f"{out_dir}/smoke.png"
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (1.6, -1.6, 1.2)
direction = -cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
bpy.ops.render.render(write_still=True)
print("SMOKE_OK")
