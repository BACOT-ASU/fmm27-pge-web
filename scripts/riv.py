import struct
def parse(path):
    d=open(path,'rb').read(); n=struct.unpack_from('<H',d,8)[0]; p=10; out=[]
    for i in range(n):
        st=p; idx,uid=struct.unpack_from('<II',d,p); p+=8
        l=struct.unpack_from('<I',d,p)[0]; p+=4; name=d[p:p+l]; p+=l; g=d[p]; p+=1
        a,b=struct.unpack_from('<ii',d,p); p+=8; tail=d[p:p+15]; p+=15
        out.append(dict(idx=idx,uid=uid,name=name.decode('utf-8','replace'),g=g,a=a,b=b,tail=tail,off=st,len=p-st))
    return out,p,len(d),d
