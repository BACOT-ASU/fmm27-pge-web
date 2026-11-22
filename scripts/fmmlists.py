import sys,struct,zstandard
def zd(b): return zstandard.ZstdDecompressor().decompressobj().decompress(b)
def entries(path):
    d=open(path,'rb').read()[8:]
    assert d[:6]==b'\x02\x01fmf.'
    off=struct.unpack_from('<Q',d,9)[0]; t=d[off:]; i=t.find(b'\x28\xb5\x2f\xfd')
    o=zd(t[i:]); p=0; res={}
    def s():
        nonlocal p
        l=struct.unpack_from('<I',o,p)[0]; p+=4; v=o[p:p+l].decode('utf-8','replace'); p+=l; return v
    def folder(pre):
        nonlocal p
        name=s(); n=struct.unpack_from('<I',o,p)[0]; p+=4
        for _ in range(n):
            nm=s(); ext=s(); fo,sz,sz2,t1,t2=struct.unpack_from('<QQQQQ',o,p); p+=40
            blob=d[26+fo:26+fo+sz]; j=blob.find(b'\x28\xb5\x2f\xfd')
            if 0<=j<8: blob=zd(blob[j:])
            res[nm+ext]=blob
        if p+4<=len(o):
            k=struct.unpack_from('<I',o,p)[0]; p+=4
            for _ in range(k): folder(pre+name+'/')
    folder(''); return res
def ids(b):
    n=struct.unpack_from('<I',b,8)[0]; return list(struct.unpack_from('<%dI'%n,b,12))
