import sys,glob,os,csv,re,statistics
sys.path.insert(0,'/home/claude/scripts'); import grid_color, grid_ocr2, difflib
from PIL import Image
D='/home/claude/in/dk/data_klub'; T='/home/claude/data/tm'
FOLDER2KEY={'Adhyaksa_FC_Bekasi':'adhyaksa','PSGC_Ciamis':'psgc','Persikad_Depok':'persikad','Persiku_Kudus':'persiku','Persiraja_Banda_Aceh':'persiraja','De_Red_FC':'de_red','Deltras_FC':'deltras','Persiba_Balikpapan':'persiba_bpp','RANS_Nusantara_FC':'rans','Batavia_FC':'batavia','Pekanbaru_FC':'pekanbaru_fc','Persekat_Tegal':'persekat','Persikota_Tangerang':'persikota','Persikotas_Nusantara':'persikotas','Persitara_Jakarta_Utara':'persitara','Pesik_Kuningan':'pesik','Gresik_United_FC':'gresik','Persiba_Bantul':'persiba_bantul','Persibangga_Purbalingga':'persibangga','Persibo_Bojonegoro':'persibo','Persika_Karanganyar':'persika','Persinga_Ngawi':'persinga','Persipa_Pati':'persipa','Putra_Sang_Fajar_FC':'putra_sang_fajar','Donggala_United_FC':'donggala','PSN_Ngada':'psn_ngada','Pasuruan_United':'pasuruan_united','Perseden_Denpasar':'perseden','Persekabpas_Kab_Pasuruan':'persekabpas','Persikutim_United':'persikutim','Persinab_Nabire':'persinab','Persipani_Paniai':'persipani','Persid_Jember':'persid','PS_Mojokerto_Putra':'psmp','Persikoba_Batu':'persikoba'}
POS={'Kiper':'GK','Bek-Tengah':'DC','Bek':'DC','Bek-Kiri':'DL','Bek-Kanan':'DR','Gel. Bertahan':'DM','Gelandang':'MC','Gel. Tengah':'MC','Gelandang Kanan':'MR','Gelandang Kiri':'ML','Gel. Serang':'AMC','Sayap Kiri':'AML','Sayap Kanan':'AMR','Depan-Tengah':'ST','Penyerang':'ST'}
TM2FM={'GK':'GK','SW':'DC','CB':'DC','LB':'DL','RB':'DR','DM':'DM','CM':'MC','RM':'MR','LM':'ML','AM':'AMC','LW':'AML','RW':'AMR','SS':'ST','CF':'ST'}
def isgrid(f):
    im=Image.open(f).convert('RGB'); px=im.load(); W,H=im.size
    return sum(1 for y in range(0,H,4) for x in range(0,W,4) if grid_color.g(px[x,y]))>200
res={}; rep=[]
for d in sorted(glob.glob(D+'/*/')):
    fold=os.path.basename(d[:-1]); key=None
    for k,v in FOLDER2KEY.items():
        if fold.endswith(k): key=v
    if not key: continue
    P=[l.rstrip('\n').split('|') for l in open(f'{T}/{key}.txt',encoding='utf8') if l.strip() and not l.startswith('S|')]
    S=[l.rstrip('\n').split('|') for l in open(f'{T}/{key}.txt',encoding='utf8') if l.startswith('S|')]
    grids=[f for f in sorted(glob.glob(d+'Screenshot*.png')) if isgrid(f)]
    pos2={}
    if grids:
        gr=grid_ocr2.read(grids[0])
        names=[p[3] for p in P]
        for nm,pr,se in gr:
            m=difflib.get_close_matches(nm,[n[:len(nm)+2] for n in names],n=1,cutoff=0.6)
            if m:
                idx=[n[:len(nm)+2] for n in names].index(m[0]); pos2.setdefault(idx,(pr,se))
    mism=0; out=[]
    for i,p in enumerate(P):
        main=POS.get(p[1],'?'); extra=[]
        if i in pos2:
            pr,se=pos2[i]; prf=[TM2FM[x] for x in pr]
            GEN={'Bek','Gelandang','Penyerang'}
            if prf and (p[1] in GEN or prf[0]==main or main in prf): main=main if main in prf else prf[0]
            elif prf: mism+=1; print('  beda',key,p[3],p[1],prf)
            extra0=[x for x in prf if x!=main]
            se=se+[k for k,v in TM2FM.items() if v in extra0 and k not in se][:0]
            extra=[x for x in prf if x!=main]+[TM2FM[x] for x in se if TM2FM[x]!=main]
        out.append(dict(no=p[0],pos_tm=p[1],pos=main,pos_lain=', '.join(dict.fromkeys(extra)),nat=p[2],name=p[3],dob=p[4] if len(p)>4 else '',kontrak=p[5] if len(p)>5 else '',nilai_jt=p[6] if len(p)>6 else '',tinggi=p[7] if len(p)>7 else '',kaki=p[8] if len(p)>8 else ''))
    res[key]=(out,S); rep.append((key,len(P),max(pos2)+1 if pos2 else 0,mism))
import pickle; pickle.dump(res,open('/home/claude/data/tm_merged.pkl','wb'))
for r in rep: print(r)
print([ (k,[(o['name'],o['pos_tm'],o['pos']) for o in v[0]][:0]) for k,v in res.items()][:0])
