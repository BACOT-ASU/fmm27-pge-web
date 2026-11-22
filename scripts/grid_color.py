# Tabel posisi Transfermarkt -> per baris: (y, [utama], [lain]) via warna sel (tanpa OCR)
import sys
from PIL import Image
COLS=['GK','SW','CB','LB','RB','DM','CM','RM','LM','AM','LW','RW','SS','CF']
def g(p): r,gg,b=p[:3]; return gg>110 and gg>r+30 and gg>b+60
def be(p): r,gg,b=p[:3]; return r>245 and 235<gg<250 and 195<b<230
def runs(px,W,y,f):
    out=[];x=0
    while x<W:
        if f(px[x,y]):
            s=x
            while x<W and f(px[x,y]): x+=1
            if x-s>=20: out.append((s,x))
        x+=1
    return out
def read(path):
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    allc=[]
    for y in range(H):
        for s,e in runs(px,W,y,g)+runs(px,W,y,be): allc.append((s,e))
    if not allc: return []
    L=min(s for s,e in allc); R=max(e for s,e in allc); w=(R-L)/14
    # baris: kelompokkan y yang punya sel berwarna
    rows=[];y=0
    while y<H:
        hit=runs(px,W,y,g)+runs(px,W,y,be)
        if hit:
            y0=y
            while y<H and (runs(px,W,y,g)+runs(px,W,y,be)): y+=1
            ym=(y0+y)//2
            if y-y0>=8:
                pr=[COLS[min(13,int(((s+e)/2-L)//w))] for s,e in runs(px,W,ym,g)]
                se=[COLS[min(13,int(((s+e)/2-L)//w))] for s,e in runs(px,W,ym,be)]
                rows.append((ym,pr,se))
        y+=1
    return rows
if __name__=='__main__':
    for r in read(sys.argv[1]): print(r)
def badges(path):
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    def dark(p): r,gg,b=p[:3]; return r<60 and gg<70 and b<110 and b>r+15
    best=None
    for x in range(5,45):
        ys=[y for y in range(H) if dark(px[x,y])]
        runs=[];
        for y in ys:
            if runs and y-runs[-1][1]<=2: runs[-1][1]=y
            else: runs.append([y,y])
        runs=[r for r in runs if 8<=r[1]-r[0]<=24]
        if best is None or len(runs)>len(best): best=runs
    return [(a+b)//2 for a,b in best]
def read2(path):
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    allc=[]
    for y in range(0,H,2):
        allc+=runs(px,W,y,g)+runs(px,W,y,be)
    if not allc: return []
    L=min(s for s,e in allc); R=max(e for s,e in allc); w=(R-L)/14
    cen=None
    for y in range(H-1,max(0,H-40),-1):
        xs=[];x=0
        while x<W:
            if g(px[x,y]):
                s=x
                while x<W and g(px[x,y]): x+=1
                if 5<=x-s<=18: xs.append((s+x)/2)
            x+=1
        if len(xs)==14: cen=xs; break
    def col(cx):
        if cen:
            d=(cen[-1]-cen[0])/13; k=[i for i in range(14) if cen[i]<=cx+0.3*d]
            return COLS[k[-1] if k else 0]
        return COLS[min(13,int((cx-L)//w))]
    B=badges(path); out=[]
    for i,yb in enumerate(B):
        lo=yb-5; hi=yb+6
        pr=set();se=set()
        for y in range(max(0,lo),min(H,hi)):
            for s,e in runs(px,W,y,g): pr.add(col((s+e)/2-(cen and 0 or 0)))
            for s,e in runs(px,W,y,be): se.add(col((s+e)/2))
        out.append((sorted(pr,key=COLS.index),sorted(se-pr,key=COLS.index)))
    return out
