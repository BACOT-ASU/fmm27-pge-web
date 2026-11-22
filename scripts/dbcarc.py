import sys
sys.path.insert(0,'/home/claude/scripts')
import fmfio
def load_sicomps(path):
    d=open(path,'rb').read(); flag,root,_=fmfio.read(d); return flag,root
def find(root,name):
    for p,row in fmfio.walk(root):
        if p.endswith(name): return row
def load_dbc(b):
    pre=b[:8]; flag,root,_=fmfio.read(b[8:]); return pre,flag,root
