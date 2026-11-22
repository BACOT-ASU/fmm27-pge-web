# first_names / second_names / common_names .dat
# header 8 + u32 count; record: u32 0, u32 idx, u8, u32 nation_uid, u16, u8 flag, u32 len, name
import struct
def load(path):
    d=open(path,'rb').read(); n=struct.unpack_from('<I',d,8)[0]; p=12; out=[]
    for i in range(n):
        z,idx,b,nat,u16,fl,l=struct.unpack_from('<IIBIHBI',d,p); p+=20
        out.append((d[p:p+l].decode('utf-8','replace'),idx,nat,fl)); p+=l
    return out,p,len(d)
