import sys,struct,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from fmftoc import toc
src,out=sys.argv[1],sys.argv[2]
d,o,off=toc(src); p=0; root=os.path.realpath(out); n_files=0
def s():
    global p
    l=struct.unpack_from('<I',o,p)[0]; p+=4; v=o[p:p+l].decode('utf-8','replace'); p+=l; return v
def folder(path):
    global p,n_files
    name=s(); here=os.path.join(path,os.path.basename(name) or '_')
    n=struct.unpack_from('<I',o,p)[0]; p+=4
    for _ in range(n):
        nm=s(); ext=s(); fo,sz,sz2,t1,t2=struct.unpack_from('<QQQQQ',o,p); p+=40
        dst=os.path.realpath(os.path.join(root,here,os.path.basename(nm+ext)))
        if not dst.startswith(root+os.sep): continue
        os.makedirs(os.path.dirname(dst),exist_ok=True); open(dst,'wb').write(d[26+fo:26+fo+sz]); n_files+=1
    if p+4<=len(o):
        k=struct.unpack_from('<I',o,p)[0]; p+=4
        for _ in range(k): folder(here)
folder('')
print(os.path.basename(src),'files',n_files,'toc used',p,'/',len(o))
