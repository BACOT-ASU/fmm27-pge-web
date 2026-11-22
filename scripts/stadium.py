# stadium.dat: header 8 + u16 n; rec: u32 idx, u32 uid, u16 city_idx, u32 kapasitas, u32 kapasitas_maks,
#   nama (u32+teks), nama alternatif (u32+teks), 8 byte (u32, u8, u8, u16 flag)
import struct
def parse(path):
    d=open(path,'rb').read(); n=struct.unpack_from('<H',d,8)[0]; p=10; out=[]
    def s():
        nonlocal p
        l=struct.unpack_from('<I',d,p)[0]; v=d[p+4:p+4+l].decode('utf8','replace'); p+=4+l; return v
    for i in range(n):
        o=p; idx,uid,city,cap,capx=struct.unpack_from('<IIHII',d,p); p+=18
        nm=s(); alt=s(); tail=d[p:p+8]; p+=8
        out.append(dict(off=o,len=p-o,idx=idx,uid=uid,city=city,cap=cap,capx=capx,name=nm,alt=alt,tail=tail.hex()))
    return out,p,len(d)
