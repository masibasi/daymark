import os,math,subprocess,sys
import numpy as np
from PIL import Image, ImageDraw
D0=os.path.dirname(os.path.abspath(__file__)); D=D0+'/round3'; P=D+'/png/'
COLS=['#6E9AF2','#3FB8C0','#A885EA','#E0889A']   # exactly g2's
LT='#EDEFF3'; W0=140.0; ST=3.0
def f(p): return f'{p[0]:.1f} {p[1]:.1f}'
def poly(pts): return 'M'+'L'.join(f(p) for p in pts)
def resample(Pt,closed=False,step=ST):
    Q=np.vstack([Pt,Pt[:1]]) if closed else Pt
    d=np.hypot(*np.diff(Q,axis=0).T); s=np.concatenate([[0],np.cumsum(d)]); L=s[-1]
    n=max(2,int(round(L/step))); ss=np.linspace(0,L,n+1)[:-1] if closed else np.linspace(0,L,n)
    return np.stack([np.interp(ss,s,Q[:,0]),np.interp(ss,s,Q[:,1])],1),L
def sse(c,n): return np.sign(c)*np.abs(c)**(2.0/n)
def superD(cx,cy,al,ar,b,nl,nr,N=2400):
    t=np.radians(np.linspace(0,360,N,endpoint=False)); s,c=np.sin(t),np.cos(t)
    n=np.where(s>=0,nr,nl)
    x=cx+np.where(s>=0,ar*sse(s,nr),al*sse(s,nl)); y=cy-b*np.where(s>=0,sse(c,nr),sse(c,nl))
    return np.stack([x,y],1)
def arcpts(c,rx,ry,a0,a1,n=60):
    a=np.radians(np.linspace(a0,a1,n)); return np.stack([c[0]+rx*np.sin(a),c[1]-ry*np.cos(a)],1)
def dshape(xl,yt,yb,cx,rx,rc,bulge,nr=2.2):
    cy=(yt+yb)/2; ry=(yb-yt)/2
    t=np.radians(np.linspace(0,180,160)); s_,c_=np.sin(t),np.cos(t)
    bowl=np.stack([cx+rx*sse(s_,nr),cy-ry*sse(c_,nr)],1)               # top -> bottom, clockwise
    bot=np.stack([np.linspace(cx,xl+rc,30),np.full(30,yb)],1)
    cb=arcpts((xl+rc,yb-rc),rc,rc,180,270)                              # bottom-left corner (bottom -> left)
    # arcpts angle: 0=top,90=right,180=bottom,270=left
    ln=np.linspace(0,1,60); left=np.stack([np.full(60,xl)-bulge*np.sin(np.pi*ln),yb-rc-(yb-yt-2*rc)*ln],1)
    ct=arcpts((xl+rc,yt+rc),rc,rc,270,360)
    top=np.stack([np.linspace(xl+rc,cx,30),np.full(30,yt)],1)
    return np.vstack([bowl,bot,cb,left,ct,top])
def smooth(Pt,k,closed):
    if closed:
        o=np.zeros_like(Pt)
        for j in range(-k,k+1): o+=np.roll(Pt,j,axis=0)
        return o/(2*k+1)
    Q=Pt.copy()
    for i in range(len(Pt)):
        a=max(0,i-k); b=min(len(Pt),i+k+1); Q[i]=Pt[a:b].mean(0)
    return Q
def normals(Pt,closed):
    Ps=smooth(Pt,3,closed)
    T=(np.roll(Ps,-1,0)-np.roll(Ps,1,0)) if closed else np.gradient(Ps,axis=0)
    T=T/(np.hypot(T[:,0],T[:,1])[:,None]+1e-9)
    return np.stack([T[:,1],-T[:,0]],1)
def wfun(u,ph=0.0): return W0*(1+.045*np.sin(2*np.pi*2*u+1.0+ph)+.015*np.sin(2*np.pi*3*u+ph))
def offs(Pt,w,N): return Pt+N*(w/2)[:,None], Pt-N*(w/2)[:,None]

def closed_ring(Pt):
    R,L=resample(Pt,True); R,L=resample(smooth(R,10,True),True); w=wfun(np.arange(len(R))*ST/L); N=normals(R,True)
    return R,w,N,L
def ring_body(R,w,L,center,gapfrac=.12):
    i0=int(np.argmin(np.hypot(*(R-np.array(center)).T)))
    G=gapfrac*L; capr=W0/2
    a=int((G/2+capr)/ST); e=int((L-G/2-capr)/ST)
    return (np.arange(a,e)+i0)%len(R)

def make(v):
    d={}
    k=v['kind']
    if k=='D':
        Pt=dshape(*v['ds'])
        R,w,N,L=closed_ring(Pt)
        idx=ring_body(R,w,L,v['gap'],v.get('gapfrac',.12))
        B,BW,BN=R[idx],w[idx],N[idx]
        d['stems']=[]
    elif k=='d1':   # stem is part of the path (blue start), gap beside the stem
        Pt=superD(*v['sd'])
        R,w,N,L=closed_ring(Pt)
        iR=int(np.argmax(R[:,0])); xr=R[iR,0]
        iE=int(np.argmin(np.hypot(*(R-np.array(v['gapend'])).T)))
        n=len(R); kk=(iE-iR)%n; rp=R[(iR+np.arange(kk))%n]
        ytop=v['ytop']; y=np.linspace(ytop,R[iR,1],int((R[iR,1]-ytop)/ST)); u=(R[iR,1]-y)/(R[iR,1]-ytop)
        sp=np.stack([xr+v['lean']*u**2,y],1)
        body=np.vstack([sp[:-1],rp]); B,Lb=resample(smooth(body,3,False),False)
        BW=wfun(np.arange(len(B))*ST/Lb,.7); BW=np.minimum(BW,W0*1.04); BN=normals(B,False)
        d['stems']=[]
    elif k=='d2':   # closed ring with gap at left + separate blue stem on the right
        Pt=superD(*v['sd'])
        R,w,N,L=closed_ring(Pt)
        idx=ring_body(R,w,L,v['gap'],v.get('gapfrac',.12))
        B,BW,BN=R[idx],w[idx],N[idx]
        iR=int(np.argmin(np.abs(R[:,1]-v['stemy'])+ (R[:,0]<512)*9999))
        # stem from ring point iR (upper right) going up: build from tangent-continuing path
        i1=iR; seg=R[(i1-np.arange(0,int(v['stemback']/ST)))%len(R)][::-1]  # ring points arriving at iR (clockwise, short)
        xr=R[iR,0]; ytop=v['ytop']; yb=R[iR,1]
        y=np.linspace(ytop,yb,int((yb-ytop)/ST)); u=(yb-y)/(yb-ytop)
        sp=np.stack([xr+v['lean']*u**2,y],1)
        d['stem_pts']=sp
    d.update(R=R,w=w,N=N,L=L,B=B,BW=BW,BN=BN,kind=k)
    return d

def render(d,v,name,bg,dark,shares=(.32,.27,.23,.18),CAP=0):
    R,w,N,B,BW,BN=d['R'],d['w'],d['N'],d['B'],d['BW'],d['BN']
    # translate to center bbox of outer ring (+stem)
    O,I=offs(R,w,N)
    allp=[O,I]
    if 'stem_pts' in d:
        sp=d['stem_pts']; allp.append(sp+np.array([W0/2,0])); allp.append(sp-np.array([W0/2,0])); allp.append(sp[:1]-np.array([0,W0/2]))
    if k:=d['kind']=='d1': allp.append(B[:1]-np.array([0,W0/2]))
    A=np.vstack(allp); cx=(A[:,0].min()+A[:,0].max())/2; cy=(A[:,1].min()+A[:,1].max())/2
    sh=np.array([512-cx,512-cy]); sh[0]+=v.get('dx',0); sh[1]+=v.get('dy',0)
    R=R+sh;B=B+sh
    O,I=offs(R,w,N); BO,BI=offs(B,BW,BN)
    n=len(B); b=[0]
    for s in shares: b.append(b[-1]+s)
    cuts=[int(round(x*(n-1))) for x in b]
    segs=[(cuts[i],cuts[i+1],COLS[i]) for i in range(4)]
    polys=[]
    for a,e,c in segs:
        polys.append((poly(np.vstack([BO[a:e+1],BI[a:e+1][::-1]]))+'Z',c))
    caps=[(B[0],BW[0]/2,COLS[0]),(B[-1],BW[-1]/2,COLS[3])]
    stempoly=None
    if 'stem_pts' in d:
        sp=d['stem_pts']+sh; ns=normals(sp,False); sw=np.full(len(sp),W0*0.98)
        so,si=offs(sp,sw,ns)
        # blue stem polygon, extended a bit into ring for seamless join
        polys.append((poly(np.vstack([so,si[::-1]]))+'Z',COLS[0]))
        caps.append((sp[0],sw[0]/2,COLS[0]))
    outerall=poly(O)+'Z'
    clip=f'<clipPath id="cl"><path d="{outerall}"/>'
    if d['kind']=='d1':
        clip+=f'<path d="{poly(np.vstack([BO[:cuts[1]],BI[:cuts[1]][::-1]]))}Z"/><circle cx="{B[0][0]:.1f}" cy="{B[0][1]:.1f}" r="{BW[0]/2:.1f}"/>'
    if 'stem_pts' in d:
        clip+=f'<path d="{poly(np.vstack([so,si[::-1]]))}Z"/><circle cx="{sp[0][0]:.1f}" cy="{sp[0][1]:.1f}" r="{sw[0]/2:.1f}"/>'
    clip+='</clipPath>'
    track=poly(O)+'Z '+poly(I[::-1])+'Z'
    blur=lambda i,s:f'<filter id="{i}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="{s}"/></filter>'
    mx,my=512,512
    mask=f'<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="{mx}" cy="{my}" r="300"><stop offset=".22" stop-color="{"#555" if dark else "#000"}"/><stop offset=".82" stop-color="#fff"/></radialGradient><mask id="fade"><rect width="1024" height="1024" fill="url(#fg)"/></mask>'
    defs=blur('b1',24)+blur('b2',64)+blur('b3',32)+clip+mask
    def shapes(extra):
        r=''.join(f'<path d="{dd}" fill="{c}" stroke="{c}" stroke-width="{extra}" stroke-linejoin="round"/>' for dd,c in polys)
        r+=''.join(f'<circle cx="{m[0]:.1f}" cy="{m[1]:.1f}" r="{rr+extra/2:.1f}" fill="{c}"/>' for m,rr,c in caps)
        return r
    mp=lambda a,e:poly(B[max(0,a-1):e+2])
    # wash follows path; for stem use stem pts
    washsegs=[(mp(a,e),c) for a,e,c in segs]
    if 'stem_pts' in d: washsegs.append((poly(sp),COLS[0]))
    washop=.34; o=''
    o+=f'<g filter="url(#b3)" opacity="{.6 if dark else .4}">'+shapes(16)+'</g>'
    o+='<g clip-path="url(#cl)" mask="url(#fade)">'
    o+=f'<g filter="url(#b2)" opacity="{washop*(0.7 if dark else .5):.3f}">'+''.join(f'<path d="{p}" fill="none" stroke="{c}" stroke-width="250"/>' for p,c in washsegs)+'</g>'
    o+=f'<g filter="url(#b1)" opacity="{washop*(1.0 if dark else .8):.3f}">'+''.join(f'<path d="{p}" fill="none" stroke="{c}" stroke-width="150"/>' for p,c in washsegs)+'</g></g>'
    tr='#1C1C22' if dark else LT
    o+=f'<path d="{track}" fill="{tr}" fill-rule="evenodd"/>'
    o+=shapes(1)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>{defs}</defs><rect width="1024" height="1024" fill="{bg}"/>{o}</svg>'
    open(D+'/'+name+'.svg','w').write(svg)
    return O,I,B

V={
 'h1':dict(kind='D',ds=(262,223,777,470,310,120,10),gap=(262,400)),
 'h2':dict(kind='D',ds=(262,223,777,470,310,200,34),gap=(262,400)),
 'h3':dict(kind='D',ds=(262,223,777,470,310,120,10),gap=(300,250)),
 'h4':dict(kind='d1',sd=(500,610,215,215,215,2.1,2.1),gapend=(500,396),ytop=190,lean=10),
 'h5':dict(kind='d2',sd=(500,610,215,215,215,2.1,2.1),gap=(285,540),stemy=520,stemback=60,ytop=190,lean=10,shares=(.46,.22,.18,.14)),
}
if __name__=='__main__':
    names=sys.argv[1:] or list(V)
    CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    for n in names:
        d=make(V[n]); render(d,V[n],n,'#FFFFFF',False,**({'shares':V[n]['shares']} if 'shares' in V[n] else {}))
        subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1024,1024',f'--screenshot={P}full-{n}.png',f'file://{D}/{n}.svg'],capture_output=True)
        im=Image.open(P+f'full-{n}.png').convert('RGB').crop((0,0,1024,1024))
        im.resize((512,512),Image.LANCZOS).save(P+f'{n}.png'); im.resize((64,64),Image.LANCZOS).save(P+f'{n}-64.png')
