import csv,pickle,os
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill
D='/home/claude/kit/data/'
F='Arial'; H=Font(name=F,bold=True,color='FFFFFF'); HF=PatternFill('solid',fgColor='1F4E78'); N=Font(name=F); B=Font(name=F,bold=True)
EST=PatternFill('solid',fgColor='FCE4D6')
wb=Workbook(); ws=wb.active; ws.title='Panduan'
for i,t in enumerate(['Data pemain & staf Liga Indonesia 2026/27 untuk mod FMM27 (versi 2, 18 Nov 2026)','',
'Sumber: Transfermarkt (screenshot dari Bacad) untuk 35 klub; Wikipedia untuk klub Super League & 11 klub Championship.',
'Sel oranye muda = nilai PERKIRAAN (dikarang mendekati wajar). Kolom "perkiraan" menyebut field mana.',
'Posisi: kode FM (GK, DC, DL, DR, DM, MC, ML, MR, AMC, AML, AMR, ST). Nilai pasar dalam juta Rupiah.',
'Staf: slot per klub mengikuti level (klub besar SL 10, SL lain 7, Championship 4, Liga Nusantara 3, Liga 4 2). Prioritas: satu orang per jabatan dulu (pelatih kepala, asisten, pelatih kiper, pelatih fisik, fisio, dokter, analis), baru tambahan. Kelebihan = "Tanpa klub" (tetap ada di database).',
'Boleh dikoreksi lalu kirim balik; perubahan dipakai saat data dimasukkan ke game (putaran B3).'],1):
    ws.cell(i,1,t).font=B if i==1 else N
ws.column_dimensions['A'].width=120
def sheet(name,path,widths,estcol=None,estmap=None):
    s=wb.create_sheet(name); r=list(csv.reader(open(path,encoding='utf8')))
    for j,h in enumerate(r[0],1):
        c=s.cell(1,j,h); c.font=H; c.fill=HF; s.column_dimensions[c.column_letter].width=widths[j-1]
    for i,row in enumerate(r[1:],2):
        for j,v in enumerate(row,1):
            c=s.cell(i,j,int(v) if (v.isdigit() and r[0][j-1] in ('nilai_juta_rp','tinggi_cm','umur')) else v); c.font=N
        if estcol is not None and row[estcol]:
            for f in row[estcol].split(', '):
                if f in estmap: s.cell(i,estmap[f]).fill=EST
    s.freeze_panes='C2'; s.auto_filter.ref=s.dimensions
sheet('Pemain',D+'pemain_indonesia_v2.csv',[22,26,5,26,7,14,9,12,8,9,12,13,28,22],13,{'tgl lahir':8,'nilai':11,'kontrak':12})
sheet('Staf',D+'staf_indonesia_v2.csv',[22,26,18,26,9,7,13,24,28])
k=wb.create_sheet('Klub')
for j,h in enumerate(['Kompetisi','Klub','UID game','Pemain','Staf di klub','Logo'],1):
    c=k.cell(1,j,h); c.font=H; c.fill=HF
recs=pickle.load(open('/tmp/clubs.pkl','rb'))
COMP={1670:'BRI Super League',1672:'Pegadaian Champ Barat',1673:'Pegadaian Champ Timur',1679:'Liga Nusantara Grup A',1680:'Liga Nusantara Grup B',1681:'Liga Nusantara Grup C',1682:'Liga 4'}
cl=sorted([x for x in recs if x['nat']==58 and x['div'] in COMP],key=lambda x:(list(COMP).index(x['div']),x['long']))
newlogo={int(f.split('_')[0]) for f in os.listdir(D+'logo_klub')}
for i,x in enumerate(cl,2):
    for j,v in enumerate([COMP[x['div']],x['long'],x['uid']],1): k.cell(i,j,v).font=N
    k.cell(i,4,f'=COUNTIF(Pemain!$B:$B,B{i})').font=N
    k.cell(i,5,f'=COUNTIFS(Staf!$B:$B,B{i},Staf!$H:$H,"Di klub")').font=N
    k.cell(i,6,'PNG baru (Bacad)' if x['uid'] in newlogo else 'Sudah di game').font=N
for c,w in zip('ABCDEF',[22,28,12,8,11,18]): k.column_dimensions[c].width=w
wb.move_sheet('Klub',offset=-2)
wb.save(D+'data_liga_indonesia_v2.xlsx')
