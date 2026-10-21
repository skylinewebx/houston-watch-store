"""High-res asset pipeline: cut-outs at native resolution -> AVIF + WebP ladders, shadow sprites, blur-up, meta.js, anatomy layers."""
import cv2, numpy as np, json, os, io, base64, sys, time
from PIL import Image
from cut3 import build_hi
OUT="C:/Users/HP/Downloads/Watch Store/assets"
os.makedirs(OUT+"/watches",exist_ok=True); os.makedirs(OUT+"/layers",exist_ok=True)
# case geometry in the canonical 1200x1607 space (centre, outer radius, dial ratio, strap half-width ratio) - measured earlier
GEO={"dive":(892,1197,468,.78,.52),"gmt":(900,1188,500,.75,.65),"skeleton":(889,1197,435,.77,.53),"dress":(892,1193,445,.88,.53),"chrono":(448,595,225,.86,.56),
     "pilot":(895,1193,298,.93,.59),"field":(926,1182,273,.87,.66),"smart":(892,1203,300,.88,.53),"minimal":(890,1181,265,.90,.50),"vintage":(895,1181,402,.90,.50)}
# pose (deg): rx>0 faces up, ry>0 faces right, rz roll. Light comes from the side the watch faces and from above; shadow falls the other way.
POSE={"dive":(7,11,-9),"chrono":(8,-12,-8),"skeleton":(6,9,-11),"gmt":(9,-10,-9),"dress":(7,8,-10),"pilot":(6,-12,-8),"field":(8,10,-10),"smart":(10,-7,-9),"minimal":(6,12,-8),"vintage":(7,-9,-11)}
LADDER=[240,480,720,960,1200,1600,1792]
def light(key): rx,ry,rz=POSE[key]; sx=(1 if ry>0 else -1)*0.6; v=np.array([sx,-1.0]); return v/np.linalg.norm(v)   # unit vector TOWARD the light
def decont(img,a):
    core=cv2.erode((a>0.97).astype(np.uint8),np.ones((5,5),np.uint8)).astype(np.float32)
    s=max(3,img.shape[1]//300)
    num=cv2.GaussianBlur(img.astype(np.float32)*core[...,None],(0,0),s); den=cv2.GaussianBlur(core,(0,0),s)[...,None]+1e-4
    return np.where((a<0.97)[...,None]&(den>0.02),num/den,img.astype(np.float32))
def rim(img,a,L,strength=.26):
    d=max(2.0,img.shape[1]/560); M=np.float32([[1,0,-L[0]*d],[0,1,-L[1]*d]])
    a_s=cv2.warpAffine(a,M,(a.shape[1],a.shape[0]),borderMode=cv2.BORDER_REPLICATE)
    E=cv2.GaussianBlur(np.clip(a-a_s,0,1),(0,0),max(.8,d/3))
    return img+(255-img)*(strength*E)[...,None]
def edge_fade(a,top,bot):
    h=a.shape[0]; f=int(h*0.07)
    if top: a[:f]*=np.linspace(0,1,f)[:,None]**1.5
    if bot: a[-f:]*=np.linspace(1,0,f)[:,None]**1.5
    return a
def unsharp(rgba,amount=.35,radius=.7):
    rgb=rgba[...,:3].astype(np.float32); b=cv2.GaussianBlur(rgb,(0,0),radius); rgb=np.clip(rgb+(rgb-b)*amount,0,255)
    return np.dstack([rgb,rgba[...,3]])
def save(rgba,path_base,q_avif=68,q_webp=90):
    im=Image.fromarray(np.clip(rgba,0,255).astype(np.uint8),"RGBA")
    im.save(path_base+".webp","WEBP",quality=q_webp,method=5)
    im.save(path_base+".avif","AVIF",quality=q_avif,speed=7)
    return os.path.getsize(path_base+".webp"),os.path.getsize(path_base+".avif")
def shadow_sprite(a,L,key):
    w=400; h=round(a.shape[0]*w/a.shape[1]); s=cv2.resize(a,(w,h),interpolation=cv2.INTER_AREA)
    off=np.array([-L[0],-L[1]])*w*0.035                               # falls opposite the light
    M=np.float32([[1,0,off[0]],[0,1,off[1]+w*0.012]]); s=cv2.warpAffine(s,M,(w,h)); s=cv2.GaussianBlur(s,(0,0),w*0.016)*0.62
    rgba=np.dstack([np.zeros((h,w,3),np.float32),s*255]); Image.fromarray(rgba.astype(np.uint8),"RGBA").save(f"{OUT}/watches/{key}-shadow.webp","WEBP",quality=70)
meta={}; full1200={}
ONLY=os.environ.get("KEYS","").split(",") if os.environ.get("KEYS") else list(GEO)
def smoothstep(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
for key in [k for k in GEO if k in ONLY]:
    t=time.time(); im,a=build_hi(key,700); H,W=a.shape; L=light(key)
    if key in ("vintage","minimal","pilot","field"):     # drop the dark navy table-shadow that the cut-out picked up next to the case
        Bc=im[...,0].astype(np.float32); Gc=im[...,1].astype(np.float32); Rc=im[...,2].astype(np.float32); Lum=(0.299*Rc+0.587*Gc+0.114*Bc)/255
        a=a*np.where(((Bc-Rc)>3)&(Lum<0.16),smoothstep(0.05,0.16,Lum),1.0).astype(np.float32); a=cv2.GaussianBlur(a,(0,0),0.8)
    top=a[2].max()>0.5; bot=a[-3].max()>0.5; a=edge_fade(a,top,bot)
    img=decont(im,a); img=cv2.cvtColor(img.astype(np.float32),cv2.COLOR_BGR2RGB); img=rim(img,a,L)
    widths=[w for w in LADDER if w<=W]; widths+= [W] if W not in widths else []; sizes={}
    for w in widths:
        h=round(H*w/W); r_=cv2.resize(np.dstack([img,a*255]).astype(np.float32),(w,h),interpolation=cv2.INTER_AREA if w<W else cv2.INTER_LINEAR)
        if w<W: r_=unsharp(r_)
        sizes[w]=save(r_,f"{OUT}/watches/{key}-{w}")
        if w==1200 or (w==max(widths) and w<1200): full1200[key]=r_ if w==1200 else None
    shadow_sprite(a,L,key)
    cx,cy,r,dr,sh=GEO[key]; s=1200/W if key!="chrono" else 1200/W   # canonical-space scale from native px
    k=1200/(1792 if key!="chrono" else 896)
    r12=cv2.resize(np.dstack([img,a*255]).astype(np.float32),(1200,round(H*1200/W)),interpolation=cv2.INTER_AREA)
    full1200[key]=r12
    lq=Image.fromarray(np.clip(cv2.resize(r12,(20,27),interpolation=cv2.INTER_AREA),0,255).astype(np.uint8),"RGBA"); b=io.BytesIO(); lq.save(b,"WEBP",quality=60)
    meta[key]=dict(cx=round(cx*k),cy=round(cy*k),r=round(r*k),dialR=round(r*k*dr),strapHalf=round(r*k*sh),w=1200,h=1607,widths=widths,srcW=W,srcH=H,
        pose=dict(rx=POSE[key][0],ry=POSE[key][1],rz=POSE[key][2]),light=[round(float(L[0]),3),round(float(L[1]),3)],lqip="data:image/webp;base64,"+base64.b64encode(b.getvalue()).decode())
    print(key,W,H,widths[-1],{w:(s[0]//1024,s[1]//1024) for w,s in list(sizes.items())[-2:]},round(time.time()-t,1),flush=True)
import re as _re
if len(ONLY)<len(GEO):
    old=json.loads(open(OUT+"/watches/meta.js").read().split("=",1)[1].rsplit(";",1)[0]); old.update(meta); meta=old
js="/* GENERATED by tools/build_assets/export2.py - case geometry (1200x1607 space), pose/light, srcset widths, blur-up placeholders. */\nwindow.WATCH_META = "+json.dumps(meta,indent=1)+";\n"
open(OUT+"/watches/meta.js","w").write(js)
import pickle
try: old_full=pickle.load(open("work/full1200.pkl","rb"))
except Exception: old_full={}
old_full.update(full1200); pickle.dump(old_full,open("work/full1200.pkl","wb"))
print("done")
