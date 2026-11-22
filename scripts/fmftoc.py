import sys,struct,zstandard
def toc(path):
    d=open(path,'rb').read()
    assert d[:6]==b'\x02\x01fmf.',d[:8]
    off=struct.unpack_from('<Q',d,9)[0]; t=d[off:]
    i=t.find(b'\x28\xb5\x2f\xfd')
    if i<0: return d,None,off
    clen=struct.unpack_from('<I',t,i-4)[0]
    return d,zstandard.ZstdDecompressor().decompress(t[i:i+clen],max_output_size=1<<27),off
if __name__=='__main__':
    for p in sys.argv[1:]:
        d,o,off=toc(p); print('==',p,len(d),'hdr',d[6:26].hex(),'tocoff',off,'toclen',None if o is None else len(o))
        if o: print('  ',o[:300])
