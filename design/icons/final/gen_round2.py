import os,re,subprocess
from PIL import Image, ImageDraw
D0=os.path.dirname(os.path.abspath(__file__)); D=D0+'/round2'; P=D+'/png/'
src=open(D0+'/../refined/gen.py').read().split("B5=['#8FB2FF'")[0]
ns={'__file__':D+'/x.py'}; exec(src,ns); ns['OUT']=D
MASK='<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="300"><stop offset=".22" stop-color="#000"/><stop offset=".82" stop-color="#fff"/></radialGradient><mask id="fade"><rect width="1024" height="1024" fill="url(#fg)"/></mask>'
def patch(name):
    p=D+'/'+name; s=open(p).read()
    M=MASK.replace('stop-color="#000"','stop-color="#555"') if name=='g6.svg' else MASK
    s=s.replace('<g clip-path="url(#cl)">','<g clip-path="url(#cl)" mask="url(#fade)">').replace('</defs>',M+'</defs>',1)
    open(p,'w').write(s)

import math
pt=ns['pt']; f=ns['f']; blur=ns['blur']; svg=ns['svg']; SHAPE=ns['SHAPE']
SOFT=['#7FA6F5','#4FC0C4','#B292EE','#E69AAB']; DEEP=['#5C8DEE','#2FB0BC','#9E78E6','#DA7589']
def hx(c): return [int(c[i:i+2],16) for i in (1,3,5)]
def mix(t): return ['#%02X%02X%02X'%tuple(round(a+(b-a)*t) for a,b in zip(hx(s),hx(d))) for s,d in zip(SOFT,DEEP)]
Ro,Ri,off=SHAPE
def outer(a): return pt(Ro(a),a)
def inner(a): return pt(Ri(a),a,512+off[0],512+off[1])
def mid(a):
    o,i=outer(a),inner(a); return ((o[0]+i[0])/2,(o[1]+i[1])/2)
def span(a0,a1,step=2.0):
    n=max(2,int((a1-a0)/step)+1); return [a0+(a1-a0)*k/(n-1) for k in range(n)]
def width(a): o,i=outer(a),inner(a); return math.hypot(o[0]-i[0],o[1]-i[1])
def ring(name,bg,cols,gap,glow,dark,track,washop=.34):
    CAP=16.0
    a_s=CAP; a_e=360-gap*360-CAP   # body extents; cap tips at 0 and 360-gap
    shares=[.32,.27,.23,.18]; b=[a_s]
    for sh in shares: b.append(b[-1]+sh*(a_e-a_s))
    segs=[(b[i],b[i+1],cols[i]) for i in range(4)]
    polys=[]
    for a0,a1,c in segs:
        sp=span(a0,a1); pts=[outer(a) for a in sp]+[inner(a) for a in reversed(sp)]
        polys.append(('M'+'L'.join(f(p) for p in pts)+'Z',c))
    caps=[]
    for a,c in ((a_s,cols[0]),(a_e,cols[3])):
        m=mid(a); caps.append((m,width(a)/2,c))
    capel=lambda m,r,c,extra='': f'<circle cx="{m[0]:.1f}" cy="{m[1]:.1f}" r="{r+extra if extra!="" else r:.1f}" fill="{c}"/>' 
    full=span(0,360,3); outerall='M'+'L'.join(f(outer(a)) for a in full)+'Z'
    allp=span(0,360,2); trackd='M'+'L'.join(f(outer(a)) for a in allp)+'Z M'+'L'.join(f(inner(a)) for a in reversed(allp))+'Z'
    mp=lambda a0,a1:'M'+'L'.join(f(mid(a)) for a in span(a0,a1))
    defs=blur('b1',24)+blur('b2',64)+blur('b3',32)+f'<clipPath id="cl"><path d="{outerall}"/></clipPath>'
    o=''
    def shapes(extra):
        r=''.join(f'<path d="{d}" fill="{c}" stroke="{c}" stroke-width="{extra}" stroke-linejoin="round"/>' for d,c in polys)
        r+=''.join(f'<circle cx="{m[0]:.1f}" cy="{m[1]:.1f}" r="{rr+extra/2:.1f}" fill="{c}"/>' for m,rr,c in caps)
        return r
    if glow:
        o+=f'<g filter="url(#b3)" opacity="{.6 if dark else .4}">'+shapes(16)+'</g>'
    o+='<g clip-path="url(#cl)">'
    o+=f'<g filter="url(#b2)" opacity="{washop*(0.7 if dark else .5)}">'+''.join(f'<path d="{mp(a0-1,a1+1)}" fill="none" stroke="{c}" stroke-width="250" stroke-linecap="butt"/>' for a0,a1,c in segs)+'</g>'
    o+=f'<g filter="url(#b1)" opacity="{washop*(1.0 if dark else .8)}">'+''.join(f'<path d="{mp(a0,a1)}" fill="none" stroke="{c}" stroke-width="150" stroke-linecap="butt"/>' for a0,a1,c in segs)+'</g></g>'
    o+=f'<path d="{trackd}" fill="{track}" fill-rule="evenodd"/>'
    o+=shapes(1)
    open(D+'/'+name,'w').write(svg(bg,o,defs))
M50,M35,M65=mix(.5),mix(.35),mix(.65)
LT='#EDEFF3'
ring('g1.svg','#FFFFFF',M50,.12,False,False,LT)
ring('g2.svg','#FFFFFF',M50,.12,True,False,LT)
ring('g3.svg','#FFFFFF',M50,.20,True,False,LT)
ring('g4.svg','#FFFFFF',M35,.12,True,False,LT)
ring('g5.svg','#FFFFFF',M65,.12,True,False,LT)
ring('g6.svg','#0D0D0F',M50,.12,True,True,'#1C1C22')
names=['g1','g2','g3','g4','g5','g6']
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ims={}
for n in names:
    patch(n+'.svg')
    subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1024,1024',f'--screenshot={P}full-{n}.png',f'file://{D}/{n}.svg'],capture_output=True)
    im=Image.open(P+f'full-{n}.png').convert('RGB').crop((0,0,1024,1024)); ims[n]=im
    im.resize((512,512),Image.LANCZOS).save(P+f'{n}.png'); im.resize((64,64),Image.LANCZOS).save(P+f'{n}-64.png')
FONT={'1':"00100 01100 00100 00100 00100 00100 01110",'2':"01110 10001 00001 00010 00100 01000 11111",'3':"11110 00001 00001 01110 00001 00001 11110",'5':"11111 10000 11110 00001 00001 10001 01110",'6':"00110 01000 10000 11110 10001 10001 01110",'4':"00010 00110 01010 10010 11111 00010 00010",'g':"01111 10000 10000 10011 10001 10001 01111",'f':"00110 01000 11110 01000 01000 01000 01000",'n':"00000 00000 10110 11001 10001 10001 10001",' ':"00000 00000 00000 00000 00000 00000 00000"}
def text(d,x,y,s,sc,col):
    for ch in s:
        for r,row in enumerate(FONT[ch].split()):
            for c,v in enumerate(row):
                if v=='1': d.rectangle([x+c*sc,y+r*sc,x+(c+1)*sc-1,y+(r+1)*sc-1],fill=col)
        x+=6*sc
def tw(s,sc): return 6*sc*len(s)-sc
rs=lambda im,s: im.resize((s,s),Image.LANCZOS)
T,G,L=256,24,36
W=3*T+4*G; H=2*(T+L)+3*G
sh=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(sh)
for i,n in enumerate(names):
    x=G+(i%3)*(T+G); y=G+(i//3)*(T+L+G)
    sh.paste(rs(ims[n],T),(x,y)); text(d,x+(T-tw(n,3))//2,y+T+10,n,3,(60,60,70))
sh.save(D+'/compare.png')
# home mock
S=120; R=int(S*.225); gap=40; lab=30
def rounded(im,s):
    im=rs(im,s).convert('RGBA'); m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).rounded_rectangle([0,0,s*4-1,s*4-1],int(s*4*.225),fill=255)
    im.putalpha(m.resize((s,s),Image.LANCZOS)); return im
def ph(s,col):
    im=Image.new('RGBA',(s,s),col+(255,)); m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).rounded_rectangle([0,0,s*4-1,s*4-1],int(s*4*.225),fill=255)
    im.putalpha(m.resize((s,s),Image.LANCZOS)); return im
items=[('',ph(S,(176,180,188))),('g1',ims['g1']),('g2',ims['g2']),('g3',ims['g3']),('g4',ims['g4']),('g5',ims['g5']),('',ph(S,(150,155,164)))]
pw=len(items)*S+(len(items)+1)*gap; ph_h=S+lab+2*gap
mock=Image.new('RGB',(pw,2*ph_h),(233,237,242)); d=ImageDraw.Draw(mock)
d.rectangle([0,ph_h,pw,2*ph_h],fill=(43,47,54))
for r,(bgc,tc) in enumerate([((233,237,242),(70,75,85)),((43,47,54),(220,224,230))]):
    for i,(n,im) in enumerate(items):
        x=gap+i*(S+gap); y=r*ph_h+gap
        ic=im if im.mode=='RGBA' and n=='' else rounded(im,S)
        mock.paste(ic,(x,y),ic)
        if n: text(d,x+(S-tw(n,3))//2,y+S+10,n,3,tc)
mock.save(D+'/home-mock.png')
