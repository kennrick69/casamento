import numpy as np, heapq, json, math
from PIL import Image, ImageDraw
from scipy import ndimage
import os
SCRATCH=os.environ.get("SCRATCH", "docs/screens-jogo")  # overlay de conferência + world-trail.json
im = Image.open("public/game/mapas/mundi.png").convert("RGB")
a = np.asarray(im).astype(np.int16); H,W=a.shape[:2]
R,G,B=a[...,0],a[...,1],a[...,2]
# areia/terra (tom quente claro, tolerante)
sand=(R>=215)&(G>=150)&(B>=85)&(B<=210)&(R>=G-5)&(G>=B-20)&((R-B)>=35)
mx=np.maximum(np.maximum(R,G),B); mn=np.minimum(np.minimum(R,G),B)
stone=(mn>=165)&((mx-mn)<=60)&(R>=185)   # escadas/plataformas claras
mask=sand|stone
def rect(x0,y0,x1,y1): mask[y0:y1,x0:x1]=True
# Item 56: arte NOVA estendida (1536x1344), reescalada x1.148/y1.156 e topo-alinhada
# com a antiga. Os conectores de ponte/escada foram reescalados na mesma proporção.
rect(905,460,1079,523)   # ponte superior
rect(970,911,1211,977)   # ponte inferior
rect(344,647,482,809)    # escada esq — conector
nodes=[(286,898),(597,787),(1215,585)]  # item 56: CENTRO de cada pedra na arte nova
yy,xx=np.ogrid[:H,:W]
for (x,y) in nodes: mask|=((xx-x)**2+(yy-y)**2)<=30**2
# morfologia agressiva p/ unir a trilha
mask=ndimage.binary_closing(mask,iterations=4)
mask=ndimage.binary_dilation(mask,iterations=3)
lbl,n=ndimage.label(mask)
labs=[lbl[y,x] for (x,y) in nodes]
print("labels dos nós:", labs, "(iguais = conectados)")
# mantém só componentes que contêm nós
mask=np.isin(lbl,[l for l in set(labs) if l])
print("cobertura %.1f%%"%(100*mask.mean()))

# overlay rápido p/ inspecionar
ov=np.asarray(im).copy(); ov[mask]=(ov[mask]*0.45+np.array([255,0,0])*0.55).astype(np.uint8)
for (x,y) in nodes: ov[y-5:y+5,x-5:x+5]=(0,80,255)
Image.fromarray(ov).save(f"{SCRATCH}/trail-mask-overlay.png")
np.save(f"{SCRATCH}/trail_mask.npy", mask)

# ─── A* com custo que segue o CENTRO da trilha ───
S=2
m2d=ndimage.binary_dilation(mask[::S,::S], iterations=1)  # restaura corredores finos
# Item 33: EROSÃO antes do A* — afasta ~8px das bordas pra o caminho seguir o
# CENTRO de pontes/escadas (antes ele rentava o corrimão). dt2 do mapa erodido
# reforça o custo central. nearest_ok re-ancora os nós no mapa erodido.
m2=ndimage.binary_erosion(m2d, iterations=2)
dt2=ndimage.distance_transform_edt(m2); H2,W2=m2.shape
lbl2,_=ndimage.label(m2)
print("labels (stride2):",[lbl2[y//S,x//S] for (x,y) in nodes])
maxdt=dt2.max() or 1.0
def ok(x,y): return 0<=x<W2 and 0<=y<H2 and m2[y,x]
def cost(x,y):   # barato no centro, MUITO caro na borda (item 33)
    return 1.0 + 12.0*(1.0 - min(dt2[y,x],8.0)/8.0)
def nearest_ok(x,y):
    if ok(x,y): return (x,y)
    best=None;bd=1e9
    for r in range(1,60):
        for dx in range(-r,r+1):
            for dy in (-r,r):
                X,Y=x+dx,y+dy
                if ok(X,Y) and dx*dx+dy*dy<bd: best=(X,Y);bd=dx*dx+dy*dy
        for dy in range(-r,r+1):
            for dx in (-r,r):
                X,Y=x+dx,y+dy
                if ok(X,Y) and dx*dx+dy*dy<bd: best=(X,Y);bd=dx*dx+dy*dy
        if best: return best
    return (x,y)
def astar(s,g):
    s=nearest_ok(*s); g=nearest_ok(*g)
    oph=[(0,s)];came={};gs={s:0}
    nb=[(-1,0,1),(1,0,1),(0,-1,1),(0,1,1),(-1,-1,1.41),(1,1,1.41),(-1,1,1.41),(1,-1,1.41)]
    while oph:
        _,cur=heapq.heappop(oph)
        if cur==g:
            p=[cur]
            while cur in came: cur=came[cur];p.append(cur)
            return p[::-1]
        cx,cy=cur
        for dx,dy,w in nb:
            nx,ny=cx+dx,cy+dy
            if not ok(nx,ny): continue
            ng=gs[cur]+w*cost(nx,ny)
            if ng<gs.get((nx,ny),1e18):
                gs[(nx,ny)]=ng;came[(nx,ny)]=cur
                heapq.heappush(oph,(ng+math.hypot(nx-g[0],ny-g[1]),(nx,ny)))
    return None
def densify(path,step=10):
    pts=[(x*S,y*S) for x,y in path]
    sm=[]
    for i in range(len(pts)):
        lo=max(0,i-3);hi=min(len(pts),i+4)
        sm.append((sum(p[0] for p in pts[lo:hi])/(hi-lo),sum(p[1] for p in pts[lo:hi])/(hi-lo)))
    out=[sm[0]];acc=0
    for i in range(1,len(sm)):
        d=math.hypot(sm[i][0]-sm[i-1][0],sm[i][1]-sm[i-1][1]);acc+=d
        if acc>=step: out.append(sm[i]);acc=0
    out.append(sm[-1])
    return [[round(x),round(y)] for x,y in out]
edges=[]
for i in range(len(nodes)-1):
    s=(nodes[i][0]//S, nodes[i][1]//S); g=(nodes[i+1][0]//S, nodes[i+1][1]//S)
    p=astar(s,g)
    if not p: print("SEM caminho",i);continue
    via=densify(p)[1:-1]
    edges.append({"a":i,"b":i+1,"via":via}); print(f"edge {i}->{i+1}: {len(via)} wp")
json.dump({"nodes":[list(n) for n in nodes],"edges":edges},open(f"{SCRATCH}/world-trail.json","w"))
pim=Image.fromarray((np.asarray(im)*0.8).astype(np.uint8));dr=ImageDraw.Draw(pim)
for e in edges:
    pts=[tuple(nodes[e["a"]])]+[tuple(v) for v in e["via"]]+[tuple(nodes[e["b"]])]
    dr.line(pts,fill=(255,40,40),width=4)
    for v in e["via"]: dr.ellipse([v[0]-3,v[1]-3,v[0]+3,v[1]+3],fill=(255,230,0))
for (x,y) in nodes: dr.ellipse([x-11,y-11,x+11,y+11],outline=(0,120,255),width=4)
pim.save(f"{SCRATCH}/trail-astar.png")
