import cv2, numpy as np
from scipy import ndimage as ndi
from cut2 import HEAD, NAVY
def smooth(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def guided(I,p,r,eps):
    box=lambda x: cv2.boxFilter(x,-1,(2*r+1,2*r+1),borderType=cv2.BORDER_REPLICATE)
    mI=box(I); mp=box(p); cov=box(I*p)-mI*mp; var=box(I*I)-mI*mI
    a=cov/(var+eps); b=mp-a*mI; return box(a)*I+box(b)
def build_hi(key, work_w=1100):
    im=cv2.imread(f"work/src/{key}.jpg"); H,W=im.shape[:2]
    cx,cy,r=HEAD[key]; s=work_w/W
    sm=cv2.resize(im,(work_w,int(H*s)),interpolation=cv2.INTER_AREA); h,w=sm.shape[:2]
    cxs,cys,rs=cx*s,cy*s,r*s
    mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
    mask[:, :int(w*0.14)]=cv2.GC_BGD; mask[:, int(w*0.90):]=cv2.GC_BGD
    mask[:, int(w*0.30):int(w*0.70)]=cv2.GC_PR_FGD; mask[:, int(w*0.41):int(w*0.59)]=cv2.GC_FGD
    cv2.circle(mask,(int(cxs),int(cys)),int(rs*1.12),cv2.GC_PR_FGD,-1)
    cv2.rectangle(mask,(int(cxs+rs*0.9),int(cys-rs*0.28)),(int(cxs+rs*1.32),int(cys+rs*0.28)),cv2.GC_PR_FGD,-1)
    cv2.circle(mask,(int(cxs),int(cys)),int(rs*0.96),cv2.GC_FGD,-1)
    bgd=np.zeros((1,65));fgd=np.zeros((1,65)); cv2.grabCut(sm,mask,None,bgd,fgd,6,cv2.GC_INIT_WITH_MASK)
    m=((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD))
    if key in NAVY:
        lab_=cv2.cvtColor(sm,cv2.COLOR_BGR2LAB).astype(np.float32)
        marg=np.concatenate([lab_[:, :int(w*0.12)],lab_[:, int(w*0.92):]],axis=1); bgrow=np.median(marg,axis=1)[:,None,:]
        dist=np.linalg.norm(lab_-bgrow,axis=2); far=cv2.GaussianBlur((dist>NAVY[key]).astype(np.float32),(0,0),0.8)>0.5
        far=cv2.morphologyEx(far.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)).astype(bool)
        disc=np.zeros((h,w),np.uint8); cv2.circle(disc,(int(cxs),int(cys)),int(rs*0.97),1,-1); m=(m&far)|disc.astype(bool)
    lab,n=ndi.label(m)
    if n>1: sizes=ndi.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sizes)))
    m=ndi.binary_fill_holes(m); m=cv2.morphologyEx(m.astype(np.uint8)*255,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    x0,x1=int(cxs+rs*0.85),int(cxs+rs*1.4); y0,y1=int(cys-rs*0.3),int(cys+rs*0.3)
    reg=m[y0:y1,x0:x1]; m[y0:y1,x0:x1]=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(35,35)))
    # full-res alpha: upsample, snap to real edges with a guided filter, <=1px feather
    p=cv2.resize(m,(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32)/255
    p=cv2.GaussianBlur(p,(0,0),1.0)
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    q=guided(g,p,max(4,W//300),1e-4)
    a=smooth(0.42,0.62,q)                                     # slightly inside the edge: no halo
    a=cv2.erode(a,np.ones((2,2),np.uint8))
    return im,a.astype(np.float32)
