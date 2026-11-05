"""Shared helpers for the build_<asset>.py Blender scripts (run headless via assets/src/build.sh).

Scripts put parts into named GROUPS (one joined mesh and one material slot per group),
then call export(). Coordinates are Blender's: x width, y depth (front = +y, which is
glTF -Z), z up (glTF +Y). Metres.
"""
import json
import math
import sys
import bmesh
import bpy

GROUPS = {}


def out_dir():
    return sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    GROUPS.clear()


def _register(o, group):
    GROUPS.setdefault(group, []).append(o)
    return o


def _apply(o, rotation=False):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=rotation, scale=True)
    o.select_set(False)


def box(group, size, center, bevel=0.0, rot=None):
    """Axis-aligned box (size = x,y,z); `rot` = optional euler (rx, ry, rz) applied about its centre."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.scale = size
    if rot:
        o.rotation_euler = rot
    _apply(o, rotation=bool(rot))
    if bevel:
        mod = o.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 1, "NONE"  # 1 segment = a flat, stamped-looking chamfer
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="Bevel")
    return _register(o, group)


def _orient(o, axis):
    # Blender cylinders/cones lie along z; rotating +90 deg about x sends +z to -y.
    if axis == "x":
        o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "y":
        o.rotation_euler = (math.pi / 2, 0, 0)
    _apply(o, rotation=axis != "z")


def cyl(group, radius, length, center, axis="z", verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=length, location=center)
    o = bpy.context.object
    _orient(o, axis)
    return _register(o, group)


def cone(group, r_pos, r_neg, length, center, axis="z", verts=24):
    """Truncated cone along `axis`: radius r_pos at its +axis end, r_neg at its -axis end."""
    r1, r2 = (r_pos, r_neg) if axis == "y" else (r_neg, r_pos)  # primitive: r1 at the -z end; the y rotation flips it
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=length, location=center)
    o = bpy.context.object
    _orient(o, axis)
    return _register(o, group)


def bolt(center, axis="z", group="hardware"):
    return cyl(group, 0.016, 0.014, center, axis, verts=6)  # hex head, sits on a surface


def ring(group, outer, inner, y0, y1, centre_z=0.0):
    """Square frame from four bars, spanning y0..y1 (y1 > y0); `outer`/`inner` are square side lengths."""
    d, cy = y1 - y0, (y0 + y1) / 2
    t = (outer - inner) / 2
    off = (outer - t) / 2
    box(group, (outer, d, t), (0, cy, centre_z + off))
    box(group, (outer, d, t), (0, cy, centre_z - off))
    box(group, (t, d, inner), (off, cy, centre_z))
    box(group, (t, d, inner), (-off, cy, centre_z))


def frustum(group, w1, h1, y1, w2, h2, y2):
    """Four-sided taper from (w1 x h1 at y1) to (w2 x h2 at y2)."""
    v = [(-w1 / 2, y1, -h1 / 2), (w1 / 2, y1, -h1 / 2), (w1 / 2, y1, h1 / 2), (-w1 / 2, y1, h1 / 2),
         (-w2 / 2, y2, -h2 / 2), (w2 / 2, y2, -h2 / 2), (w2 / 2, y2, h2 / 2), (-w2 / 2, y2, h2 / 2)]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    mesh = bpy.data.meshes.new("frustum")
    mesh.from_pydata(v, [], f)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new("frustum", mesh)
    bpy.context.scene.collection.objects.link(o)
    return _register(o, group)


def export(path, grey, root_name, parents=None):
    """Join each group into one mesh named after it, give it a grey material slot `mat_<group>`,
    parent it under `parents[group]` (an Empty created under the root, e.g. 'turret') or directly
    under the root, and write a Y-up GLB."""
    parents = parents or {}
    root = bpy.data.objects.new(root_name, None)
    bpy.context.scene.collection.objects.link(root)
    empties = {}
    for group, objs in GROUPS.items():
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = group
        mat = bpy.data.materials.new(f"mat_{group}")
        mat.diffuse_color = (grey[group],) * 3 + (1,)
        joined.data.materials.clear()
        joined.data.materials.append(mat)
        pname = parents.get(group)
        if pname and pname not in empties:
            empties[pname] = bpy.data.objects.new(pname, None)
            bpy.context.scene.collection.objects.link(empties[pname])
            empties[pname].parent = root
        joined.parent = empties[pname] if pname else root
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_yup=True, export_apply=True)


def write_manifest(directory, asset, entries, guides):
    """`guides` tells the viewer what to draw: {"faceOutline": 0.8} and/or {"pivotAxis": true}."""
    with open(f"{directory}/manifest.json", "w") as f:
        json.dump({"asset": asset, "guides": guides, "variants": entries}, f, indent=2, ensure_ascii=False)
