import sys,json; sys.path.insert(0,'/home/claude/scripts')
import dbcarc,fmfio,dbc
flag,root=dbcarc.load_sicomps(sys.argv[1])
b=fmfio.get(dbcarc.find(root,'/comps.dbc')); pre,f2,r2=dbcarc.load_dbc(b)
for want in sys.argv[2:]:
    for p,row in fmfio.walk(r2):
        if want in p:
            d=dbc.parse(fmfio.get(row))
            print('=====',p,'hdr',d['hdr'].hex(),'key',dbc.show(d['key']),'tail',d['tail'].hex())
            def pr(v,ind):
                t,x=v
                if t==0x0a:
                    print()
                    for k,val in x:
                        print(' '*ind+dbc.tagname(k)+' <%02x>'%val[0],end=''); pr(val,ind+2)
                elif t==0x0b:
                    print(' [%d]'%len(x))
                    for i,val in enumerate(x):
                        print(' '*ind+'- <%02x>'%val[0],end=''); pr(val,ind+2)
                else: print(' ',dbc.show(v))
            for k,val in d['fields']:
                print(dbc.tagname(k)+' <%02x>'%val[0],end=''); pr(val,2)
