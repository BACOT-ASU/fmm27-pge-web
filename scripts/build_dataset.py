# Gabung data Wikipedia + Transfermarkt (screenshot Bacad), lengkapi yang kosong dengan perkiraan.
import csv,pickle,random,datetime,unicodedata,sys
sys.path.insert(0,'/home/claude/scripts')
random.seed(2026)
TODAY=datetime.date(2026,11,18)
TM=pickle.load(open('/home/claude/data/tm_merged.pkl','rb'))
KEY2CLUB={'adhyaksa':('Pegadaian Champ Barat','Adhyaksa FC Bekasi'),'psgc':('Pegadaian Champ Barat','PSGC Ciamis'),'persikad':('Pegadaian Champ Barat','Persikad Depok'),'persiku':('Pegadaian Champ Barat','Persiku Kudus'),'persiraja':('Pegadaian Champ Barat','Persiraja Banda Aceh'),'de_red':('Pegadaian Champ Timur','De Red FC'),'deltras':('Pegadaian Champ Timur','Deltras FC'),'persiba_bpp':('Pegadaian Champ Timur','Persiba Balikpapan'),'rans':('Pegadaian Champ Timur','RANS Nusantara FC'),
'batavia':('Liga Nusantara Grup A','Batavia FC'),'pekanbaru_fc':('Liga Nusantara Grup A','Pekanbaru FC'),'persekat':('Liga Nusantara Grup A','Persekat Tegal'),'persikota':('Liga Nusantara Grup A','Persikota Tangerang'),'persikotas':('Liga Nusantara Grup A','Persikotas Nusantara'),'persitara':('Liga Nusantara Grup A','Persitara Jakarta Utara'),'pesik':('Liga Nusantara Grup A','Pesik Kuningan'),
'gresik':('Liga Nusantara Grup B','Gresik United FC'),'persiba_bantul':('Liga Nusantara Grup B','Persiba Bantul'),'persibangga':('Liga Nusantara Grup B','Persibangga Purbalingga'),'persibo':('Liga Nusantara Grup B','Persibo Bojonegoro'),'persika':('Liga Nusantara Grup B','Persika Karanganyar'),'persinga':('Liga Nusantara Grup B','Persinga Ngawi'),'persipa':('Liga Nusantara Grup B','Persipa Pati'),'putra_sang_fajar':('Liga Nusantara Grup B','Putra Sang Fajar FC'),
'donggala':('Liga Nusantara Grup C','Donggala United FC'),'psn_ngada':('Liga Nusantara Grup C','PSN Ngada'),'pasuruan_united':('Liga Nusantara Grup C','Pasuruan United'),'perseden':('Liga Nusantara Grup C','Perseden Denpasar'),'persekabpas':('Liga Nusantara Grup C','Persekabpas Kab. Pasuruan'),'persikutim':('Liga Nusantara Grup C','Persikutim United'),'persinab':('Liga Nusantara Grup C','Persinab Nabire'),'persipani':('Liga Nusantara Grup C','Persipani Paniai'),
'persid':('Liga 4','Persid Jember'),'psmp':('Liga 4','PS Mojokerto Putra'),'persikoba':('Liga 4','Persikoba Batu')}
COMPFIX={'BRI Super League':'BRI Super League','Pegadaian Champ Barat':'Pegadaian Champ Barat','Pegadaian Champ Timur':'Pegadaian Champ Timur'}
BIG={'Persib Bandung','Persija Jakarta','Persebaya Surabaya','Bali United FC'}
def norm(s): return unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().strip()
def tier(comp,club):
    if comp=='BRI Super League': return 'SL+' if club in BIG else 'SL'
    if comp.startswith('Pegadaian'): return 'CH'
    if comp.startswith('Liga Nusantara'): return 'LN'
    return 'L4'
VAL={'SL+':(800,3500),'SL':(300,2200),'CH':(100,900),'LN':(25,250),'L4':(10,100)}
def est_value(t,age,foreign):
    lo,hi=VAL[t]; v=random.uniform(lo,hi)
    if age is not None:
        if age<20: v*=0.5
        elif age>32: v*=0.6
    if foreign: v*=1.8
    return round(v)
def age_of(dob):
    try: d=datetime.date.fromisoformat(dob); return TODAY.year-d.year-((TODAY.month,TODAY.day)<(d.month,d.day))
    except Exception: return None
rows=[];seen=set()
tmnames=set()
for key,(players,staff) in TM.items():
    for p in players: tmnames.add(norm(p['name']))
for key,(players,staff) in TM.items():
    comp,club=KEY2CLUB[key]
    for p in players:
        k=(norm(p['name']),p['dob'])
        if k in seen: continue
        seen.add(k); rows.append(dict(kompetisi=comp,klub=club,**p,sumber='Transfermarkt (screenshot Bacad)'))
for r in csv.DictReader(open('/home/claude/data/pemain_indonesia.csv',encoding='utf8')):
    if r['klub'] in {v[1] for v in KEY2CLUB.values()}: continue
    if norm(r['nama']) in tmnames: continue
    pos={'GK':'GK','DF':'DC','MF':'MC','FW':'ST'}[r['posisi']]
    rows.append(dict(kompetisi=r['kompetisi'],klub=r['klub'],no=r['no'],pos_tm=r['posisi'],pos=pos,pos_lain='',nat=r['negara'],name=r['nama'],dob='',kontrak='',nilai_jt='',tinggi='',kaki='',sumber='Wikipedia'))
out=[]
for r in rows:
    est=[]
    dob=r['dob']
    if dob and len(dob)<=3:  # umur saja
        a=int(dob); dob=f"{TODAY.year-a-1}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"; est.append('tgl lahir')
    elif not dob:
        a=random.choice([20,21,22,23,24,25,26,27,28,29,30]) if r['pos']!='GK' else random.randint(21,31)
        dob=f"{TODAY.year-a}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"; est.append('tgl lahir')
    age=age_of(dob); foreign=not r['nat'].startswith('IDN')
    t=tier(r['kompetisi'],r['klub'])
    val=r['nilai_jt']
    if not val: val=str(est_value(t,age,foreign)); est.append('nilai')
    kon=r['kontrak']
    if not kon: kon=random.choice(['2027-05-31','2027-05-31','2028-05-31']); est.append('kontrak')
    tg=r['tinggi'].replace('m','').replace(',','.') if r['tinggi'] and r['tinggi']!='-' else ''
    if tg: tg=str(round(float(tg)*100))
    kaki={'kanan':'Kanan','kiri':'Kiri','keduanya':'Dua kaki'}.get(r['kaki'].strip(),'')
    out.append([r['kompetisi'],r['klub'],r['no'] if r['no']!='-' else '',r['name'],r['pos'],r['pos_lain'],r['nat'],dob,tg,kaki,val,kon,r['sumber'],', '.join(est)])
out.sort(key=lambda x:(['BRI Super League','Pegadaian Champ Barat','Pegadaian Champ Timur','Liga Nusantara Grup A','Liga Nusantara Grup B','Liga Nusantara Grup C','Liga 4'].index(x[0]),x[1]))
w=csv.writer(open('/home/claude/data/pemain_indonesia_v2.csv','w',newline='',encoding='utf8'))
w.writerow(['kompetisi','klub','no','nama','posisi','posisi_lain','negara','tgl_lahir','tinggi_cm','kaki','nilai_juta_rp','kontrak_sampai','sumber','perkiraan'])
w.writerows(out)
# ---- staf
ROLE={'Pelatih Kepala':'Head coach','Pelatih Interim':'Head coach','Assisten Pelatih':'Assistant coach','Pelatih Kiper':'Goalkeeping coach','Pelatih Fisik':'Fitness coach','Fisioterapis':'Physiotherapist','Video Analis':'Analyst'}
SLOT={'SL+':10,'SL':7,'CH':4,'LN':3,'L4':2}
PRI=['Head coach','Assistant coach','Goalkeeping coach','Fitness coach','Physiotherapist','Doctor','Analyst','Video analyst','Head of scouting','Technical director','Sporting director','Technical advisor','U20 Head coach','U18 Head coach']
staf=[]
for key,(players,staff) in TM.items():
    comp,club=KEY2CLUB[key]
    for s in staff:
        staf.append(dict(kompetisi=comp,klub=club,jabatan=ROLE.get(s[1],s[1]),nama=s[3],negara=s[2],umur=s[4] if len(s)>4 else '',kontrak=s[5] if len(s)>5 else '',sumber='Transfermarkt (screenshot Bacad)'))
tmstaff={norm(s['nama']) for s in staf}; tmclubs={v[1] for v in KEY2CLUB.values()}
for r in csv.DictReader(open('/home/claude/data/staf_indonesia.csv',encoding='utf8')):
    if r['klub'] in tmclubs or norm(r['nama']) in tmstaff: continue
    staf.append(dict(kompetisi=r['kompetisi'],klub=r['klub'],jabatan=r['jabatan'],nama=r['nama'],negara='',umur='',kontrak='',sumber='Wikipedia'))
used_names=set()
by={}
for s in staf: by.setdefault(s['klub'],[]).append(s)
final=[]
for club,lst in by.items():
    t=tier(lst[0]['kompetisi'],club); n=SLOT[t]
    seen_role={}
    def rank(s):
        j=s['jabatan']; n_=seen_role.get(j,0); seen_role[j]=n_+1
        base=PRI.index(j) if j in PRI else 99
        return (0 if n_==0 else 1, base)   # satu orang per jabatan dulu, baru tambahan
    lst=[s for s in lst if not (norm(s['nama']) in used_names)]
    for s in lst: used_names.add(norm(s['nama']))
    keyed=[(rank(s),i,s) for i,s in enumerate(sorted(lst,key=lambda s:PRI.index(s['jabatan']) if s['jabatan'] in PRI else 99))]
    lst=[s for _,_,s in sorted(keyed,key=lambda a:(a[0],a[1]))]
    for i,s in enumerate(lst):
        s['status']='Di klub' if i<n else 'Tanpa klub (melebihi slot)'
        final.append(s)
w=csv.writer(open('/home/claude/data/staf_indonesia_v2.csv','w',newline='',encoding='utf8'))
w.writerow(['kompetisi','klub','jabatan','nama','negara','umur','kontrak_sampai','status','sumber'])
for s in final: w.writerow([s[k] for k in ('kompetisi','klub','jabatan','nama','negara','umur','kontrak','status','sumber')])
from collections import Counter
print(len(out),'pemain',Counter(o[12] for o in out)); print(len(final),'staf',Counter(s['status'] for s in final))
print('klub',len({o[1] for o in out}))
