import pickle, json, cv2, numpy as np, os
from PIL import Image
OUT="C:/Users/HP/Downloads/Watch Store/assets/layers"; os.makedirs(OUT,exist_ok=True)
full=pickle.load(open("work/full1200.pkl","rb")); g=json.load(open("C:/Users/HP/Downloads/Watch Store/assets/watches/meta.js").read().split("=",1)[1].rsplit(";",1)[0] and __import__("io").StringIO(open("C:/Users/HP/Downloads/Watch Store/assets/watches/meta.js").read().split("=",1)[1].rsplit(";",1)[0]))["dive"]
rgba=full["dive"]; rgb=rgba[...,:3].astype(np.float32); a=rgba[...,3]/255.0; H,W=a.shape
cx,cy,r,rd,sh=g["cx"],g["cy"],g["r"],g["dialR"],g["strapHalf"]
yy,xx=np.mgrid[0:H,0:W].astype(np.float32); dist=np.hypot(xx-cx,yy-cy)
soft=lambda m: cv2.GaussianBlur(m.astype(np.float32),(0,0),1.0)
disc=soft(dist<rd+1); band=(np.abs(xx-cx)<sh); outside=(dist>1.02*r)
crown=((xx>cx+0.93*r)&(np.abs(yy-cy)<0.26*r)&(dist>0.9*r)).astype(np.float32)
strap_top=a*(band&outside&(yy<cy)); strap_bot=a*(band&outside&(yy>cy))
dial=a*disc; crown_a=a*soft(crown); keep_frame=1-(band&outside).astype(np.float32); frame=a*keep_frame*(1-disc)*(1-soft(crown))
t=np.clip(dist/(rd+2),0,1); mv=np.stack([14+16*(1-t),16+18*(1-t),22+26*(1-t)],axis=-1); hole=soft(dist<rd+2)
frame_rgb=rgb*(1-hole[...,None])+mv*hole[...,None]; frame_a=np.maximum(frame,hole)
parts={"strap-top":(rgb,strap_top),"strap-bottom":(rgb,strap_bot),"frame":(frame_rgb,frame_a),"dial":(rgb,dial),"crown":(rgb,crown_a)}
bbox={}
for n,(c,al) in parts.items():
    out=np.dstack([np.clip(c,0,255),np.clip(al,0,1)*255]).astype(np.uint8); im=Image.fromarray(out,"RGBA")
    ys,xs=np.where(out[...,3]>40); bbox[n]=[round(xs.min()/W,4),round(ys.min()/H,4),round(xs.max()/W,4),round(ys.max()/H,4)]
    im.save(f"{OUT}/layer-{n}.webp","WEBP",quality=92,method=5); im.save(f"{OUT}/layer-{n}.avif","AVIF",quality=75,speed=7)
    print(n,os.path.getsize(f"{OUT}/layer-{n}.webp")//1024,os.path.getsize(f"{OUT}/layer-{n}.avif")//1024)
print(json.dumps(bbox))
