import fs from 'fs';
import {createRequire} from 'module'; const require=createRequire(import.meta.url);
const FMM=require('/home/claude/app/fmmcore.js');
const lg=await FMM.openLogos(await fs.openAsBlob('/home/claude/logos/b7/sparse_b6.fmf'));
const items=[];
for (const f of fs.readdirSync('img').filter(n=>n.endsWith('_normal.png'))) {
  const id=+f.split('_')[0];
  items.push({kind:'clubs',id,normal:fs.readFileSync('img/'+f),small:fs.readFileSync('img/'+id+'_small.png')});
}
const out=FMM.buildLogoArchive(lg,items);
fs.writeFileSync('b7_header.bin',Buffer.from(out.parts[0]));
const rest=out.parts.slice(2).map(p=>Buffer.from(p));
fs.writeFileSync('b7_patch.bin',Buffer.concat(rest));
console.log('items',items.length,'dataLen',lg.arc.dataLen,'final size',out.size,'patch',Buffer.concat(rest).length);
