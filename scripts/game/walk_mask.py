#!/usr/bin/env python3
# Gera a MÁSCARA CAMINHÁVEL de uma fase a partir da arte (feedback JOs 40/42):
# o avatar só anda onde há calçamento (vila) / trilha+ponte (bosque), com folga
# pequena nas bordas; obstáculos sobre o piso (postes, bancos, caixa de correio,
# pedras) viram buracos (não-caminháveis) naturalmente — não são cor de piso.
# Saída: public/game/mapas/<fase>.walk.png (alpha 255 = caminhável).
# Uso (WSL): python3 scripts/game/walk_mask.py vila
import sys, numpy as np
from PIL import Image
from scipy import ndimage

def gen(name, floor_fn, close_it, erode_it, stamps=(), rects=(), down=0):
    im = Image.open(f"public/game/mapas/{name}.png").convert("RGB")
    a = np.asarray(im).astype(np.int16); H, W = a.shape[:2]
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(np.maximum(R, G), B); mn = np.minimum(np.minimum(R, G), B); sat = mx - mn
    floor = floor_fn(R, G, B, sat, mn)
    for (x0, y0, x1, y1) in rects:  # força piso onde o threshold falha (ex. ponte)
        floor[y0:y1, x0:x1] = True
    m = ndimage.binary_closing(floor, iterations=close_it)   # enche o rejunte -> piso sólido
    lbl, n = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    m = (lbl == 1 + int(np.argmax(sizes)))                   # maior componente = o piso
    if down:  # estende o piso PRA BAIXO: os pés (sprite.y+~36) pisam abaixo do centro
        sh = m.copy()
        for dy in range(1, down + 1):
            sh[dy:, :] |= m[:H - dy, :]
        m = sh
    walk = ndimage.binary_erosion(m, iterations=erode_it)    # folga + engorda obstáculos
    yy, xx = np.ogrid[:H, :W]
    for (x, y, r) in stamps:                                  # garante pontos (spawn, recuos)
        walk |= ((xx - x) ** 2 + (yy - y) ** 2) <= r * r
        walk &= m | (((xx - x) ** 2 + (yy - y) ** 2) <= r * r)  # recuo só dentro do piso bruto
    out = np.zeros((H, W, 4), np.uint8); out[..., 3] = (walk * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(f"public/game/mapas/{name}.walk.png")
    # overlay de conferência
    ov = np.asarray(im).copy(); ov[walk] = (ov[walk] * 0.35 + np.array([0, 120, 255]) * 0.65).astype(np.uint8)
    Image.fromarray(ov).resize((768, 512)).save(f"docs/screens-jogo/_wm-{name}.png")
    print(f"{name}: cobertura {100*walk.mean():.1f}%  -> {name}.walk.png")

CFG = {
    "vila": dict(
        floor_fn=lambda R, G, B, sat, mn: (R >= 200) & (G >= 160) & (B >= 145) & (sat <= 105) & (R >= B - 12),
        close_it=4, erode_it=6,
        stamps=[(130, 470, 16)],   # spawn
    ),
    # Bosque: trilha de areia (laranja: R bem > G, B baixo) + ponte (retângulo) +
    # recuo em cada pedestal pra interagir. Grama/água/árvores bloqueadas.
    # stamps no nível dos PÉS (sprite.y + ~36): a máscara é o chão; os pés pisam nela.
    "bosque": dict(
        floor_fn=lambda R, G, B, sat, mn: (R >= 198) & ((R - G) >= 42) & (B <= 135),
        close_it=4, erode_it=3, down=32,   # down: cobre o nível dos pés (sprite+~36)
        rects=[(600, 318, 846, 478)],      # ponte de madeira (até os pés na saída)
        stamps=[(130, 596, 22),            # spawn (pés)
                (255, 596, 46), (540, 366, 46), (505, 691, 46),
                (1090, 366, 46), (1375, 556, 46)],  # recuos dos 5 pedestais (pés)
    ),
}

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "vila"
    gen(name, **CFG[name])
