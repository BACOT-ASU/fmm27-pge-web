import sys, struct, os, zlib
src, out = sys.argv[1], sys.argv[2]
data = open(src,'rb').read()
sig = bytes([0x8b,0x12,0x02,0xb9,0x6a,0x61,0x20,0x38,0x72,0x7b,0x93,0x02,0x14,0xd7,0xa0,0x32,0x13,0xf5,0xb9,0xe6,0xef,0xae,0x33,0x18,0xee,0x3b,0x2d,0xce,0x24,0xb3,0x6a,0xae])
i = data.find(sig)
hoff = struct.unpack_from('<q', data, i-8)[0]
p = hoff
def u32():
    global p; v=struct.unpack_from('<I',data,p)[0]; p+=4; return v
def i64():
    global p; v=struct.unpack_from('<q',data,p)[0]; p+=8; return v
def s():
    global p
    n=0; sh=0
    while True:
        b=data[p]; p+=1; n|=(b&0x7f)<<sh; sh+=7
        if not b&0x80: break
    v=data[p:p+n].decode(); p+=n; return v
major,minor,n = u32(),u32(),u32()
bid = s()
print('bundle v%d.%d files=%d id=%s'%(major,minor,n,bid))
if major>=2:
    i64();i64();i64();i64(); p+=8
root=os.path.realpath(out)
for _ in range(n):
    off=i64(); size=i64(); csize=i64() if major>=6 else 0
    typ=data[p]; p+=1
    name=s()
    dst=os.path.realpath(os.path.join(root,name))
    if not dst.startswith(root+os.sep): print('skip',name); continue
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    blob=data[off:off+(csize or size)]
    if csize: blob=zlib.decompress(blob,-15)
    open(dst,'wb').write(blob)
    print(typ,size,name)
