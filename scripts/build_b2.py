import sys,struct,copy,re
sys.path.insert(0,'/home/claude/scripts')
import dbcarc,fmfio,dbc
SRC='/home/claude/out/putaranB1/kirim/assets/shared/data/sicomps.fmf'
OUT='/home/claude/out/putaranB2/kirim/assets/shared/data/sicomps.fmf'
LN=41042746; CH=41042740
T=lambda s:s.ljust(4)[::-1].encode('latin1')
I=lambda n:(0x01,struct.pack('<i',n)); U8=lambda n:(0x11,bytes([n])); U16=lambda n:(0x12,struct.pack('<H',n))
BO=lambda b:(0x03,bytes([1 if b else 0])); STR=lambda s:(0x1a,s.encode())
def fget(fs,name):
    for k,v in fs:
        if k==T(name): return v
    raise KeyError(name)
def fset(fs,name,val):
    for i,(k,v) in enumerate(fs):
        if k==T(name): fs[i]=(k,val); return
    fs.append((T(name),val))
def fdel(fs,name):
    fs[:]=[(k,v) for k,v in fs if k!=T(name)]
flag,root=dbcarc.load_sicomps(SRC)
dbcrow=dbcarc.find(root,'/comps.dbc'); pre,f2,r2=dbcarc.load_dbc(fmfio.get(dbcrow))
rows={p.split('/')[-1]:row for p,row in fmfio.walk(r2)}
folder=r2  # entries live in root folder 'comps'
assert all(p.startswith('comps/') and p.count('/')==1 for p,_ in fmfio.walk(r2))
def put(row,d): row[2]=dbc.build(d); row[5]=None

# 1. aturan Liga Nusantara, dari League One
l1row=rows['comp_idn_league_one_1439.dbc']; d=dbc.parse(fmfio.get(l1row)); d=copy.deepcopy(d)
d['key']=I(LN); fs=d['fields']
fset(fs,'comp',I(LN)); fset(fs,'levl',U8(2)); fset(fs,'fxri',U8(2))
st=fget(fs,'stgs')[1][0][1]
fset(st,'ntms',U8(20)); fset(st,'nrds',U8(2))
# degradasi -> promosi 3 klub ke Championship
i=[k for k,_ in st].index(T('relr'))
st[i]=(T('prmr'),(0x0a,[(T('id'),I(1886547314)),(T('nrpl'),U8(3)),(T('comp'),(0x0a,[(T('id'),I(1668246896)),(T('comp'),I(CH))]))]))
sch=fget(st,'sche')[1][0][1]
fset(sch,'brpd',(0x0b,[]))
fset(fget(sch,'edfd')[1],'in_1',U8(37)); fset(sch,'nmdt',U8(38))
fset(st,'przm',(0x0b,[(0x0a,[(T('posn'),U8(p)),(T('cash'),I(500000000-20000000*p)),(T('curr'),(0x02,struct.pack('<I',37)))]) for p in range(20)]))
ps=fget(st,'pspl')[1]; fset(ps,'ckpr',BO(True)); fset(ps,'ckcc',BO(False)); fset(ps,'ckrl',BO(False))
fset(fs,'itvm',(0x0b,[(0x0a,[(T('cash'),I(45000000)),(T('curr'),(0x02,struct.pack('<I',37))),(T('type'),U8(0))])]))
mt=fget(fs,'MtTv')[1][0][1]; fset(mt,'cash',I(7500000))
fx=fget(fs,'fxds')[1]
a=fx[0][1]; assert dbc.show(fget(a,'in_1'))==0; fset(a,'dyom',U8(12))   # Sabtu sekitar 12 Sep
b=fx[1][1]; assert dbc.show(fget(b,'in_1'))==33; fset(b,'in_1',U8(37))
ty=fget(fs,'typz')[1]; vals=[struct.unpack('<i',fget(x[1],'przm')[1])[0] for x in ty]
step=vals[0]-vals[1]; vals=[v//10 for v in vals+[vals[-1]-step,vals[-1]-2*step]]
fset(fs,'typz',(0x0b,[(0x0a,[(T('levl'),(0x18,struct.pack('<q',p))),(T('przm'),I(v))]) for p,v in enumerate(vals)]))
fset(fs,'hlps',(0x0b,[(0x0a,[(T('type'),U8(23)),(T('comp'),I(LN))])]))
fset(fs,'file',STR('idn_league_three')); fset(fs,'XSvC',U8(1))
newrow=[b'comp_idn_league_three_1439',l1row[1],dbc.build(d),l1row[3],l1row[4],None,None,None]
i=folder.files.index(rows['comp_idn_league_two_1442.dbc']); folder.files.insert(i,newrow)

# 2. daftar kompetisi negara
row=rows['nation_idn_comps_1446.dbc']; d=dbc.parse(fmfio.get(row)); fs=d['fields']
mk=lambda uid:(0x0a,[(T('comp'),(0x0a,[(T('id'),(0x02,b'pmoc')),(T('comp'),I(uid))]))])
dv=fget(fs,'dvlv')[1]; assert len(dv)==2; assert dbc.build({'hdr':b'','key':I(0),'fields':[(T('x'),mk(CH))],'tail':b''})==dbc.build({'hdr':b'','key':I(0),'fields':[(T('x'),dv[1])],'tail':b''})
dv.append(mk(LN))
cm=fget(fs,'cmps')[1]; cm.insert(2,mk(LN))
for r in fget(fs,'retm')[1]:
    c=fget(r[1],'comp')[1]
    if dbc.show(fget(c,'comp'))==LN:
        fdel(r[1],'mntm'); fdel(r[1],'FBkt'); fset(r[1],'ntms',U8(20)); fset(r[1],'FBkt',U8(20)); fset(r[1],'Bktm',U8(20)); break
else: raise SystemExit('retm LN tidak ada')
put(row,d)

# 3. aturan negara: referensi tanggal mulai
row=rows['nation_idn_rules_1446.dbc']; d=dbc.parse(fmfio.get(row)); fs=d['fields']
sd=fget(fs,'stdr')[1]; e=copy.deepcopy(sd[2]); assert dbc.show(fget(fget(e[1],'comp')[1],'comp'))==CH
fset(fget(e[1],'comp')[1],'comp',I(LN)); sd.append(e); put(row,d)

# 4. tanggal mulai FMM
row=rows['nation_start_dates_fmm_0.dbc']; d=dbc.parse(fmfio.get(row)); fs=d['fields']
done=False
for blk in fget(fget(fs,'Nstd')[1],'stdr')[1]:
    b_=blk[1]
    if any(k==T('nati') and dbc.show(v)==113 for k,v in b_):
        lst=fget(b_,'stdr')[1]
        j=[n for n,x in enumerate(lst) if dbc.show(fget(x[1],'comp'))==CH][0]
        e=copy.deepcopy(lst[j]); fset(e[1],'comp',I(LN))
        fset(e[1],'date',(0x20,bytes([0])+struct.pack('<I',(2026<<9)|255)[:3]))   # 12 Sep 2026
        lst.insert(j+1,e); done=True
assert done; put(row,d)

newdbc,_=fmfio.write(f2,r2); dbcrow[2]=pre+newdbc
open('/home/claude/out/putaranB2/work/comps.dbc','wb').write(dbcrow[2])

# 5. daftar kedalaman IDN-2
for n in ['comps','clubs','reserve_clubs','cities','stadiums','people']:
    row=dbcarc.find(root,'/fmm_%s.dat'%n); b=fmfio.get(row); p8=b[:8]; fl,rt,_=fmfio.read(b[8:])
    src=[r for r in rt.files if r[0]==b'IDN-1'][0]
    assert not any(r[0]==b'IDN-2' for r in rt.files)
    new=[b'IDN-2',src[1],fmfio.get(src),src[3],src[4],None,None,None]
    rt.files.insert(rt.files.index(src)+1,new)
    nb,_=fmfio.write(fl,rt); row[2]=p8+nb

# 6. comps.txt
row=dbcarc.find(root,'/comps.txt'); t=fmfio.get(row)
nl=b'\r\n' if b'\r\n' in t else b'\n'
key=b'idn_league_two(1442),240'+nl; assert key in t
row[2]=t.replace(key,b'idn_league_three(1439),1'+nl+key)

# 7. start_dates_fmm.xml (sumber XML, disamakan dengan dbc)
row=dbcarc.find(root,'/other/start_dates_fmm.xml'); t=fmfio.get(row)
T5=b'\t'*5; T6=b'\t'*6
old=T6+b'<integer id="competition" value="41042740"/>\n'+T6+b'<integer id="base_year_offset" value="0"/>\n'+T6+b'<boolean id="base_year_interval" value="false"/>\n'+T6+b'<date id="date" day="17" month="9" year="2026" time="0"/>\n'+T6+b'<integer id="CCin" value="-1"/>\n'+T5+b'</record>\n'
assert t.count(old)==1
new=T5+b'<record>\n'+T6+b'<integer id="type" value="7"/>\n'+old.replace(b'41042740',b'41042746').replace(b'day="17"',b'day="12"')
row[2]=t.replace(old,old+new)

out,_=fmfio.write(flag,root); open(OUT,'wb').write(out); print('ok',len(out))
