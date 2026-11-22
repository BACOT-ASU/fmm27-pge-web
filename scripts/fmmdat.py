import zstandard,struct,sys
def load(path):
    d=open(path,'rb').read()
    i=d.find(b'\x28\xb5\x2f\xfd'); out=[]
    dec=zstandard.ZstdDecompressor()
    # may be several frames; decompress sequentially
    pos=i; chunks=[]
    while pos<len(d) and d[pos:pos+4]==b'\x28\xb5\x2f\xfd':
        o=dec.decompressobj(); c=o.decompress(d[pos:]); chunks.append(c); used=len(d)-pos-len(o.unused_data); pos+=used
        # skip small gaps until next magic
        j=d.find(b'\x28\xb5\x2f\xfd',pos)
        if j<0 or j-pos>64: break
        pos=j
    return d[:i],chunks,d[pos:]
if __name__=='__main__':
    for p in sys.argv[1:]:
        h,ch,t=load(p); print(p.split('/')[-1],'prefix',h.hex(),'chunks',[len(c) for c in ch],'tail',len(t))
        print('   ',ch[0][:160])
