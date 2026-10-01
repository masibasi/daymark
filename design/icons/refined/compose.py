from PIL import Image, ImageDraw
import os
D=os.path.dirname(os.path.abspath(__file__)); P=D+'/png/'
full=[Image.open(P+f'full-{i}.png').convert('RGB').resize((1024,1024)) if False else Image.open(P+f'full-{i}.png').convert('RGB') for i in range(1,11)]
full=[im.crop((0,0,1024,1024)) for im in full]
def rs(im,s): return im.resize((s,s),Image.LANCZOS)
for i,im in enumerate(full,1): rs(im,512).save(P+f'r{i}.png'); rs(im,64).save(P+f'r{i}-64.png')
FONT={'0':"01110 10001 10011 10101 11001 10001 01110",'1':"00100 01100 00100 00100 00100 00100 01110",'2':"01110 10001 00001 00010 00100 01000 11111",'3':"11110 00001 00001 01110 00001 00001 11110",'4':"00010 00110 01010 10010 11111 00010 00010",'5':"11111 10000 11110 00001 00001 10001 01110",'6':"00110 01000 10000 11110 10001 10001 01110",'7':"11111 00001 00010 00100 01000 01000 01000",'8':"01110 10001 10001 01110 10001 10001 01110",'9':"01110 10001 10001 01111 00001 00010 01100",'r':"00000 00000 10110 11001 10000 10000 10000"}
def text(d,x,y,s,sc,col):
    for ch in s:
        for r,row in enumerate(FONT[ch].split()):
            for c,v in enumerate(row):
                if v=='1': d.rectangle([x+c*sc,y+r*sc,x+(c+1)*sc-1,y+(r+1)*sc-1],fill=col)
        x+=6*sc
def tw(s,sc): return 6*sc*len(s)-sc
# contact sheet
T,G,L=256,24,34
W=5*T+6*G; H=2*(T+L)+3*G
sh=Image.new('RGB',(W,H),(240,240,243)); d=ImageDraw.Draw(sh)
for i in range(10):
    x=G+(i%5)*(T+G); y=G+(i//5)*(T+L+G)
    sh.paste(rs(full[i],T),(x,y)); s=f'r{i+1}'
    text(d,x+(T-tw(s,3))//2,y+T+8,s,3,(60,60,70))
sh.save(D+'/contact-sheet.png')
# small sheet: rows 64 and 32 on light & dark strips
cell=100; Wd=10*cell+20
rows=[(64,(255,255,255)),(32,(255,255,255)),(64,(13,13,15)),(32,(13,13,15))]
rh=[96,64,96,64]
H=sum(rh)+30+22*0
sh=Image.new('RGB',(Wd,sum(rh)+50),(240,240,243)); d=ImageDraw.Draw(sh)
y=0
for (s,bg),h in zip(rows,rh):
    d.rectangle([0,y,Wd,y+h],fill=bg)
    for i in range(10):
        x=10+i*cell+(cell-s)//2
        sh.paste(rs(full[i],s),(x,y+(h-s)//2))
    y+=h
# numbers on bottom strip
for i in range(10):
    s=f'r{i+1}'; text(d,10+i*cell+(cell-tw(s,2))//2,y+16,s,2,(60,60,70))
# numbers also on top-left per strip? put in dark strip legend
sh.save(D+'/small-sheet.png')
