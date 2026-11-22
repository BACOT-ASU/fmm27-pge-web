import struct,sys
def parse(path):
    d=open(path,'rb').read()
    n=struct.unpack_from('<H',d,8)[0]; p=10; out=[]
    def s():
        nonlocal p
        l=struct.unpack_from('<I',d,p)[0]; p+=4
        v=d[p:p+l].decode('utf-8','replace'); p+=l; return v
    for i in range(n):
        st=p
        idx,uid=struct.unpack_from('<HI',d,p); p+=6
        ln=s(); g1=d[p]; p+=1
        sn=s(); g2=d[p]; p+=1
        ab=s()
        lvl,typ,nat=struct.unpack_from('<BHh',d,p); col=d[p+5:p+9]; rep=struct.unpack_from('<H',d,p+9)[0]; b11=d[p+11]; h12=struct.unpack_from('<h',d,p+12)[0]
        cnt=struct.unpack_from('<I',d,p+14)[0]; p+=18
        ent=[struct.unpack_from('<iHH',d,p+8*k) for k in range(cnt)]; p+=8*cnt
        w=struct.unpack_from('<iii',d,p); yrs=struct.unpack_from('<HHH',d,p+12); u=struct.unpack_from('<H',d,p+18)[0]; p+=20
        out.append(dict(uid=uid,long=ln,short=sn,abbr=ab,g=(g1,g2),lvl=lvl,typ=typ,nat=nat,col=col.hex(),rep=rep,b11=b11,h12=h12,ent=ent,win=w,yrs=yrs,u=u,idx=idx,off=st))
    return out,p,len(d)
if __name__=='__main__':
    c,p,L=parse(sys.argv[1]); print('parsed',len(c),'end',p,'filelen',L)
    from collections import Counter
    print('typ',sorted(Counter(x['typ'] for x in c).items()))
    print('with entrants:',[(x['long'],len(x['ent'])) for x in c if x['ent']][:40])
