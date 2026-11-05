"""Emitter (laser source) placeholder variants -> GLB. Silhouette study for the asset
viewer, NOT a final design (clay/grey, no texture). Same 1970s Soviet lab-equipment
language as the Receiver. Edit or add a variant (a build_* function + one VARIANTS entry), then

    bash assets/src/build.sh emitter

Conventions, from src/gameplay/emitter.js: metres; the emitter is fixed in place and only
yaws about the vertical axis through its origin, and its beam is traced from that origin.
So the ORIGIN IS THE ROTATION PIVOT at beam height (not the muzzle). The beam is hidden
inside the opaque body until it leaves the muzzle at +y (glTF -Z). The model is split in
two nodes: `turret` (rotates: body, lens, rear cap, hardware) and `base` (fixed: turntable
ring, column, floor plate), with the base centred under the pivot. The rear cap is a flat
disc of at least 0.2 m for the colour symbol (the player usually sees the emitter from
behind). Today's code body is a 0.3 m diameter x 0.5 m cylinder centred on the origin.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_lib import bolt, box, cone, cyl, export, out_dir, reset, write_manifest  # noqa: E402

GREY = {"body": 0.5, "lens": 0.2, "cap": 0.42, "hardware": 0.62, "base": 0.35}
PARENTS = {"body": "turret", "lens": "turret", "cap": "turret", "hardware": "turret", "base": None}


def floor_bolts(radius, z, count=6):
    for k in range(count):
        a = k * 2 * math.pi / count
        bolt((radius * math.cos(a), radius * math.sin(a), z), "z", group="base")


def build_a():
    """Tubo de laser a gás: cilindro anelado em selas sobre trilho, flange de bocal, prato redondo escalonado."""
    cyl("body", 0.15, 0.48, (0, -0.02, 0), "y", 32)                      # tubo, y de -0.26 a 0.22
    for y in (-0.16, -0.03, 0.10):                                        # anéis de refrigeração
        cyl("body", 0.17, 0.03, (0, y, 0), "y", 32)
    cyl("body", 0.11, 0.10, (0, 0.27, 0), "y")                            # garganta do bocal
    cyl("body", 0.15, 0.03, (0, 0.325, 0), "y")                           # flange do bocal
    cyl("lens", 0.07, 0.01, (0, 0.345, 0), "y")
    cyl("cap", 0.15, 0.025, (0, -0.2725, 0), "y", 32)                     # tampa traseira plana: símbolo
    for k in range(6):                                                    # parafusos da tampa
        a = k * math.pi / 3
        bolt((0.125 * math.cos(a), -0.292, 0.125 * math.sin(a)), "y")
    box("body", (0.06, 0.10, 0.08), (0.18, -0.05, 0.02))                  # porta lateral só de um lado
    for y in (-0.12, 0.12):                                               # selas e cintas
        box("body", (0.24, 0.07, 0.08), (0, y, -0.19), 0.008)
        cyl("body", 0.162, 0.02, (0, y, 0), "y", 32)
    box("body", (0.14, 0.62, 0.04), (0, 0, -0.25), 0.006)                 # trilho
    cyl("body", 0.17, 0.03, (0, 0, -0.285), "z", 32)                      # prato giratório (gira com o turret)
    cyl("base", 0.19, 0.03, (0, 0, -0.315), "z", 32)                      # anel fixo
    cyl("base", 0.06, 0.77, (0, 0, -0.715), "z")                          # coluna
    cyl("base", 0.30, 0.05, (0, 0, -1.175), "z", 32)
    cyl("base", 0.20, 0.05, (0, 0, -1.125), "z", 32)
    floor_bolts(0.25, -1.15 + 0.007)


def build_b():
    """Cabeça de laser em caixa: gabinete de fonte com aletas, focinho cilíndrico, painel traseiro, base quadrada com nervuras."""
    box("body", (0.40, 0.46, 0.40), (0, -0.07, 0), 0.012)                 # gabinete, y de -0.30 a 0.16
    for i in range(6):                                                    # aletas de resfriamento no topo
        box("body", (0.02, 0.36, 0.03), (-0.15 + 0.06 * i, -0.07, 0.215))
    for i in range(3):                                                    # venezianas só do lado direito
        box("body", (0.012, 0.2, 0.02), (0.206, -0.07, -0.1 + 0.1 * i))
    cyl("body", 0.09, 0.18, (0, 0.25, 0), "y")                            # focinho
    cyl("body", 0.12, 0.03, (0, 0.335, 0), "y")
    cyl("lens", 0.06, 0.01, (0, 0.355, 0), "y")
    box("cap", (0.30, 0.02, 0.30), (0, -0.31, 0), 0.004)                  # painel traseiro plano: símbolo
    cyl("hardware", 0.035, 0.05, (0.09, -0.345, -0.08), "y", 16)          # conector
    for sx in (-1, 1):
        for sz in (-1, 1):
            bolt((sx * 0.13, -0.327, sz * 0.13), "y")
    for x in (-0.12, 0.12):                                               # alça traseira
        box("body", (0.03, 0.04, 0.07), (x, -0.27, 0.235))
    box("body", (0.28, 0.04, 0.03), (0, -0.27, 0.285))
    cyl("body", 0.16, 0.03, (0, 0, -0.215), "z", 32)                      # prato giratório
    cyl("base", 0.18, 0.03, (0, 0, -0.245), "z", 32)                      # anel fixo
    cyl("base", 0.07, 0.84, (0, 0, -0.68), "z")                           # coluna
    box("base", (0.56, 0.56, 0.06), (0, 0, -1.17), 0.012)                 # base quadrada: fixa, então pode ser quadrada
    for s in (-1, 1):                                                     # nervuras
        box("base", (0.2, 0.05, 0.28), (s * 0.14, 0, -0.95))
        box("base", (0.05, 0.2, 0.28), (0, s * 0.14, -0.95))
    for sx in (-1, 1):
        for sy in (-1, 1):
            bolt((sx * 0.22, sy * 0.22, -1.14 + 0.007), "z", group="base")


def build_c():
    """Projetor de corneta: bocal cônico que alarga para a frente, lata traseira, forquilha com munhões, base em sino."""
    cone("body", 0.22, 0.08, 0.40, (0, 0.10, 0), "y")                     # corneta, y de -0.10 a 0.30
    cyl("body", 0.13, 0.22, (0, -0.21, 0), "y")                           # lata traseira
    for y in (0.02, 0.14):                                                # cintas de reforço na corneta
        r = 0.08 + (y + 0.10) * 0.35
        cyl("body", r + 0.02, 0.02, (0, y, 0), "y")
    cyl("body", 0.235, 0.03, (0, 0.315, 0), "y", 32)                      # aro frontal
    cyl("lens", 0.11, 0.01, (0, 0.335, 0), "y", 32)
    cyl("cap", 0.12, 0.03, (0, -0.335, 0), "y", 32)                       # tampa traseira plana: símbolo
    for k in range(5):
        a = k * 2 * math.pi / 5
        bolt((0.095 * math.cos(a), -0.356, 0.095 * math.sin(a)), "y")
    box("body", (0.10, 0.18, 0.14), (-0.17, -0.2, 0.10), 0.006)           # tanque lateral só do lado esquerdo
    cyl("hardware", 0.025, 0.10, (-0.17, -0.2, 0.2), "z", 12)
    for s in (-1, 1):                                                     # forquilha com munhões
        box("body", (0.04, 0.12, 0.36), (s * 0.19, -0.2, -0.13), 0.005)
        cyl("hardware", 0.035, 0.06, (s * 0.16, -0.2, 0), "x", 16)
    box("body", (0.42, 0.40, 0.04), (0, -0.07, -0.29), 0.006)             # placa da forquilha
    cyl("body", 0.17, 0.03, (0, 0, -0.325), "z", 32)                      # prato giratório
    cyl("base", 0.19, 0.03, (0, 0, -0.355), "z", 32)                      # anel fixo
    cyl("base", 0.07, 0.53, (0, 0, -0.635), "z")                          # coluna
    cone("base", 0.10, 0.30, 0.30, (0, 0, -1.05), "z", 32)                # base em sino
    cyl("base", 0.32, 0.03, (0, 0, -1.185), "z", 32)
    floor_bolts(0.27, -1.17 + 0.007)


VARIANTS = {
    "a-tubo-a-gas": ("A · tubo a gás", "cilindro anelado em selas sobre trilho, prato escalonado", build_a),
    "b-cabeca-em-caixa": ("B · cabeça em caixa", "gabinete com aletas e focinho, base quadrada com nervuras", build_b),
    "c-corneta": ("C · corneta", "bocal cônico, lata traseira, forquilha com munhões, base em sino", build_c),
}

OUT = out_dir()
entries = []
for vid, (label, note, fn) in VARIANTS.items():
    reset()
    fn()
    export(f"{OUT}/emitter-{vid}.glb", GREY, "Emitter", PARENTS)
    entries.append({"id": vid, "label": label, "note": note, "file": f"emitter-{vid}.glb"})
write_manifest(OUT, "emitter", entries, {"pivotAxis": True})
print("BUILD_OK", len(entries))
