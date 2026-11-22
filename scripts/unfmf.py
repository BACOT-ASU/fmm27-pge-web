import sys,struct,os,zstandard
src,out=sys.argv[1],sys.argv[2]
d=open(src,'rb').read()
assert d[:6]==b'\x02\x01fmf.'
off=struct.unpack_from('<Q',d,9)[0]; toc=d[off:]
i=toc.find(b'\x28\xb5\x2f\xfd'); clen=struct.unpack_from('<I',toc,i-4)[0]
o=zstandard.ZstdDecompressor().decompress(toc[i:i+clen],max_output_size=1<<26)
p=0
def s():
    global p
    l=struct.unpack_from('<I',o,p)[0]; p+=4; v=o[p:p+l].decode(); p+=l; return v
folder=s(); n=struct.unpack_from('<I',o,p)[0]; p+=4
base=26; root=os.path.realpath(out); os.makedirs(root,exist_ok=True); rows=[]
for _ in range(n):
    name=s(); ext=s(); fo,sz,sz2,t1,t2=struct.unpack_from('<QQQQQ',o,p); p+=40
    fn=os.path.basename(name+ext); blob=d[base+fo:base+fo+sz]
    open(os.path.join(root,fn),'wb').write(blob); rows.append((fn,fo,sz,sz2,t1))
print('folder',folder,'files',n,'toc consumed',p,'of',len(o),'compressed any',any(r[2]!=r[3] for r in rows))
print('data end',max(r[1]+r[2] for r in rows)+base,'toc off',off)
