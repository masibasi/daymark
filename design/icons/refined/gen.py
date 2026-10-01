import math, os
OUT=os.path.dirname(os.path.abspath(__file__))
C=512
def pt(r,a,cx=C,cy=C):
    t=math.radians(a); return (cx+r*math.sin(t), cy-r*math.cos(t))
def f(p): return f"{p[0]:.1f} {p[1]:.1f}"

PAL5=['#8FB2FF','#F79CB0','#78D8B0','#C59BF2']  # blue rose mint lavender
def svg(bg,body,defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>{defs}</defs><rect width="1024" height="1024" fill="{bg}"/>{body}</svg>'
def blur(i,s): return f'<filter id="{i}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="{s}"/></filter>'

# ---------- circular day ring (arcs w/ caps and a track) ----------
def day_ring(name,bg,track,cols,dark,R=296,W=104):
    angs=[(0,100),(100,195),(195,285),(285,326)]
    arcs=lambda r,w,cap='butt':[(a0,a1,c) for (a0,a1),c in zip(angs,cols)]
    def arc(a0,a1,r): 
        p0,p1=pt(r,a0),pt(r,a1); return f'M{f(p0)}A{r} {r} 0 {1 if a1-a0>180 else 0} 1 {f(p1)}'
    defs=blur('b1',26)+blur('b2',70)+blur('b3',34)
    defs+=f'<clipPath id="cl"><circle cx="512" cy="512" r="{R}"/></clipPath>'
    b=''
    if dark:
        b+='<g filter="url(#b3)" opacity=".6">'+''.join(f'<path d="{arc(a0,a1,R)}" fill="none" stroke="{c}" stroke-width="{W+10}"/>' for (a0,a1),c in zip(angs,cols))+'</g>'
    # wash: wide blurred strokes along own arc, clipped inside ring
    b+='<g clip-path="url(#cl)">'
    b+='<g filter="url(#b2)" opacity="%s">'%(.3 if dark else .22)+''.join(f'<path d="{arc(a0,a1,R-90)}" fill="none" stroke="{c}" stroke-width="210"/>' for (a0,a1),c in zip(angs,cols))+'</g>'
    b+='<g filter="url(#b1)" opacity="%s">'%(.45 if dark else .34)+''.join(f'<path d="{arc(a0,a1,R-30)}" fill="none" stroke="{c}" stroke-width="110"/>' for (a0,a1),c in zip(angs,cols))+'</g></g>'
    b+=f'<circle cx="512" cy="512" r="{R}" fill="none" stroke="{track}" stroke-width="{W}"/>'
    for (a0,a1),c in zip(angs,cols):
        b+=f'<path d="{arc(a0,a1,R)}" fill="none" stroke="{c}" stroke-width="{W}"/>'
    for a,c in ((0,cols[0]),(326,cols[3])):
        p=pt(R,a); b+=f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{W/2}" fill="{c}"/>'
    write(name,svg(bg,b,defs))

# ---------- wobbly ring ----------
def make_shape(ro,ri,wo,wi,off):
    def Ro(a):
        t=math.radians(a); return ro+sum(A*math.sin(k*t+p) for k,A,p in wo)
    def Ri(a):
        t=math.radians(a); return ri+sum(A*math.sin(k*t+p) for k,A,p in wi)
    return Ro,Ri,off
def wring(name,bg,cols,bounds,shape,dark,glow=True,washop=.42,soft=None,sw=12):
    Ro,Ri,off=shape
    cx,cy=C,C
    def outer(a): return pt(Ro(a)-sw/2,a)
    def inner(a): return pt(Ri(a)+sw/2,a,cx+off[0],cy+off[1])
    def mid(a):
        o=outer(a);i=inner(a); return ((o[0]+i[0])/2,(o[1]+i[1])/2)
    def span(a0,a1,step=2.0):
        n=max(2,int((a1-a0)/step)+1); return [a0+(a1-a0)*k/(n-1) for k in range(n)]
    n=len(cols); segs=[(bounds[i],bounds[i+1],cols[i]) for i in range(n)]
    polys=[]
    for a0,a1,c in segs:
        s=span(a0,a1)
        pts=[outer(a) for a in s]+[inner(a) for a in reversed(s)]
        polys.append(('M'+'L'.join(f(p) for p in pts)+'Z',c))
    midpath=lambda a0,a1:'M'+'L'.join(f(mid(a)) for a in span(a0,a1))
    full=span(0,360,3); outerall='M'+'L'.join(f(outer(a)) for a in full)+'Z'
    defs=blur('b1',24)+blur('b2',64)+blur('b3',32)+blur('b4',3.5)+f'<clipPath id="cl"><path d="{outerall}"/></clipPath>'
    b=''
    if dark and glow:
        b+='<g filter="url(#b3)" opacity=".6">'+''.join(f'<path d="{d}" fill="{c}" stroke="{c}" stroke-width="{sw+14}" stroke-linejoin="round"/>' for d,c in polys)+'</g>'
    if soft:
        b+='<g filter="url(#b4)" opacity=".4" transform="translate(0 4)">'+''.join(f'<path d="{d}" fill="{soft(c)}" stroke="{soft(c)}" stroke-width="{sw}" stroke-linejoin="round"/>' for d,c in polys)+'</g>'
    ext=lambda a0,a1:(a0-6,a1+6)
    b+='<g clip-path="url(#cl)">'
    b+=f'<g filter="url(#b2)" opacity="{washop*0.5 if not dark else washop*0.7}">'+''.join(f'<path d="{midpath(a0-4,a1+4)}" fill="none" stroke="{c}" stroke-width="250" stroke-linecap="round"/>' for a0,a1,c in segs)+'</g>'
    b+=f'<g filter="url(#b1)" opacity="{washop*0.8 if not dark else washop*1.0}">'+''.join(f'<path d="{midpath(a0,a1)}" fill="none" stroke="{c}" stroke-width="150" stroke-linecap="round"/>' for a0,a1,c in segs)+'</g></g>'
    for d,c in polys:
        b+=f'<path d="{d}" fill="{c}" stroke="{c}" stroke-width="{sw}" stroke-linejoin="round"/>'
    write(name,svg(bg,b,defs))

def write(name,s):
    open(os.path.join(OUT,name),'w').write(s)

# friendlier wobble: rounder, thicker, hole nudged up-right
SHAPE=make_shape(336,196,[(2,15,0.6),(3,10,2.1),(1,6,1.2)],[(2,12,0.9),(3,7,2.4),(1,5,2.4)],(4,-10))
# subtle hybrid
SUBTLE=make_shape(340,238,[(2,7,0.6),(3,4,2.1),(1,3,1.2)],[(2,6,2.4),(3,4,0.4),(1,3,3.4)],(3,-4))

B5=['#8FB2FF','#F79CB0','#78D8B0','#C59BF2']
B4=[0,92,190,282,360]
day_ring('r1-day-ring-light.svg','#FFFFFF','#EEEEF2',B5,False)
day_ring('r2-day-ring-dark.svg','#0D0D0F','#23232B',B5,True)
wring('r3-wobble-pastel-light.svg','#FFFFFF',B5,B4,SHAPE,False)
wring('r4-wobble-pastel-dark.svg','#0D0D0F',B5,B4,SHAPE,True)
wring('r5-wobble-cool-light.svg','#FFFFFF',['#7CA3F2','#55C3D3','#B587EE','#F28CA3'],[0,95,190,275,360],SHAPE,False)
def deeper(c):
    r,g,b=[int(c[i:i+2],16) for i in (1,3,5)]
    return '#%02X%02X%02X'%tuple(int(v*0.78) for v in (r,g,b))
MILK=['#B4CBFB','#FBC0CC','#A6E6CB','#D8BDF6']
wring('r6-wobble-milky-light.svg','#F7F7F8',MILK,B4,SHAPE,False,soft=deeper,washop=.4)
wring('r7-wobble-trio-light.svg','#FFFFFF',['#C59BF2','#8FB2FF','#78D8B0'],[0,125,245,360],SHAPE,False)
wring('r8-wobble-duo-dark.svg','#0D0D0F',['#F79CB0','#C59BF2','#8FB2FF'],[0,120,240,360],SHAPE,True)
wring('r9-hybrid-light.svg','#FFFFFF',B5,B4,SUBTLE,False,sw=2)
wring('r10-hybrid-dark.svg','#0D0D0F',B5,B4,SUBTLE,True,sw=2)
