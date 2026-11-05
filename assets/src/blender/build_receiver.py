"""Receiver placeholder variants -> GLB. Silhouette study for the asset viewer, NOT a
final design (clay/grey, no texture). Round 2: 1970s Soviet instrument / control-panel
shape language. Edit or add a variant (a build_* function + one VARIANTS entry), then

    bash assets/src/build.sh receiver

Conventions (design/visual/design-system.md): metres; origin = centre of the active face
at beam height; front = glTF -Z = Blender +Y, so everything sits at Blender y <= 0.
Nothing may stick out in front of y = 0 (the plane the 2D beam stops on): the front is
built as stepped rings that recede, and the visible face is recessed at most RECESS (6 cm).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_lib import bolt, box, cone, cyl, export, frustum, out_dir, reset, ring, write_manifest  # noqa: E402,F401

FACE = 0.8          # active face width/height (matches src/gameplay/receiver.js)
RECESS = 0.06       # how far behind y = 0 the visible face sits
BEAM_HEIGHT = 1.2   # stand reaches the floor at z = -BEAM_HEIGHT
GREY = {"body": 0.5, "frame": 0.45, "face": 0.2, "stand": 0.35, "hardware": 0.62}


# ---------------------------------------------------------------- shared parts

def face():
    """The visible face: 0.8 x 0.8 plate whose front sits RECESS behind y = 0 (1 mm proud of what's behind it)."""
    box("face", (FACE, 0.02, FACE), (0, -RECESS + 0.001 - 0.01, 0))


def stepped_bezel(outer, steps):
    """Stack of rings that recede toward the face. steps = [(outer, inner, depth), ...] front to back."""
    y = 0.0
    for o, i, d in steps:
        ring("frame", o, i, y - d, y)
        y -= d
    return y


# ---------------------------------------------------------------- variants

def build_a():
    """Painel de instrumento: corpo fundo em camadas, bezel escalonado, alça, orelhas e berço basculante."""
    stepped_bezel(1.18, [(1.18, 0.96, 0.03), (0.96, 0.88, 0.015), (0.88, 0.82, 0.015)])
    face()
    cy = -0.22
    scy = -0.27                                                           # a base fica atrás do plano da face
    box("body", (1.0, 0.31, 1.0), (0, -0.06 - 0.155, 0), 0.012)            # carcaça principal
    box("body", (0.84, 0.14, 0.84), (0, -0.37 - 0.07, 0), 0.01)            # camada traseira, menor
    for i in range(5):                                                    # tampa de ventilação no topo
        box("body", (0.5, 0.02, 0.012), (0.05, -0.16 - 0.045 * i, 0.506))
    for x in (-0.26, 0.34):                                               # alça deslocada: assimetria sutil
        box("body", (0.04, 0.05, 0.08), (x, cy, 0.54))
    box("body", (0.64, 0.05, 0.04), (0.04, cy, 0.60))
    for s in (-1, 1):                                                     # orelhas de fixação do flange
        box("frame", (0.12, 0.03, 0.30), (s * 0.65, -0.015, 0), 0.006)
        bolt((s * 0.65, -0.016, 0.157))
    for x in (-0.4, 0, 0.4):
        bolt((x, -0.016, 0.597))
    box("body", (0.2, 0.1, 0.14), (0.18, -0.57, 0.12))                   # caixa de conector atrás, só de um lado
    cyl("hardware", 0.045, 0.08, (0.18, -0.66, 0.12), "y")
    for s in (-1, 1):                                                     # berço basculante
        box("stand", (0.04, 0.18, 0.62), (s * 0.55, cy, -0.24), 0.005)
        cyl("hardware", 0.06, 0.04, (s * 0.59, cy, 0.0), "x")
    box("stand", (1.16, 0.18, 0.06), (0, cy, -0.58), 0.008)
    box("stand", (0.16, 0.16, 0.52), (0, scy, -0.87), 0.006)
    for s in (-1, 1):
        box("stand", (0.05, 0.05, 0.42), (0, scy + s * 0.1, -0.98), rot=(s * 0.5, 0, 0))
    box("stand", (0.62, 0.5, 0.07), (0, scy, -1.165), 0.015)
    for sx in (-1, 1):
        for sy in (-1, 1):
            bolt((sx * 0.25, scy + sy * 0.19, -1.13 + 0.007))


def build_b():
    """Consola industrial: gabinete alto e pesado, porta de acesso com dobradiças, aletas só de um lado, base de trilhos."""
    stepped_bezel(1.16, [(1.16, 0.94, 0.03), (0.94, 0.86, 0.015), (0.86, 0.82, 0.015)])
    face()
    cy = -0.21
    box("body", (1.06, 0.30, 1.50), (0, cy, -0.20), 0.01)                  # z de -0.95 a 0.55: a face fica na parte de cima
    box("body", (0.9, 0.26, 0.07), (0, cy, 0.585), 0.008)                  # tampa escalonada
    for x in (-0.35, 0.35):
        box("body", (0.08, 0.03, 0.07), (x, cy, 0.655))                    # olhais de içamento
    box("frame", (0.9, 0.025, 0.38), (0, -0.0475, -0.71), 0.004)           # porta de acesso, atrás do plano da face
    for z in (-0.6, -0.72, -0.84):
        cyl("hardware", 0.02, 0.08, (-0.46, -0.047, z), "z", 12)           # barris da dobradiça
    for z in (-0.62, -0.8):
        cyl("hardware", 0.03, 0.02, (0.38, -0.025, z), "y", 12)            # trincos
        box("hardware", (0.09, 0.012, 0.025), (0.4, -0.019, z))
    for i in range(9):                                                    # aletas de dissipação só do lado direito
        box("body", (0.04, 0.24, 0.025), (0.55, cy, -0.8 + i * 0.13))
    box("frame", (0.012, 0.16, 0.1), (-0.536, cy, 0.1))                   # placa de identificação do lado esquerdo
    for sy in (-1, 1):
        for sz in (-1, 1):
            bolt((-0.545, cy + sy * 0.065, 0.1 + sz * 0.04), "x")
    cyl("hardware", 0.035, 0.1, (-0.58, -0.15, -0.3), "x")               # eletroduto
    for x in (-0.45, 0.45):
        bolt((x, -0.016, 0.587))
    scy = -0.32                                                           # todo o suporte fica atrás do plano da face
    for s in (-1, 1):                                                     # base de patins e escoras
        x = s * 0.42
        box("stand", (0.09, 0.62, 0.07), (x, scy, -1.165), 0.01)
        box("stand", (0.09, 0.09, 0.2), (x, scy, -1.04), 0.006)
        for t in (-1, 1):
            box("stand", (0.05, 0.3, 0.05), (x, scy + t * 0.14, -1.06), rot=(-t * 0.7, 0, 0))
            bolt((x, scy + t * 0.24, -1.13 + 0.007))
    box("stand", (0.84, 0.05, 0.05), (0, scy, -1.1))


def build_c():
    """Tubo catódico: funil de chapa atrás da face, pescoço com bobina, berço de ferro fundido em prato redondo."""
    stepped_bezel(1.16, [(1.16, 0.94, 0.04), (0.94, 0.84, 0.02)])
    face()
    y0, y1 = -0.06, -0.56
    frustum("body", 1.0, 1.0, y0, 0.34, 0.34, y1)

    def w(y):
        return 1.0 - 0.66 * (y0 - y) / (y0 - y1)

    for yc, th in ((-0.2, 0.04), (-0.4, 0.04)):                           # cintas de reforço em volta do funil
        ring("frame", w(yc) + 0.04, w(yc) - 0.06, yc - th / 2, yc + th / 2)
    cyl("body", 0.085, 0.26, (0, -0.69, 0), "y")                          # pescoço
    cyl("frame", 0.125, 0.05, (0, -0.60, 0), "y")                         # colar
    cyl("body", 0.17, 0.10, (0, -0.66, 0), "y")                           # bobina de deflexão
    cyl("frame", 0.10, 0.03, (0, -0.835, 0), "y")
    cyl("hardware", 0.02, 0.06, (0, -0.88, 0), "y", 12)
    box("body", (0.14, 0.18, 0.14), (-0.44, -0.26, 0.12))                 # caixa de ligação só do lado esquerdo
    cyl("hardware", 0.03, 0.05, (-0.535, -0.26, 0.12), "x", 12)
    cy = -0.34                                                            # coluna e prato ficam atrás do plano da face
    box("stand", (0.84, 0.46, 0.04), (0, -0.31, -0.355), 0.006, rot=(-0.58, 0, 0))  # berço inclinado, acompanha o funil
    for s in (-1, 1):
        box("stand", (0.04, 0.3, 0.24), (s * 0.40, -0.31, -0.27), 0.006)
    cyl("stand", 0.07, 0.71, (0, cy, -0.745), "z")
    for s in (-1, 1):
        box("stand", (0.14, 0.04, 0.3), (s * 0.12, cy, -0.95))
        box("stand", (0.04, 0.14, 0.3), (0, cy + s * 0.12, -0.95))
    cyl("stand", 0.32, 0.05, (0, cy, -1.175), "z", 32)
    cyl("stand", 0.22, 0.05, (0, cy, -1.125), "z", 32)
    for k in range(6):
        a = k * math.pi / 3
        bolt((0.27 * math.cos(a), cy + 0.27 * math.sin(a), -1.15 + 0.007))
    for x in (-0.4, 0, 0.4):
        bolt((x, -0.02, 0.577))


VARIANTS = {
    "a-painel-instrumento": ("A · painel de instrumento", "corpo fundo em camadas, alça, orelhas, berço basculante", build_a),
    "b-consola-industrial": ("B · consola industrial", "gabinete alto, porta de acesso, aletas, base de patins", build_b),
    "c-tubo-catodico": ("C · tubo catódico", "funil de chapa, pescoço com bobina, prato fundido", build_c),
}


# ---------------------------------------------------------------- export

OUT = out_dir()
entries = []
for vid, (label, note, fn) in VARIANTS.items():
    reset()
    fn()
    export(f"{OUT}/receiver-{vid}.glb", GREY, "Receiver")
    entries.append({"id": vid, "label": label, "note": note, "file": f"receiver-{vid}.glb"})
write_manifest(OUT, "receiver", entries, {"faceOutline": FACE})
print("BUILD_OK", len(entries))
