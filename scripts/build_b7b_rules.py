#!/usr/bin/env python3
# B7b: di atas sicomps B7a. Tambah orang berkebangsaan Indonesia yang belum ada di fmm_people IDN-0/1/2 (+ Noah Adnan).
import sys, struct, os, pickle
sys.path.insert(0, '/home/claude/scripts'); import dbcarc, fmfio
SRC='/home/claude/out/putaranB7a/kirim/assets/shared/data/sicomps.fmf'
OUT='/home/claude/out/putaranB7b/kirim/assets/shared/data/sicomps.fmf'
o=pickle.load(open('/home/claude/data/people_scan.pkl','rb'))
IDN=[x['uid'] for x in o if x['nat']==58]+[2000430201]
flag, root = dbcarc.load_sicomps(SRC)
row=dbcarc.find(root,'/fmm_people.dat'); b=fmfio.get(row); p8=b[:8]; fl,rt,_=fmfio.read(b[8:])
hit=0; added=None
for e in rt.files:
    if e[0] in (b'IDN-0',b'IDN-1',b'IDN-2'):
        d=fmfio.get(e); n=struct.unpack_from('<I',d,8)[0]; ids=list(struct.unpack_from('<%dI'%n,d,12)); have=set(ids)
        new=[u for u in IDN if u not in have]; added=new; ids+=new
        e[2]=d[:8]+struct.pack('<I',len(ids))+struct.pack('<%dI'%len(ids),*ids); e[5]=None; hit+=1
assert hit==3
nb,_=fmfio.write(fl,rt); row[2]=p8+nb; row[5]=None
os.makedirs(os.path.dirname(OUT),exist_ok=True); out,_=fmfio.write(flag,root); open(OUT,'wb').write(out)
print('ok',len(out),'ditambah',len(added))
