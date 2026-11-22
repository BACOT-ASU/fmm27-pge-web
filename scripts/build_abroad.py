# Pemain Indonesia di luar negeri + diaspora calon timnas (per 18 Nov 2026) -> CSV
import csv, pickle, json, datetime as dt
o=pickle.load(open('/home/claude/data/people_scan.pkl','rb'))
N=json.load(open('/home/claude/data/nation_idx.json')); L=pickle.load(open('/home/claude/data/fmm_people_idn.pkl','rb'))
def find(name):
    for x in o:
        full=(x['first']+' '+x['second']).strip()
        if full==name or x['common']==name: return x
    return None
S1='Berita Nov 2026 (gebrak.id / idntimes / tvonenews)'; S0='IDN Abroad via Bola.com, data 17 Feb 2026 (klub belum dicek ulang)'
# nama, posisi, posisi_lain, tgl_lahir(kalau DB tak punya), klub, negara_klub, status, sumber, catatan
R=[
 ('Emil Audero','GK','', '', 'Rayo Vallecano (pinjaman Como)','Spanyol','WNI',S1,''),
 ('Maarten Paes','GK','', '', 'Ajax','Belanda','WNI',S1,''),
 ('Jay Idzes','DC','', '', 'Sassuolo','Italia','WNI',S1,''),
 ('Kevin Diks','DR','DC', '', 'Borussia Mönchengladbach','Jerman','WNI',S1,''),
 ('Justin Hubner','DC','DL', '', 'Fortuna Sittard','Belanda','WNI',S1,''),
 ('Elkan Baggott','DC','', '', 'Millwall (pinjaman Ipswich Town)','Inggris','WNI',S1,''),
 ('Calvin Verdonk','DL','ML', '', 'Lille','Prancis','WNI',S1,''),
 ('Nathan Tjoe-A-On','DL','DM', '', 'Willem II','Belanda','WNI',S1,''),
 ('Dean James','DL','ML', '', 'Go Ahead Eagles','Belanda','WNI',S1,''),
 ('Mees Hilgers','DC','DR', '', 'SC Heerenveen','Belanda','WNI',S1,''),
 ('Joey Pelupessy','DM','MC', '', 'Lommel SK','Belgia','WNI',S1,''),
 ('Ole Romeny','ST','AML', '', 'Fortuna Sittard (pinjaman Oxford United)','Belanda','WNI',S1,''),
 ('Miliano Jonathans','AMR','AML', '', 'FC Utrecht','Belanda','WNI',S1,''),
 ('Luke Vickery','ST','', '', 'Macarthur FC','Australia','WNI',S1,'debut di FIFA ASEAN Cup 2026'),
 ('Adrian Wibowo','AML','ST', '', 'Los Angeles FC','Amerika Serikat','WNI',S1,''),
 ('Mitchell Baker','ST','', '2006-12-11', 'Colorado Rapids','Amerika Serikat','WNI (sumpah 13 Jul 2026)','Jawapos/Bola.com/Kompas, Jul 2026','lahir Melbourne, tinggi 196 cm'),
 ('Mathew Baker','DC','', '', 'Melbourne City','Australia','WNI',S0,'pemain muda'),
 ('Welber Jardim','MC','DR', '2007-04-25', 'São Paulo FC','Brasil','WNI','Skor.id / Sindonews Agu 2026','lahir Banjarmasin; Timnas U-20'),
 ('Noah Adnan','DC','', '2002-01-21', 'Loudoun United FC','Amerika Serikat','WNA (keturunan, dipanggil TC Nov 2026)','iNews 11 Nov 2026','di database berkebangsaan USA'),
 ('Asnawi Mangkualam','DR','DL', '', 'Port FC','Thailand','WNI',S0,''),
 ('Yohanes Kandaimu','MC','', '', 'Kelantan The Real Warriors','Malaysia','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Abdurrahman Iwan Kuswanto','MC','', '', 'Al Wakrah','Qatar','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Muhammad Misbah','MC','', '', 'Águilas FC','Spanyol','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Reycredo Bukit','MC','', '', 'Águilas FC','Spanyol','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Sulthan Zaky','DC','', '', 'Moi Kampong Dewa','(belum dicek)','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Givary Lotra','MC','', '', 'Moi Kampong Dewa','(belum dicek)','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Zinaedin Ardiansyah','MC','', '', 'Sydney FC','Australia','WNI',S0,'posisi & tgl lahir perkiraan'),
 ('Taisei Marukawa','AMC','', '', 'Dewa United (Super League)','Indonesia','WNA (proses naturalisasi)','iNews 11 Nov 2026','di database berkebangsaan JPN; sudah ada di data pemain Dewa United'),
]
import random; random.seed(2026)
out=[]
for nm,pos,pl,dob,club,cn,st,src,note in R:
    x=find(nm); est=[]
    if x:
        d0=(dt.date(x['year'],1,1)+dt.timedelta(days=x['day'])).isoformat()
        nat=N.get(str(x['nat']),['?','?'])[1]
        indb='ya'; uid=x['uid']; dob=dob or d0
        act=[]
        if nat!='IDN': act.append('beri kewarganegaraan IDN (kalau ingin dipanggil timnas)')
        if uid not in L: act.append('masukkan ke daftar muat fmm_people IDN-0/1/2')
        if not act: act.append('sudah lengkap (cek klub)')
    else:
        nat=''; indb='tidak'; uid=''
        if not dob:
            y=random.randint(1999,2004); dob=(dt.date(y,1,1)+dt.timedelta(days=random.randint(0,364))).isoformat(); est.append('tgl lahir')
        act=['tambah orang baru + masukkan ke fmm_people IDN-0/1/2']
    if 'perkiraan' in note and 'posisi' in note: est.append('posisi')
    out.append(dict(nama=nm,posisi=pos,posisi_lain=pl,tgl_lahir=dob,negara='IDN' if st.startswith('WNI') else ('USA' if nm=='Noah Adnan' else 'JPN'),
        klub=club,negara_klub=cn,status_wni=st,di_database=indb,uid_db=uid,kebangsaan_di_db=nat,tindakan='; '.join(act),
        sumber=src,perkiraan=', '.join(est),catatan=note))
w=csv.DictWriter(open('/home/claude/kit/data/pemain_indonesia_luar_negeri.csv','w',newline=''),fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
for r in out: print(r['nama'],'|',r['di_database'],r['kebangsaan_di_db'],'|',r['tindakan'])
