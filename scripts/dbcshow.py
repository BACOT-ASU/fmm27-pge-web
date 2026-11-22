import sys; sys.path.insert(0,'/home/claude/scripts')
import dbcarc,fmfio,dbc
def load(name,path='/home/claude/out/putaranB2b/kirim/assets/shared/data/sicomps.fmf'):
    f,r=dbcarc.load_sicomps(path); _,_,x=dbcarc.load_dbc(fmfio.get(dbcarc.find(r,'/comps.dbc')))
    row=[row for p,row in fmfio.walk(x) if name in p][0]; return dbc.parse(fmfio.get(row))
def pr(v,ind=0,skip=()):
    t,xx=v
    if t==0x0a:
        for k,val in xx:
            n=dbc.tagname(k)
            if n in skip: print(' '*ind+n+' …'); continue
            if val[0] in (0x0a,0x0b): print(' '*ind+n+('[%d]'%len(val[1]) if val[0]==0x0b else '')); pr(val,ind+2,skip)
            else: print(' '*ind+n,dbc.show(val))
    elif t==0x0b:
        for j,val in enumerate(xx):
            if val[0] in (0x0a,0x0b): print(' '*ind+'-%d'%j); pr(val,ind+2,skip)
            else: print(' '*ind+'-%d'%j, dbc.show(val))
