# Heuristic scan of people.dat (format belum dibongkar penuh).
# Pola yang terlihat: i32 -1, u32 UID, u32 first_name idx, u32 second_name idx, i32 common_name idx (-1),
# u16 hari-ke-dalam-tahun, u16 tahun lahir, u16 index negara (58 = Indonesia), lalu u8 ?, u16 negara ke-2 ...
import struct, sys
sys.path.insert(0,'/home/claude/scripts'); import names
def scan(base='/home/claude/b7/'):
    d=open(base+'people.dat','rb').read()
    F=[x[0] for x in names.load(base+'first_names.dat')[0]]
    S=[x[0] for x in names.load(base+'second_names.dat')[0]]
    C=[x[0] for x in names.load(base+'common_names.dat')[0]]
    out=[]; i=d.find(b'\xff\xff\xff\xff',12)
    while i>=0 and i+28<len(d):
        uid,f,s,c,day,yr,nat=struct.unpack_from('<IIIiHHH',d,i+4)
        if f<len(F) and s<len(S) and (c==-1 or 0<=c<len(C)) and 1930<=yr<=2015 and day<367 and nat<260 and uid<4000000000:
            out.append(dict(off=i,uid=uid,first=F[f],second=S[s],common=C[c] if c>=0 else '',year=yr,day=day,nat=nat))
            i=d.find(b'\xff\xff\xff\xff',i+28)
        else:
            i=d.find(b'\xff\xff\xff\xff',i+1)
    return out
if __name__=='__main__':
    o=scan(); print(len(o))
