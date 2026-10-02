import os,subprocess
from PIL import Image, ImageDraw
import gen_round3 as g
D0=os.path.dirname(os.path.abspath(__file__)); D=D0+'/round10'; P=D+'/png/'
g.D=D
B_,T_,L_,R_='#6E9AF2','#3FB8C0','#A885EA','#E0889A'
H_,A_,C_='#F0B860','#F2A988','#EE8F80'
O_,P_,G_,Y_='#F4A06E','#F6B38E','#7DCB94','#E9C46A'
LB,LB2,PW,LL,LR,LT='#8FB4F6','#A6C4F8','#9DB2F4','#B79DEF','#E99AAC','#6FC8CE'
K={
 's1':([LR,LL,LB,P_],(.24,.22,.36,.18)),
 's2':([P_,LR,LL,LB],(.26,.24,.24,.26)),
 's3':([P_,LR,LL,LB],(.22,.22,.24,.32)),
 's4':([P_,LR,LL,LB2],(.22,.22,.24,.32)),
 's5':([P_,LR,LL,PW],(.22,.22,.24,.32)),
 's6':([LR,LL,LB,LT],(.28,.26,.26,.20)),
 's7':([LR,LL,LB2,P_],(.26,.24,.30,.20)),
 's8':([LB,LL,LR,P_],(.30,.26,.24,.20)),
 's9':([LB2,LL,LR,P_],(.34,.24,.22,.20)),
}
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if __name__=='__main__':
    v=g.V['h4']
    for n,(cols,sh) in K.items():
        g.COLS=cols; d=g.make(v); g.render(d,v,n,'#FFFFFF',False,shares=sh)
        subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1024,1024',f'--screenshot={P}full-{n}.png',f'file://{D}/{n}.svg'],capture_output=True)
        im=Image.open(P+f'full-{n}.png').convert('RGB').crop((0,0,1024,1024))
        im.resize((512,512),Image.LANCZOS).save(P+f'{n}.png'); im.resize((64,64),Image.LANCZOS).save(P+f'{n}-64.png')
    FONT={'1':"00100 01100 00100 00100 00100 00100 01110",'2':"01110 10001 00001 00010 00100 01000 11111",'3':"11110 00001 00001 01110 00001 00001 11110",'4':"00010 00110 01010 10010 11111 00010 00010",'5':"11111 10000 11110 00001 00001 10001 01110",'6':"00110 01000 10000 11110 10001 10001 01110",'7':"11111 00001 00010 00100 01000 01000 01000",'8':"01110 10001 10001 01110 10001 10001 01110",'m':"00000 00000 11010 10101 10101 10101 10101",'n':"00000 00000 10110 11001 10001 10001 10001",'p':"00000 00000 11110 10001 11110 10000 10000",'q':"00000 00000 01111 10001 01111 00001 00001",'r':"00000 00000 10110 11001 10000 10000 10000",'9':"01110 10001 10001 01111 00001 00010 01100",'s':"00000 00000 01111 10000 01110 00001 11110",'k':"10000 10000 10010 10100 11000 10100 10010",' ':"00000 "*6+"00000"}
    def text(dr,x,y,s,sc,col):
        for ch in s:
            for r,row in enumerate(FONT[ch].split()):
                for c,vv in enumerate(row):
                    if vv=='1': dr.rectangle([x+c*sc,y+r*sc,x+(c+1)*sc-1,y+(r+1)*sc-1],fill=col)
            x+=6*sc
    tw=lambda s,sc:6*sc*len(s)-sc
    rs=lambda im,s:im.resize((s,s),Image.LANCZOS)
    ims={n:Image.open(P+f'full-{n}.png').convert('RGB').crop((0,0,1024,1024)) for n in K}
    T,G,Lh=256,24,36
    sh=Image.new('RGB',(3*T+4*G,3*(T+Lh)+4*G),(255,255,255)); dr=ImageDraw.Draw(sh)
    for i,n in enumerate(K):
        x=G+(i%3)*(T+G); y=G+(i//3)*(T+Lh+G)
        sh.paste(rs(ims[n],T),(x,y)); text(dr,x+(T-tw(n,3))//2,y+T+10,n,3,(60,60,70))
    sh.save(D+'/compare.png')
    S=110
    def mask(s): 
        m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).rounded_rectangle([0,0,s*4-1,s*4-1],int(s*4*.225),fill=255); return m.resize((s,s),Image.LANCZOS)
    gap,lab=30,30
    pw=9*S+10*gap; phh=S+lab+2*gap
    mock=Image.new('RGB',(pw,2*phh),(233,237,242)); dr=ImageDraw.Draw(mock); dr.rectangle([0,phh,pw,2*phh],fill=(43,47,54))
    for r,tc in enumerate([(70,75,85),(220,224,230)]):
        for i,n in enumerate(K):
            x=gap+i*(S+gap); y=r*phh+gap
            ic=rs(ims[n],S).convert('RGBA'); ic.putalpha(mask(S)); mock.paste(ic,(x,y),ic)
            text(dr,x+(S-tw(n,3))//2,y+S+10,n,3,tc)
    mock.save(D+'/home-mock.png')
