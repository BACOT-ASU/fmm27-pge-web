#!/usr/bin/env python3
# B7b: di atas db B7a (stadion 28 klub). Youth IDN 19, reputasi/fasilitas/penonton/status klub IDN, kebangsaan Noah Adnan -> IDN.
import sys, struct, os, json
sys.path.insert(0, '/home/claude/scripts'); import fmfio, club, stadium
SRC='/tmp/db7a.fmf'; OUT='/home/claude/out/putaranB7b/kirim/assets/data/game/'
flag, root, _ = fmfio.read(open(SRC,'rb').read()); rows={p.split('/')[-1]:r for p,r in fmfio.walk(root)}
def tmp(n,b): p='/tmp/b7b_'+n; open(p,'wb').write(b); return p
cd=bytearray(fmfio.get(rows['club.dat'])); C,e,L=club.parse(tmp('club.dat',bytes(cd)),verbose=False); assert e==L
S,_,_=stadium.parse(tmp('stadium.dat',fmfio.get(rows['stadium.dat']))); cap={s['idx']:s['cap'] for s in S}
TIER={1670:'SL',1672:'CH',1673:'CH',1679:'LN',1680:'LN',1681:'LN',1682:'L4'}
BIG={'Persib Bandung','Persija Jakarta','Persebaya Surabaya','Bali United FC'}
REP_FLOOR={'SL':2800,'CH':2200,'LN':1200,'L4':700}
REP_SET={'Persib Bandung':4600,'Persija Jakarta':4500,'Persebaya Surabaya':4300,'Bali United FC':4100,'Borneo FC Samarinda':4200,'Gresik United FC':1500,'Persibo Bojonegoro':2800}
FAC={'BIG':(13,12),'SL':(10,9),'CH':(7,6),'LN':(5,4),'L4':(3,3)}
ATT_DEF={'SL':5000,'CH':2500,'LN':1200,'L4':500}
ATT={'Persib Bandung':25000,'Persija Jakarta':22000,'Persebaya Surabaya':20000,'PSS Sleman':12000,'Arema FC':12000,'PSIM Yogyakarta':10000,
 'PSM Makassar':9000,'Bali United FC':9000,'Persik Kediri':7000,'Persijap Jepara':7000,'Borneo FC Samarinda':6000,'Madura United FC':5000,
 'Persita Tangerang':4000,'Bhayangkara Presisi Lampung FC':3000,'Isenmulang Kalteng FC':3000,'Java United FC':3000,'Dewa United Banten FC':2500,
 'Garudayaksa FC':2000,'Persis Solo':9000,'PSIS Semarang':8000,'PSMS Medan':7000,'Persipura Jayapura':5000,'Persela Lamongan':5000,
 'Persiraja Banda Aceh':5000,'Semen Padang FC':4000,'PS Barito Putera':3000,'Deltras FC':3500,'Gresik United FC':2500,'Persibo Bojonegoro':2500}
log=[]
for x in C:
    if x['nat']!=58 or x['div'] not in TIER: continue
    t=TIER[x['div']]; nm=x['long']; m=x['o_misc']
    st,tr,ac=cd[m],cd[m+1],cd[m+2]; a,mn,mx=struct.unpack_from('<hhh',cd,m+3)
    # status: SL & Championship profesional
    nst=1 if t in('SL','CH') else st
    ft,fa=FAC['BIG' if nm in BIG else t]; ntr,nac=max(tr,ft),max(ac,fa)
    avg=ATT.get(nm,ATT_DEF[t]); c=cap.get(x['rep'],0) or 0
    if c: avg=min(avg,int(c*0.9))
    na=max(a*10,avg); nmn=max(mn*10,int(na*0.4)); nmx=max(mx*10,int(na*2.5)); 
    if c: nmx=min(max(nmx,na),c) if nmx>c else nmx
    nmx=max(nmx,na); nmn=min(nmn,na)
    cd[m]=nst; cd[m+1]=ntr; cd[m+2]=nac; struct.pack_into('<hhh',cd,m+3,min(na//10,32767),min(nmn//10,32767),min(nmx//10,32767))
    q=x['o_div']+10+(68 if x['flag'] else 0)+4+x['k']; rep=struct.unpack_from('<H',cd,q+1)[0]
    nrep=REP_SET.get(nm,max(rep,REP_FLOOR[t])); struct.pack_into('<H',cd,q+1,nrep)
    log.append(dict(klub=nm,tingkat=t,status=(st,nst),latihan=(tr,ntr),akademi=(ac,nac),penonton=(a*10,na),min=(mn*10,nmn),maks=(mx*10,nmx),reputasi=(rep,nrep)))
assert len(log)==64, len(log)
C2,e2,L2=club.parse(tmp('club2.dat',bytes(cd)),verbose=False); assert e2==L2 and len(C2)==len(C)
# nation.dat youth 19
nd=bytearray(fmfio.get(rows['nation.dat'])); i=nd.find(b'\x71\x00\x00\x00\x3a\x00\x09\x00\x00\x00Indonesia\xff'); k=nd.find(b'\xff\x7f\xd4\x00\x00\x00\xff\x7f',i)
q=k+8+3; assert nd[q]==10, nd[q]; nd[q]=19
# people.dat: Noah Adnan (UID 2000430201) negara 120 -> 58
pd=bytearray(fmfio.get(rows['people.dat'])); j=pd.find(b'\xff\xff\xff\xff'+struct.pack('<I',2000430201)); assert j>0
o=j+4+4+4+4+4+2+2; assert struct.unpack_from('<H',pd,o)[0]==120; struct.pack_into('<H',pd,o,58)
assert pd.count(b'\xff\xff\xff\xff'+struct.pack('<I',2000430201))==1
for n,b in (('club.dat',cd),('nation.dat',nd),('people.dat',pd)): rows[n][2]=bytes(b); rows[n][5]=None
os.makedirs(OUT,exist_ok=True); out,_=fmfio.write(flag,root); open(OUT+'db_archive_2706.fmf','wb').write(out)
json.dump(log,open('/home/claude/out/putaranB7b/perubahan_klub.json','w'),indent=1,ensure_ascii=False)
print('db',len(out))
