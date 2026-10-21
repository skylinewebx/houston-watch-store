import cv2, numpy as np, json, sys
from scipy import ndimage as ndi
# head circle in ORIGINAL px (Hough, field set by hand). chrono is 896x1200 natively.
HEAD={"dive":(892,1197,459),"gmt":(892,1184,398),"skeleton":(889,1197,435),"dress":(892,1193,445),"chrono":(448,595,225),
      "pilot":(895,1193,284),"field":(915,1182,275),"smart":(892,1203,284),"minimal":(877,1181,271),"vintage":(895,1181,402)}
NAVY={"pilot":14,"field":11,"smart":6,"minimal":16,"vintage":18}
def build(key, work_w=700):
    im=cv2.imread(f"work/src/{key}.jpg"); H,W=im.shape[:2]
    cx,cy,r=HEAD[key]; s=work_w/W
    sm=cv2.resize(im,(work_w,int(H*s)),interpolation=cv2.INTER_AREA); h,w=sm.shape[:2]
    cxs,cys,rs=cx*s,cy*s,r*s
    mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
    mask[:, :int(w*0.14)]=cv2.GC_BGD; mask[:, int(w*0.90):]=cv2.GC_BGD
    mask[:, int(w*0.30):int(w*0.70)]=cv2.GC_PR_FGD
    mask[:, int(w*0.41):int(w*0.59)]=cv2.GC_FGD
    cv2.circle(mask,(int(cxs),int(cys)),int(rs*1.12),cv2.GC_PR_FGD,-1)       # case + lugs + crown area
    cv2.rectangle(mask,(int(cxs+rs*0.9),int(cys-rs*0.28)),(int(cxs+rs*1.32),int(cys+rs*0.28)),cv2.GC_PR_FGD,-1)  # crown/pushers
    cv2.circle(mask,(int(cxs),int(cys)),int(rs*0.96),cv2.GC_FGD,-1)
    bgd=np.zeros((1,65));fgd=np.zeros((1,65))
    cv2.grabCut(sm,mask,None,bgd,fgd,6,cv2.GC_INIT_WITH_MASK)
    m=((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD))
    if key in NAVY:
        # per-row background colour from the left/right margins, then keep only pixels that differ from it
        lab_=cv2.cvtColor(sm,cv2.COLOR_BGR2LAB).astype(np.float32)
        marg=np.concatenate([lab_[:, :int(w*0.12)],lab_[:, int(w*0.92):]],axis=1)
        bgrow=np.median(marg,axis=1)[:,None,:]
        dist=np.linalg.norm(lab_-bgrow,axis=2)
        far=cv2.GaussianBlur((dist>NAVY[key]).astype(np.float32),(0,0),0.8)>0.5
        far=cv2.morphologyEx(far.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)).astype(bool)
        disc=np.zeros((h,w),np.uint8); cv2.circle(disc,(int(cxs),int(cys)),int(rs*0.97),1,-1)
        m=(m&far)|disc.astype(bool)
    lab,n=ndi.label(m)
    if n>1:
        sizes=ndi.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sizes)))
    m=ndi.binary_fill_holes(m)
    m=cv2.morphologyEx(m.astype(np.uint8)*255,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    x0,x1=int(cxs+rs*0.85),int(cxs+rs*1.4); y0,y1=int(cys-rs*0.3),int(cys+rs*0.3)
    reg=m[y0:y1,x0:x1]; m[y0:y1,x0:x1]=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    m=cv2.erode(m,np.ones((3,3),np.uint8))          # kills the bright/dark halo
    m=cv2.GaussianBlur(m,(0,0),1.1)
    return im,m
if __name__=="__main__":
    tiles=[]
    for k in HEAD:
        im,m=build(k); H,W=im.shape[:2]
        mm=cv2.resize(m,(W,H)); a=(mm/255.0)[...,None]
        o=(im*a+np.array((22,18,16))*(1-a)).astype(np.uint8)
        cv2.imwrite(f"work/c2_{k}.jpg",cv2.resize(o,(W//2,H//2)))
        tiles.append(cv2.resize(o,(280,int(280*H/W))))
    hh=max(t.shape[0] for t in tiles)
    tiles=[cv2.copyMakeBorder(t,0,hh-t.shape[0],0,0,cv2.BORDER_CONSTANT) for t in tiles]
    cv2.imwrite("work/sheet.jpg",np.vstack([np.hstack(tiles[:5]),np.hstack(tiles[5:])]))
