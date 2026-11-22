import struct,sys,binascii
class Bad(Exception): pass
def parse(path, extra_len=68, verbose=True):
    d=open(path,'rb').read()
    n=struct.unpack_from('<I',d,8)[0]; p=12; out=[]
    def s(ff):
        nonlocal p
        l=struct.unpack_from('<I',d,p)[0]
        if l>120: raise Bad('strlen %d at %d'%(l,p))
        p+=4; v=d[p:p+l]; p+=l
        if ff:
            if d[p] not in (0,1,2,0xff): raise Bad('gbyte %d at %d'%(d[p],p))
            p+=1
        return v.decode('utf-8','replace')
    for i in range(n):
        st=p; r={}
        try:
            r['pre'],r['uid']=struct.unpack_from('<iI',d,p); p+=8
            r['long']=s(1); r['short']=s(1); r['n6']=s(0); r['c4']=s(0); r['c3']=s(0)
            r['nat'],r['based']=struct.unpack_from('<hh',d,p); p+=4
            p+=12            # 6 colours
            p+=6*22          # 6 kits
            r['o_misc']=p; p+=10
            r['o_div']=p; r['div'],r['div2']=struct.unpack_from('<hh',d,p); p+=4
            p+=1; r['rep']=struct.unpack_from('<H',d,p)[0]; p+=2
            r['lastdiv']=struct.unpack_from('<h',d,p)[0]; p+=2
            flag=d[p]; p+=1; r['flag']=flag
            if flag not in (0,1): raise Bad('flag %d'%flag)
            if flag: p+=extra_len
            k=struct.unpack_from('<I',d,p)[0]; p+=4
            if k>64: raise Bad('bytelist %d'%k)
            r['k']=k; p+=k
            p+=3; r['a1'],r['capt']=struct.unpack_from('<ii',d,p); p+=8
            p+=12
            x=struct.unpack_from('<H',d,p)[0]; p+=2
            if x>60: raise Bad('xlist %d'%x)
            r['x']=x; p+=21*x
            m=struct.unpack_from('<H',d,p)[0]; p+=2
            if m>400: raise Bad('squad %d'%m)
            r['squad']=struct.unpack_from('<%di'%m,d,p); p+=4*m
            r['staff']=struct.unpack_from('<12i',d,p); p+=48
            r['t0']=struct.unpack_from('<I',d,p)[0]; p+=4
            p+=27; p+=44
            r['tailn']=struct.unpack_from('<H',d,p)[0]; p+=2
            if d[p:p+4]!=b'\xff\xff\xff\xff' and p<len(d):
                pass
        except (Bad,struct.error) as e:
            if verbose:
                print('FAIL rec',i,'start',st,'p',p,e, r.get('long'))
                for k2 in range(st,st+640,32): print('%4d'%(k2-st),binascii.hexlify(d[k2:k2+32],' ').decode())
            return out,st,len(d)
        r['off']=st; r['len']=p-st; out.append(r)
    return out,p,len(d)
if __name__=='__main__':
    o,p,L=parse(sys.argv[1]); print('parsed',len(o),'end',p,'filelen',L)
    if o: print('last ok:',o[-1]['long'],o[-1]['len'],o[-1]['tailn'],o[-1]['t0'],o[-1]['pre'])
