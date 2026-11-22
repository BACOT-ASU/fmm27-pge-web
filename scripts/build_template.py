import sys,csv,pickle,struct
sys.path.insert(0,'/home/claude/scripts'); import stadium
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
F='Arial'; H=Font(name=F,bold=True,color='FFFFFF'); HF=PatternFill('solid',fgColor='1F4E78')
Y=PatternFill('solid',fgColor='FFF2CC'); G=PatternFill('solid',fgColor='E2EFDA'); N=Font(name=F); B=Font(name=F,bold=True)
recs=pickle.load(open('/tmp/clubs.pkl','rb'))
S,_,_=stadium.parse('/tmp/b7_stadium2.dat')
COMP={1670:'BRI Super League',1672:'Pegadaian Champ Barat',1673:'Pegadaian Champ Timur',1679:'Liga Nusantara Grup A',1680:'Liga Nusantara Grup B',1681:'Liga Nusantara Grup C',1682:'Liga 4'}
# stadion terbaru (B7a) dari build_b7_db mapping
import json
HOME={}
src=open('/home/claude/scripts/build_b7_db.py').read()
exec(src[src.index('HOME = {'):src.index('}',src.index('HOME = {'))+1])
byname={x['name']:x for x in S}
clubs=[x for x in recs if x['nat']==58 and x['div'] in COMP]
clubs.sort(key=lambda x:(list(COMP).index(x['div']),x['long']))
players=list(csv.reader(open('/home/claude/data/pemain_indonesia.csv')))[1:]
staff=list(csv.reader(open('/home/claude/data/staf_indonesia.csv')))[1:]
# nama klub di CSV -> nama di game
alias={'Bhayangkara Presisi Lampung FC':'Bhayangkara Presisi Lampung FC'}
compof={x['long']:COMP[x['div']] for x in clubs}
wb=Workbook()
def header(ws,cols,widths,inputs):
    for i,(c,w) in enumerate(zip(cols,widths),1):
        cell=ws.cell(1,i,c); cell.font=H; cell.fill=HF; cell.alignment=Alignment(wrap_text=True,vertical='center')
        ws.column_dimensions[cell.column_letter].width=w
    ws.row_dimensions[1].height=32; ws.freeze_panes='C2'; ws.auto_filter.ref=ws.dimensions
# ---- Panduan
ws=wb.active; ws.title='Panduan'
rows=[('Template data pemain, staf, dan klub — mod FMM27 Liga Indonesia',B),
('',N),
('Cara mengisi',B),
('1. Isi hanya sel berwarna KUNING. Sel hijau sudah terisi dari Wikipedia; boleh dikoreksi kalau salah.',N),
('2. Satu baris = satu orang. Untuk klub yang skuadnya kosong, tambahkan baris baru di bawah tabel Pemain/Staf.',N),
('3. Nama klub harus persis sama dengan kolom "Klub" di tab Klub (pilih dari dropdown).',N),
('4. Tanggal ditulis YYYY-MM-DD, misal 1998-06-25. Nilai pasar dalam Rupiah tanpa titik (Transfermarkt: Rp 1,74 M → 1740000000).',N),
('5. Kolom yang tidak diketahui boleh dikosongkan; game/AI akan memperkirakan.',N),
('6. Kirim balik file ini (boleh bertahap per klub).',N),
('',N),
('Kode posisi detail (kolom "Posisi detail")',B),
('GK kiper · DR/DC/DL bek kanan/tengah/kiri · WBR/WBL wing-back · DM gelandang bertahan · MR/MC/ML gelandang · AMR/AMC/AML gelandang serang/sayap · ST penyerang. Lebih dari satu: pisahkan koma, misal "AMR, ST".',N),
('',N),
('Contoh baris Pemain (format yang diharapkan)',B)]
for i,(t,f) in enumerate(rows,1):
    c=ws.cell(i,1,t); c.font=f
ex=['Liga Nusantara Grup B','Gresik United FC','10','Rafi Herlian Adinata','Rafi Herlian','MF','AMC, MC','2001-03-14','IDN','','172','Kanan','500000000','2027-05-31','Tetap','','Tidak','(contoh — tanggal & nilai fiktif)']
PCOLS=['Kompetisi','Klub','No','Nama lengkap','Nama tampilan','Posisi umum','Posisi detail','Tgl lahir (YYYY-MM-DD)','Kebangsaan (kode 3 huruf)','Kebangsaan ke-2','Tinggi (cm)','Kaki dominan','Nilai pasar (Rp)','Kontrak sampai (YYYY-MM-DD)','Status','Pinjaman dari klub','Pemain timnas?','Catatan']
for j,(h,v) in enumerate(zip(PCOLS,ex),1):
    ws.cell(15,j,h).font=B; ws.cell(16,j,v).font=N
ws.cell(18,1,'Legenda warna').font=B
ws.cell(19,1,'Kuning = isi oleh Bacad').fill=Y; ws.cell(20,1,'Hijau = sudah terisi (Wikipedia, Nov 2026)').fill=G
ws.column_dimensions['A'].width=24
for j in range(2,19): ws.column_dimensions[ws.cell(1,j).column_letter].width=16
# ---- Daftar (dropdown)
dl=wb.create_sheet('Daftar')
lists={'A':('Posisi umum',['GK','DF','MF','FW']),'B':('Kaki',['Kanan','Kiri','Dua kaki']),'C':('Status',['Tetap','Pinjaman']),'D':('Ya/Tidak',['Ya','Tidak']),
'E':('Jabatan',['Head coach','Assistant coach','Goalkeeping coach','Fitness coach','Analyst','Doctor','Physiotherapist','Scout','Head of scouting','Technical director','Sporting director','U20 Head coach','U18 Head coach']),
'F':('Klub',[x['long'] for x in clubs])}
for col,(h,vals) in lists.items():
    dl[col+'1']=h; dl[col+'1'].font=B
    for i,v in enumerate(vals,2): dl[f'{col}{i}']=v; dl[f'{col}{i}'].font=N
    dl.column_dimensions[col].width=28
def dv(ws,col,lst,n,rng):
    d=DataValidation(type='list',formula1=f"=Daftar!${lst}$2:${lst}${n+1}",allow_blank=True); ws.add_data_validation(d); d.add(rng)
# ---- Pemain
ws=wb.create_sheet('Pemain'); header(ws,PCOLS,[22,28,6,26,20,9,14,16,12,12,9,11,16,16,10,20,10,24],None)
r=2
for comp,club,no,pos,nat,name in players:
    vals=[compof.get(club,comp),club,no if no!='-' else '',name,'',pos,'','',nat,'','','','','','','','','']
    for j,v in enumerate(vals,1):
        c=ws.cell(r,j,v); c.font=N; c.fill=G if v!='' else Y
    r+=1
LAST=r+400
for rr in range(r,LAST):
    for j in range(1,19): ws.cell(rr,j).fill=Y; ws.cell(rr,j).font=N
dv(ws,'F','F',len(clubs),f'B2:B{LAST}'); dv(ws,'A','A',4,f'F2:F{LAST}'); dv(ws,'B','B',3,f'L2:L{LAST}'); dv(ws,'C','C',2,f'O2:O{LAST}'); dv(ws,'D','D',2,f'Q2:Q{LAST}')
ws.cell(1,4).comment=Comment('Sumber baris hijau: Wikipedia (halaman klub & musim 2026–27), diambil 18 Nov 2026.','Claude')
# ---- Staf
SCOLS=['Kompetisi','Klub','Jabatan','Nama','Kebangsaan (kode 3 huruf)','Tgl lahir (YYYY-MM-DD)','Kontrak sampai (YYYY-MM-DD)','Catatan']
ws=wb.create_sheet('Staf'); header(ws,SCOLS,[22,28,20,26,12,16,16,24],None)
r=2
for comp,club,role,name in staff:
    vals=[compof.get(club,comp),club,role,name,'','','','']
    for j,v in enumerate(vals,1):
        c=ws.cell(r,j,v); c.font=N; c.fill=G if v!='' else Y
    r+=1
LS=r+200
for rr in range(r,LS):
    for j in range(1,9): ws.cell(rr,j).fill=Y; ws.cell(rr,j).font=N
dv(ws,'F','F',len(clubs),f'B2:B{LS}'); dv(ws,'E','E',13,f'C2:C{LS}')
# ---- Klub
import re
LOGO=set(int(m) for m in re.findall(r'graphics/pictures/club/(\d+)/',open('/home/claude/logos/b6/clubs_normal_config.xml',encoding='utf8',errors='replace').read()))|{2000700017}
KCOLS=['Kompetisi','Klub','UID game','Stadion (di game)','Kapasitas','Pemain terkumpul','Staf terkumpul','Nama stadion asli (koreksi)','Kapasitas asli','Kota','Logo di game','File logo PNG (hanya jika Belum)','Catatan']
ws=wb.create_sheet('Klub'); header(ws,KCOLS,[22,28,12,26,10,10,10,24,10,16,11,20,24],None)
GRAY=PatternFill('solid',fgColor='D9D9D9')
for i,x in enumerate(clubs,2):
    st=x['rep']
    if st==0xFFFF and x['long'] in HOME: s=byname[HOME[x['long']]]
    else: s=S[st] if st<len(S) else None
    vals=[COMP[x['div']],x['long'],x['uid'],s['name'] if s else '',s['cap'] if s else '']
    for j,v in enumerate(vals,1): c=ws.cell(i,j,v); c.font=N; c.fill=G
    ws.cell(i,6,f'=COUNTIF(Pemain!$B:$B,B{i})').font=N
    ws.cell(i,7,f'=COUNTIF(Staf!$B:$B,B{i})').font=N
    for j in (8,9,10,13): ws.cell(i,j).fill=Y; ws.cell(i,j).font=N
    ada=x['uid'] in LOGO
    c=ws.cell(i,11,'Sudah' if ada else 'Belum'); c.font=N; c.fill=G if ada else Y
    c=ws.cell(i,12,'— tidak perlu —' if ada else ''); c.font=N; c.fill=GRAY if ada else Y
ws.cell(1,11).comment=Comment('Sudah = logo klub ini sudah ada di pictures_logos.fmf (bawaan APK mod atau B6). Belum = belum ada logo.','Claude')
ws.cell(1,12).comment=Comment('Hanya untuk klub Belum: tulis nama file PNG logo yang kamu kirim. Boleh juga untuk klub Sudah kalau ingin mengganti logonya.','Claude')
wb.move_sheet('Klub',offset=-3)
wb.move_sheet('Daftar',offset=1)
wb.save('template_data_liga_indonesia.xlsx'); print(len(clubs),len(players),len(staff))
