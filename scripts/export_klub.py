# Ekspor data klub Indonesia (db B7a) ke CSV
import sys, struct, csv, zipfile, io, os, glob
sys.path.insert(0,'/home/claude/scripts'); import fmfio, club, stadium
z=zipfile.ZipFile('/home/claude/out/putaranB7a/putaranB7a_untuk_APK_mod.zip')
name=[n for n in z.namelist() if n.endswith('db_archive_2706.fmf')][0]
open('/tmp/db.fmf','wb').write(z.read(name))
flag,root,_=fmfio.read(open('/tmp/db.fmf','rb').read())
rows={p.split('/')[-1]:r for p,r in fmfio.walk(root)}
def tmp(n,b): p='/tmp/'+n; open(p,'wb').write(b); return p
cd=fmfio.get(rows['club.dat']); C,e,L=club.parse(tmp('club.dat',cd),verbose=False)
S,_,_=stadium.parse(tmp('stadium.dat',fmfio.get(rows['stadium.dat'])))
sidx={s['idx']:s for s in S}
DIV={1670:'BRI Super League',1672:'Pegadaian Champ Barat',1673:'Pegadaian Champ Timur',1679:'Liga Nusantara Grup A',1680:'Liga Nusantara Grup B',1681:'Liga Nusantara Grup C',1682:'Liga 4'}
logos=set()
for f in glob.glob('/home/claude/logos/b6/clubs_normal_config.xml'):
    import re; logos|=set(int(x) for x in re.findall(r'custom/(\d+)',open(f).read()))
newlogo={int(os.path.basename(f).split('_')[0]) for f in glob.glob('/home/claude/kit/data/logo_klub/*.png')}
import pandas as pd
P=pd.read_csv('/home/claude/kit/data/pemain_indonesia_v2.csv'); St=pd.read_csv('/home/claude/kit/data/staf_indonesia_v2.csv')
xl=pd.read_excel('/home/claude/kit/data/data_liga_indonesia_v2.xlsx','Klub')
nm={int(r['UID game']):r['Klub'] for _,r in xl.iterrows()}
ST={1:'profesional',2:'semi-pro',3:'amatir'}
out=[]
for x in C:
    if x['nat']!=58: continue
    if x['div'] not in DIV and x['div']!=-1: continue
    m=cd[x['o_misc']:x['o_misc']+10]
    st,ft,fa=m[0],m[1],m[2]; a,mn,mx=struct.unpack_from('<hhh',m,3)
    s=sidx.get(x['rep']); 
    dn=nm.get(x['uid'],x['long'])
    out.append(dict(kompetisi=DIV.get(x['div'],'Dikeluarkan (divisi -1)'),klub_data=dn,nama_game=x['long'],nama_pendek=x['short'],uid=x['uid'],
      status=ST.get(st,st),fasilitas_latihan=ft,fasilitas_akademi=fa,penonton_rata=a*10,penonton_min=mn*10,penonton_maks=mx*10,
      stadion=s['name'] if s else '',kapasitas=s['cap'] if s else '',
      punya_blok_keuangan='ya' if x['flag'] else 'tidak',staf_di_game=sum(1 for v in x['staff'] if v>0),skuad_di_game=len(x['squad']),
      logo='sudah di game' if (x['uid'] in logos or x['uid']==2000700017) else ('PNG siap (dari Bacad)' if x['uid'] in newlogo else 'belum ada'),
      pemain_data=int((P.klub==dn).sum()),staf_data_di_klub=int(((St.klub==dn)&(St.status=='Di klub')).sum())))
order=list(DIV.values())+['Dikeluarkan (divisi -1)']
out.sort(key=lambda r:(order.index(r['kompetisi']),r['nama_game']))
w=csv.DictWriter(open('/home/claude/kit/data/klub_indonesia.csv','w',newline=''),fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
print(len(out)); print(pd.DataFrame(out).to_string()[:6000])
