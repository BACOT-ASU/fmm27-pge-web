import fs from 'fs';
import {createRequire} from 'module'; const require=createRequire(import.meta.url);
const FMM=require('./fmmcore.js');
const db=await FMM.openDb(await fs.openAsBlob('/home/claude/out/putaranB1/kirim/assets/data/game/db_archive_2706.fmf'));
console.log('clubs',db.clubs.length,'comps',db.comps.length,'nations',db.nations.length);
console.log(db.nations.filter(n=>[58,61,139].includes(n.idx)));
const ln=db.comps.find(c=>c.uid===41042746); console.log(ln);
console.log(db.clubs.filter(c=>c.div===ln.idx).map(c=>c.name+' '+c.uid).slice(0,5));
const lg=await FMM.openLogos(await fs.openAsBlob('/home/claude/app/fake_logos.fmf'));
console.log('png',Object.keys(lg.png).length, Object.keys(lg.maps), FMM.findLogo(lg,'clubs','normal',116145), FMM.findLogo(lg,'comps','normal',41004312));
const png=fs.readFileSync('/home/claude/logos/c/c_persebaya_normal.png'), sm=fs.readFileSync('/home/claude/logos/c/c_persebaya_small.png');
const out=FMM.buildLogoArchive(lg,[{kind:'clubs',id:2000700017,normal:png,small:sm},{kind:'clubs',id:116145,normal:png,small:sm},{kind:'comps',id:41042746,normal:png,small:sm}]);
const ws=fs.createWriteStream('/home/claude/app/out_logos.fmf');
for(const p of out.parts){ const b=(p instanceof Uint8Array)?p:new Uint8Array(await p.arrayBuffer()); if(!ws.write(b)) await new Promise(r=>ws.once('drain',r)); }
await new Promise(r=>ws.end(r)); console.log('expected size',out.size, fs.statSync('/home/claude/app/out_logos.fmf').size);
