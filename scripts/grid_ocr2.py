# Tabel posisi TM: nama (OCR) + kode di dalam sel berwarna (OCR) -> [(nama, [utama], [lain])]
import pytesseract,re,sys
from PIL import Image,ImageOps
sys.path.insert(0,'/home/claude/scripts'); import grid_color as G
CODES=set(G.COLS)
def ocr(img,wl=None,psm=7):
    img=img.resize((img.width*4,img.height*4),Image.LANCZOS).convert('L')
    cfg=f'--psm {psm}'+(f' -c tessedit_char_whitelist={wl}' if wl else '')
    return pytesseract.image_to_string(img,config=cfg).strip()
def cells(px,W,y,f):
    xs=[x for x in range(W) if f(px[x,y])]
    out=[]
    for x in xs:
        if out and x-out[-1][1]<=14: out[-1][1]=x
        else: out.append([x,x])
    return [(a,b+1) for a,b in out if b-a>=25]
def read(path):
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    B=G.badges(path)
    allx=[s for y in range(0,H,3) for s,e in cells(px,W,y,G.g)+cells(px,W,y,G.be)]
    L=min(allx) if allx else W-20
    rows=[]
    for yb in B:
        nm=ocr(im.crop((36,yb-9,max(60,L-30),yb+9)))
        nm=re.sub(r'[^A-Za-zÀ-ÿ\'\.\- ]','',nm).strip()
        cs=[]
        for kind,f in (('p',G.g),('s',G.be)):
            for s,e in cells(px,W,yb,f):
                t=re.sub(r'[^A-Z]','',ocr(im.crop((s,yb-9,e,yb+9)),'GKSWCBLRDMAF')).upper()
                cs.append((kind,(s+e)/2,t if t in CODES else None))
        rows.append((nm,cs))
    # kalibrasi x -> kolom dari sel yang terbaca
    import statistics
    known={}
    for nm,cs in rows:
        for k,x,t in cs:
            if t: known.setdefault(G.COLS.index(t),[]).append(x)
    km={i:statistics.median(v) for i,v in known.items() if len(v)>=1}
    ids=sorted(km)
    def colx(i):
        if i in km: return km[i]
        lo=[j for j in ids if j<i]; hi=[j for j in ids if j>i]
        if lo and hi: a,b=lo[-1],hi[0]; return km[a]+(km[b]-km[a])*(i-a)/(b-a)
        if len(ids)>=2:
            a,b=(ids[-2],ids[-1]) if not hi else (ids[0],ids[1])
            return km[a]+(km[b]-km[a])*(i-a)/(b-a)
        return None
    cx=[colx(i) for i in range(14)]
    out=[]
    for nm,cs in rows:
        pr=[];se=[]
        for k,x,t in cs:
            if not t and None not in cx: t=G.COLS[min(range(14),key=lambda i:abs(cx[i]-x))]
            if t: (pr if k=='p' else se).append(t)
        out.append((nm,pr,se))
    return out
if __name__=='__main__':
    for r in read(sys.argv[1]): print(r)
