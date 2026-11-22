import struct,zstandard
MAGIC=b'\x02\x01fmf.\x08\x00\x00'
def zd(b): return zstandard.ZstdDecompressor().decompressobj().decompress(b)
def zc(b,wlog,level=19):
    p=zstandard.ZstdCompressionParameters.from_level(level,window_log=wlog,write_checksum=True,write_content_size=False)
    c=zstandard.ZstdCompressor(compression_params=p).compressobj()
    return c.compress(b)+c.flush()
class Folder:
    def __init__(s,name): s.name=name; s.files=[]; s.subs=[]   # files: [name,ext,data(raw, uncompressed),t1,t2,blob(compressed or None)]
def read(d):
    assert d[:9]==MAGIC, d[:9]
    X=struct.unpack_from('<Q',d,9)[0]; assert struct.unpack_from('<Q',d,17)[0]==17
    flag=d[25]; t=d[9+X:]; assert t[:9]==MAGIC
    if flag==0:
        clen=struct.unpack_from('<I',t,9)[0]; assert 13+clen==len(t); o=zd(t[13:])
    else: o=zd(t[9:])
    p=0
    def s():
        nonlocal p
        l=struct.unpack_from('<I',o,p)[0]; p+=4; v=o[p:p+l]; p+=l; return v
    def folder():
        nonlocal p
        f=Folder(s()); n=struct.unpack_from('<I',o,p)[0]; p+=4
        for _ in range(n):
            nm=s(); ex=s(); fo,sz,sz2,t1,t2=struct.unpack_from('<QQQQQ',o,p); p+=40
            blob=d[26+fo:26+fo+sz]
            if flag==0: assert sz==sz2; f.files.append([nm,ex,blob,t1,t2,None,sz2,fo])
            else: f.files.append([nm,ex,None,t1,t2,blob,sz2,fo])
        k=struct.unpack_from('<I',o,p)[0]; p+=4
        for _ in range(k): f.subs.append(folder())
        return f
    root=folder(); assert p==len(o),(p,len(o))
    return flag,root,o
def get(f):   # uncompressed content of a file row
    return f[2] if f[2] is not None else zd(f[5])
def write(flag,root,toc_wlog=23,ent_wlog=22):
    # tata letak data mengikuti urutan offset asli; file baru (offset None) ditaruh di akhir
    rows=[]
    def collect(f):
        for row in f.files: rows.append(row)
        for x in f.subs: collect(x)
    collect(root)
    for row in rows:
        while len(row)<8: row.append(None)
        if flag!=0 and row[5] is None: row[5]=zc(row[2],ent_wlog)
    order=sorted(range(len(rows)),key=lambda i:(rows[i][7] is None, rows[i][7] if rows[i][7] is not None else i))
    data=[]; pos=0; newoff={}
    for i in order:
        blob=rows[i][2] if flag==0 else rows[i][5]
        newoff[id(rows[i])]=pos; data.append(blob); pos+=len(blob)
    toc=[]
    def s(b): toc.append(struct.pack('<I',len(b))); toc.append(b)
    def folder(f):
        s(f.name); toc.append(struct.pack('<I',len(f.files)))
        for row in f.files:
            if flag==0: clen=usz=len(row[2])
            else: clen=len(row[5]); usz=len(row[2]) if row[2] is not None else row[6]
            s(row[0]); s(row[1]); toc.append(struct.pack('<QQQQQ',newoff[id(row)],clen,usz,row[3],row[4]))
        toc.append(struct.pack('<I',len(f.subs)))
        for x in f.subs: folder(x)
    folder(root); o=b''.join(toc); fr=zc(o,toc_wlog)
    out=[MAGIC,struct.pack('<QQ',17+pos,17),bytes([flag])]+data+[MAGIC]
    if flag==0: out.append(struct.pack('<I',len(fr)))
    out.append(fr); return b''.join(out),o
def walk(f,pre=''):
    for row in f.files: yield pre+f.name.decode()+'/'+(row[0]+row[1]).decode(),row
    for x in f.subs: yield from walk(x,pre+f.name.decode()+'/')
