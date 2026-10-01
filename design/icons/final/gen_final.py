import os,re,subprocess
from PIL import Image, ImageDraw
D=os.path.dirname(os.path.abspath(__file__)); P=D+'/png/'
src=open(D+'/../refined/gen.py').read().split("B5=['#8FB2FF'")[0]
ns={'__file__':D+'/x.py'}; exec(src,ns); ns['OUT']=D
MASK='<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="300"><stop offset=".22" stop-color="#000"/><stop offset=".82" stop-color="#fff"/></radialGradient><mask id="fade"><rect width="1024" height="1024" fill="url(#fg)"/></mask>'
def patch(name):
    p=D+'/'+name; s=open(p).read()
    M=MASK.replace('stop-color="#000"','stop-color="#555"') if name.endswith('n.svg') else MASK
    s=s.replace('<g clip-path="url(#cl)">','<g clip-path="url(#cl)" mask="url(#fade)">').replace('</defs>',M+'</defs>',1)
    open(p,'w').write(s)
SOFT=['#7FA6F5','#4FC0C4','#B292EE','#E69AAB']   # blue teal lavender rose(muted)
DEEP=['#5C8DEE','#2FB0BC','#9E78E6','#DA7589']
B=[0,118,216,296,360]
ns['day_ring']('f1.svg','#FFFFFF','#EEF0F4',SOFT,False)
ns['day_ring']('f3.svg','#FFFFFF','#EEF0F4',DEEP,False)
ns['day_ring']('f1n.svg','#0D0D0F','#23232B',SOFT,True)
ns['wring']('f2.svg','#FFFFFF',SOFT,B,ns['SHAPE'],False,washop=.34)
ns['wring']('f4.svg','#FFFFFF',DEEP,B,ns['SHAPE'],False,washop=.34)
ns['wring']('f2n.svg','#0D0D0F',SOFT,B,ns['SHAPE'],True,washop=.34)
names=['f1','f2','f3','f4','f1n','f2n']
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ims={}
for n in names:
    patch(n+'.svg')
    subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1024,1024',f'--screenshot={P}full-{n}.png',f'file://{D}/{n}.svg'],capture_output=True)
    im=Image.open(P+f'full-{n}.png').convert('RGB').crop((0,0,1024,1024)); ims[n]=im
    im.resize((512,512),Image.LANCZOS).save(P+f'{n}.png'); im.resize((64,64),Image.LANCZOS).save(P+f'{n}-64.png')
FONT={'1':"00100 01100 00100 00100 00100 00100 01110",'2':"01110 10001 00001 00010 00100 01000 11111",'3':"11110 00001 00001 01110 00001 00001 11110",'4':"00010 00110 01010 10010 11111 00010 00010",'f':"00110 01000 11110 01000 01000 01000 01000",'n':"00000 00000 10110 11001 10001 10001 10001",' ':"00000 00000 00000 00000 00000 00000 00000"}
def text(d,x,y,s,sc,col):
    for ch in s:
        for r,row in enumerate(FONT[ch].split()):
            for c,v in enumerate(row):
                if v=='1': d.rectangle([x+c*sc,y+r*sc,x+(c+1)*sc-1,y+(r+1)*sc-1],fill=col)
        x+=6*sc
def tw(s,sc): return 6*sc*len(s)-sc
rs=lambda im,s: im.resize((s,s),Image.LANCZOS)
T,G,L=256,24,36
W=4*T+5*G; H=2*(T+L)+3*G
sh=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(sh)
for i,n in enumerate(names):
    x=G+(i%4)*(T+G); y=G+(i//4)*(T+L+G)
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
items=[('',ph(S,(176,180,188))),('f1',ims['f1']),('f2',ims['f2']),('',ph(S,(150,155,164))),('f3',ims['f3']),('f4',ims['f4'])]
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
