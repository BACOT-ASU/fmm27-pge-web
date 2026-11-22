import struct
SIZES={0x00:0,0x01:4,0x02:4,0x03:1,0x05:8,0x0f:8,0x11:1,0x12:2,0x18:8,0x19:4,0x20:4}
class Bad(Exception): pass
def rd_value(b,p):
    t=b[p]; p+=1
    if t in SIZES:
        n=SIZES[t]; return (t,b[p:p+n]),p+n
    if t in (0x0c,0x1a):
        l=struct.unpack_from('<I',b,p)[0]; return (t,b[p+4:p+4+l]),p+4+l
    if t==0x0a:
        n=struct.unpack_from('<I',b,p)[0]; p+=4; fs=[]
        for _ in range(n):
            tag=b[p:p+4]; p+=4
            if b[p]!=1: raise Bad('field marker %d at %d'%(b[p],p))
            v,p=rd_value(b,p+1); fs.append((tag,v))
        return (t,fs),p
    if t==0x0b:
        n=struct.unpack_from('<I',b,p)[0]; p+=4; it=[]
        for _ in range(n):
            if b[p]!=1: raise Bad('item marker %d at %d'%(b[p],p))
            v,p=rd_value(b,p+1); it.append(v)
        return (t,it),p
    raise Bad('type 0x%02x at %d'%(t,p-1))
def wr_value(v,out):
    t,x=v; out.append(bytes([t]))
    if t in SIZES: out.append(x)
    elif t in (0x0c,0x1a): out.append(struct.pack('<I',len(x))); out.append(x)
    elif t==0x0a:
        out.append(struct.pack('<I',len(x)))
        for tag,val in x: out.append(tag); out.append(b'\x01'); wr_value(val,out)
    elif t==0x0b:
        out.append(struct.pack('<I',len(x)))
        for val in x: out.append(b'\x01'); wr_value(val,out)
def parse(b):
    if b[:8]!=b'\x03\x01cbd.\x04\x00': raise Bad('magic')
    hdr=b[8:12]; p=12
    if b[p]!=1: raise Bad('key marker')
    key,p=rd_value(b,p+1)
    n=struct.unpack_from('<I',b,p)[0]; p+=4; fs=[]
    for _ in range(n):
        tag=b[p:p+4]; p+=4
        if b[p]!=1: raise Bad('field marker %d at %d'%(b[p],p))
        v,p=rd_value(b,p+1); fs.append((tag,v))
    return dict(hdr=hdr,key=key,fields=fs,tail=b[p:])
def build(d):
    out=[b'\x03\x01cbd.\x04\x00',d['hdr'],b'\x01']; wr_value(d['key'],out)
    out.append(struct.pack('<I',len(d['fields'])))
    for tag,val in d['fields']: out.append(tag); out.append(b'\x01'); wr_value(val,out)
    out.append(d['tail']); return b''.join(out)
def tagname(t): return t[::-1].decode('latin1')
def show(v):
    t,x=v
    if t==0x00: return None
    if t==0x01: return struct.unpack('<i',x)[0]
    if t==0x02:
        s=x[::-1]
        return ("'"+s.decode('latin1')+"'") if all(32<=c<127 for c in s) else struct.unpack('<I',x)[0]
    if t==0x03: return bool(x[0])
    if t==0x05: return struct.unpack('<d',x)[0]
    if t in (0x0f,0x18): return struct.unpack('<q',x)[0]
    if t==0x11: return x[0]
    if t==0x12: return struct.unpack('<H',x)[0]
    if t==0x19: return struct.unpack('<f',x)[0]
    if t==0x20: return 'date:'+x.hex()
    if t in (0x0c,0x1a): return x.decode('utf-8','replace')
    if t==0x0a: return {tagname(k):show(val) for k,val in x} if len({k for k,_ in x})==len(x) else [(tagname(k),show(val)) for k,val in x]
    if t==0x0b: return [show(i) for i in x]
