import sys,re
sys.path.insert(0,'/home/claude/scripts')
import dbcarc,fmfio
SRC='/home/claude/out/putaranB2/kirim/assets/shared/data/sicomps.fmf'
OUT='/home/claude/out/putaranB2b/kirim/assets/shared/data/sicomps.fmf'
flag,root=dbcarc.load_sicomps(SRC)
def row(path): return dbcarc.find(root,path)
def sub1(t,a,b):
    assert t.count(a)==1,(a[:80],t.count(a)); return t.replace(a,b)
# --- idn_comps.xml
r=row('/asia/idn/men/idn_comps.xml'); t=fmfio.get(r).decode('utf-8')
nl='\r\n' if '\r\n' in t else '\n'
dl=('\t\t\t\t<record>'+nl+'\t\t\t\t\t<record id="competition">'+nl+'\t\t\t\t\t\t<unsigned id="id" value="1668246896"/>'+nl+
    '\t\t\t\t\t\t<integer id="competition" value="41042740"/>'+nl+'\t\t\t\t\t</record>'+nl+'\t\t\t\t</record>'+nl+'\t\t\t</list>'+nl+'\t\t\t<list id="required_teams">')
t=sub1(t,dl,dl.replace('\t\t\t</list>'+nl+'\t\t\t<list id="required_teams">','')+dl.replace('41042740','41042746'))
t=sub1(t,'<integer id="competition" value="41042746"/>'+nl+'\t\t\t\t\t</record>'+nl+'\t\t\t\t\t<integer id="minimum_number_teams" value="18"/>'+nl+'\t\t\t\t\t<integer id="first_year_backup_teams" value="25"/>',
       '<integer id="competition" value="41042746"/>'+nl+'\t\t\t\t\t</record>'+nl+'\t\t\t\t\t<integer id="number_teams" value="20"/>'+nl+'\t\t\t\t\t<integer id="first_year_backup_teams" value="20"/>'+nl+'\t\t\t\t\t<integer id="backup_teams" value="20"/>')
c=('\t\t\t\t<record>'+nl+'\t\t\t\t\t<record id="competition">'+nl+'\t\t\t\t\t\t<unsigned id="id" value="1668246896"/>'+nl+'\t\t\t\t\t\t<integer id="competition" value="7746536"/>')
t=sub1(t,c,c.replace('7746536','41042746')+nl+'\t\t\t\t\t</record>'+nl+'\t\t\t\t</record>'+nl+c)
r[2]=t.encode('utf-8')
# --- idn_rules.xml
r=row('/asia/idn/men/idn_rules.xml'); t=fmfio.get(r).decode('utf-8'); nl='\r\n' if '\r\n' in t else '\n'
blk=('\t\t\t\t<record>'+nl+'\t\t\t\t\t<string id="type" value="start_of_season_for_selected_division"/>'+nl+'\t\t\t\t\t<integer id="base_year_offset" value="0"/>'+nl+
     '\t\t\t\t\t<boolean id="base_year_interval" value="false"/>'+nl+'\t\t\t\t\t<record id="competition">'+nl+'\t\t\t\t\t\t<unsigned id="id" value="1668246896"/>'+nl+
     '\t\t\t\t\t\t<integer id="competition" value="41042740"/>'+nl+'\t\t\t\t\t</record>'+nl+'\t\t\t\t</record>'+nl)
t=sub1(t,blk,blk+blk.replace('41042740','41042746')); r[2]=t.encode('utf-8')
# --- idn_league_three.xml dari league one
r1=row('/asia/idn/men/idn_league_one.xml'); t=fmfio.get(r1).decode('utf-8'); nl='\r\n' if '\r\n' in t else '\n'
t=sub1(t,'<integer id="competition" value="41004312"/>'+nl+'\t\t\t<string id="version"','<integer id="competition" value="41042746"/>'+nl+'\t\t\t<string id="version"')
t=sub1(t,'<string id="level" value="0"/>','<string id="level" value="2"/>')
t=sub1(t,'<string id="fixture_rules_index" value="0"/>','<string id="fixture_rules_index" value="2"/>')
t=sub1(t,'<integer id="number_teams" value="18"/>','<integer id="number_teams" value="20"/>')
t=sub1(t,'<record id="relegation">'+nl+'\t\t\t\t\t\t<integer id="id" value="1919249522"/>'+nl+'\t\t\t\t\t\t<integer id="number_places" value="3"/>'+nl+
       '\t\t\t\t\t\t<record id="competition">'+nl+'\t\t\t\t\t\t\t<integer id="id" value="1668246896"/>'+nl+'\t\t\t\t\t\t\t<integer id="competition" value="41042740"/>',
       '<record id="promotion">'+nl+'\t\t\t\t\t\t<integer id="id" value="1886547314"/>'+nl+'\t\t\t\t\t\t<integer id="number_places" value="3"/>'+nl+
       '\t\t\t\t\t\t<record id="competition">'+nl+'\t\t\t\t\t\t\t<integer id="id" value="1668246896"/>'+nl+'\t\t\t\t\t\t\t<integer id="competition" value="41042740"/>')
t=re.sub(r'<list id="break_periods">.*?</list>','<list id="break_periods"/>',t,count=1,flags=re.S)
t=sub1(t,'<unsigned id="id" value="1701078628"/>'+nl+'\t\t\t\t\t\t\t\t<integer id="info_1" value="33"/>','<unsigned id="id" value="1701078628"/>'+nl+'\t\t\t\t\t\t\t\t<integer id="info_1" value="37"/>')
t=sub1(t,'<integer id="number_dates" value="34"/>','<integer id="number_dates" value="38"/>')
t=sub1(t,'<boolean id="check_promotion" value="false"/>'+nl+'\t\t\t\t\t\t<boolean id="check_cont_cup" value="true"/>'+nl+'\t\t\t\t\t\t<boolean id="check_relegation" value="true"/>',
       '<boolean id="check_promotion" value="true"/>'+nl+'\t\t\t\t\t\t<boolean id="check_cont_cup" value="false"/>'+nl+'\t\t\t\t\t\t<boolean id="check_relegation" value="false"/>')
# hadiah 20 posisi
pm=''.join('\t\t\t\t\t\t<record>'+nl+'\t\t\t\t\t\t\t<string id="position" value="%d"/>'%p+nl+'\t\t\t\t\t\t\t<string id="cash" value="%d"/>'%(500000000-20000000*p)+nl+'\t\t\t\t\t\t\t<unsigned id="currency" value="37"/>'+nl+'\t\t\t\t\t\t</record>'+nl for p in range(20))
t=re.sub(r'(<list id="prize_money">'+re.escape(nl)+r').*?(\t\t\t\t\t</list>)',lambda m:m.group(1)+pm+m.group(2),t,count=1,flags=re.S)
t=sub1(t,'<real id="cash" value="900000000.000000"/>','<real id="cash" value="45000000.000000"/>')
t=sub1(t,'<real id="cash" value="150000000.000000"/>','<real id="cash" value="7500000.000000"/>')
fd='<integer id="info_1" value="0"/>'+nl+'\t\t\t\t\t<string id="day_of_week" value="fri"/>'+nl+'\t\t\t\t\t<integer id="day_of_month" value="8"/>'
t=sub1(t,fd,fd.replace('value="fri"','value="sat"').replace('"8"','"12"'))
t=sub1(t,'<integer id="info_1" value="33"/>'+nl+'\t\t\t\t\t<string id="day_of_week" value="sat"/>','<integer id="info_1" value="37"/>'+nl+'\t\t\t\t\t<string id="day_of_week" value="sat"/>')
vals=[int(x) for x in re.findall(r'<integer id="prize_money" value="(\d+)"/>',t)]; step=vals[0]-vals[1]; vals=[v//10 for v in vals+[vals[-1]-step,vals[-1]-2*step]]
tp=''.join('\t\t\t\t<record>'+nl+'\t\t\t\t\t<unsigned_large id="level" value="%d"/>'%p+nl+'\t\t\t\t\t<integer id="prize_money" value="%d"/>'%v+nl+'\t\t\t\t</record>'+nl for p,v in enumerate(vals))
t=re.sub(r'(<list id="typical_prize_money">'+re.escape(nl)+r').*?(\t\t\t</list>)',lambda m:m.group(1)+tp+m.group(2),t,count=1,flags=re.S)
t=re.sub(r'(<list id="helpers">'+re.escape(nl)+r').*?(\t\t\t</list>)',lambda m:m.group(1)+'\t\t\t\t<record>'+nl+'\t\t\t\t\t<string id="type" value="initial_tv_money"/>'+nl+'\t\t\t\t\t<integer id="competition" value="41042746"/>'+nl+'\t\t\t\t</record>'+nl+m.group(2),t,count=1,flags=re.S)
t=sub1(t,'<integer id="XSvC" value="90"/>','<integer id="XSvC" value="1"/>')
assert '41004312' not in t, [m.start() for m in re.finditer('41004312',t)]
folder=None
def findfolder(f):
    global folder
    if r1 in f.files: folder=f
    for s in f.subs: findfolder(s)
findfolder(root)
folder.files.insert(folder.files.index(r1)+1,[b'idn_league_three',r1[1],t.encode('utf-8'),r1[3],r1[4],None,None,None])
import os; os.makedirs(os.path.dirname(OUT),exist_ok=True)
out,_=fmfio.write(flag,root); open(OUT,'wb').write(out); print('ok',len(out))
