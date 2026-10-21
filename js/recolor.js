/* Recolour engine: dial and case/bezel are recoloured independently from the ONE watch photo, at the photo's native resolution.
   1. Classification (once per watch, CPU, 1200px space): every pixel of the case region is tagged
        dial  : inside the dial radius (soft 2px edge)
        strap : inside the strap band, outside the case circle  -> hidden when a generated strap is chosen
        frame : everything else = bezel, case flanks, lugs, crown, pushers
      plus "keep" weights that protect hands, indices and numerals (bright lume on a dark dial / dark hands on a light dial,
      thin high-contrast detail, bright numerals on a ceramic bezel). Per-watch tuning lives in config.js (watch.rc).
   2. Rendering: a tiny WebGL fragment shader re-tints with  new = target * (pixel luminance / region median luminance)  so the
      photo's own shading is kept. A swatch change is one GPU draw (well under a frame). If WebGL is missing, a Canvas2D path
      with identical maths is used. Edges are never resampled: the mask is a smooth texture, the colours come from the native photo. */
window.Recolor = (function () {
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function rgb01(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
  function median(vals, mask, cls) {
    var h = new Uint32Array(256), n = 0, i;
    for (i = 0; i < vals.length; i++) if (mask[i] === cls) { h[Math.min(255, (vals[i] * 255) | 0)]++; n++; }
    var acc = 0, half = n / 2; for (i = 0; i < 256; i++) { acc += h[i]; if (acc >= half) return Math.max(0.06, i / 255); }
    return 0.5;
  }

  /** Draw the case crop of the photo (1200px space) and return its pixels. Cheap; the heavy maths happens in classifyData. */
  function rasterCrop(img, w) {
    var r = w.r, IW = 1200, IH = 1607;
    var x0 = Math.max(0, Math.round(w.cx - 1.4 * r)), x1 = Math.min(IW, Math.round(w.cx + 1.65 * r)), y0 = Math.max(0, Math.round(w.cy - 1.35 * r)), y1 = Math.min(IH, Math.round(w.cy + 1.35 * r));
    var cw = x1 - x0, ch = y1 - y0, k = img.naturalWidth / IW;
    var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    var ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, x0 * k, y0 * k, cw * k, ch * k, 0, 0, cw, ch);
    return { d: ctx.getImageData(0, 0, cw, ch).data, x0: x0, y0: y0, cw: cw, ch: ch, w: { cx: w.cx, cy: w.cy, r: w.r, dialR: w.dialR, strapHalf: w.strapHalf }, rc: w.rc || {}, IW: IW, IH: IH };
  }

  /** Pure classification (no DOM): per-pixel class + keep weights. Runs inside a Worker so it never blocks the main thread. P = rasterCrop() + { forGL }. */
  function classifyData(P) {
    function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function median(vals, mask, cls) {
      var h = new Uint32Array(256), n = 0, i;
      for (i = 0; i < vals.length; i++) if (mask[i] === cls) { h[Math.min(255, (vals[i] * 255) | 0)]++; n++; }
      var acc = 0, half = n / 2; for (i = 0; i < 256; i++) { acc += h[i]; if (acc >= half) return Math.max(0.06, i / 255); }
      return 0.5;
    }
    var w = P.w, rc = P.rc, d = P.d, x0 = P.x0, y0 = P.y0, cw = P.cw, ch = P.ch, IW = P.IW, IH = P.IH, n = cw * ch;
    var cls = new Uint8Array(n), L = new Float32Array(n), dw = new Float32Array(n), ring = new Uint8Array(n), i, x, y, dist;
    var r = w.r, sh = w.strapHalf * 1.04, r2 = 1.02 * r, bez = (rc.bezelKeep || 0) * r;
    for (i = 0; i < n; i++) {
      x = x0 + (i % cw) - w.cx + 0.5; y = y0 + ((i / cw) | 0) - w.cy + 0.5; dist = Math.sqrt(x * x + y * y);
      L[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
      if (d[i * 4 + 3] < 8) { cls[i] = 0; continue; }
      if (Math.abs(x) < sh && dist > r2) { cls[i] = 3; continue; }
      cls[i] = dist < w.dialR ? 1 : 2;
      if (rc.navyBg && cls[i] === 2 && d[i * 4 + 2] - d[i * 4] > 6 && L[i] < 0.24) { cls[i] = 4; continue; }     // leftover navy backdrop / shadow: never recoloured
      if (dist < w.dialR + 1.5) dw[i] = Math.min(1, Math.max(0, (w.dialR - dist) / 2 + 0.5));
      if (cls[i] === 2 && bez && dist < bez) ring[i] = 1;                                                       // numerals on the bezel ring are protected
    }
    // Lugs sit inside the strap band next to the case. Strap pixels are the ones that look like the strap far from the case; anything near the case that does not is a lug (-> frame).
    var sr = 0, sg = 0, sb = 0, sn = 0, rr2 = r * 1.5;
    for (i = 0; i < n; i += 7) { if (cls[i] !== 3) continue; x = x0 + (i % cw) - w.cx; y = y0 + ((i / cw) | 0) - w.cy; if (x * x + y * y > rr2 * rr2) { sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; sn++; } }
    if (sn > 30) {
      sr /= sn; sg /= sn; sb /= sn; var near = r * 1.34;
      for (i = 0; i < n; i++) {
        if (cls[i] !== 3) continue; x = x0 + (i % cw) - w.cx + 0.5; y = y0 + ((i / cw) | 0) - w.cy + 0.5; if (x * x + y * y > near * near) continue;
        var dr = d[i * 4] - sr, dg = d[i * 4 + 1] - sg, db = d[i * 4 + 2] - sb;
        if (Math.sqrt(dr * dr + dg * dg + db * db) / 255 > (rc.lugDist || 0.3)) cls[i] = 2;
      }
    }
    var Ld = median(L, cls, 1), Lf = median(L, cls, 2), det = null, mode = rc.mode || "both", spread = rc.spread || 0.28;
    if (rc.detail) {                                          // thin hands / indices / text: strong local contrast -> protected whatever their brightness
      var Rr = 5, tmp = new Float32Array(n), Lb = new Float32Array(n), acc, xx, yy;
      for (yy = 0; yy < ch; yy++) { acc = 0; for (xx = -Rr; xx <= Rr; xx++) acc += L[yy * cw + Math.min(cw - 1, Math.max(0, xx))]; for (xx = 0; xx < cw; xx++) { tmp[yy * cw + xx] = acc / (2 * Rr + 1); acc += L[yy * cw + Math.min(cw - 1, xx + Rr + 1)] - L[yy * cw + Math.max(0, xx - Rr)]; } }
      for (xx = 0; xx < cw; xx++) { acc = 0; for (yy = -Rr; yy <= Rr; yy++) acc += tmp[Math.min(ch - 1, Math.max(0, yy)) * cw + xx]; for (yy = 0; yy < ch; yy++) { Lb[yy * cw + xx] = acc / (2 * Rr + 1); acc += tmp[Math.min(ch - 1, yy + Rr + 1) * cw + xx] - tmp[Math.max(0, yy - Rr) * cw + xx]; } }
      det = new Float32Array(n); for (i = 0; i < n; i++) det[i] = Math.abs(L[i] - Lb[i]);
    }
    var kd = new Float32Array(n), kf = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var dev = L[i] - Ld, m = mode === "dark" ? dev : mode === "light" ? -dev : Math.abs(dev);
      kd[i] = smooth(spread * 0.8, spread * 1.5, m);                                                            // 1 = keep original (hands / indices / text)
      if (det && cls[i] === 1) kd[i] = Math.max(kd[i], smooth(rc.detail, rc.detail * 2.2, det[i]));
      kf[i] = cls[i] === 4 ? 1 : ring[i] ? smooth(0.5, 0.68, L[i]) : 0;                                         // bright numerals on the bezel
    }
    var strength = rc.strength == null ? 1 : rc.strength;
    if (P.forGL) {                                           // GPU textures: A = (dial weight, frame, keep-dial, keep-frame), B = head mask
      var A = new Uint8Array(n * 4), B = new Uint8Array(n * 4), o, cl;
      for (i = 0; i < n; i++) {
        cl = cls[i]; if (!cl || cl === 3) continue; o = i * 4;
        A[o] = dw[i] * 255; A[o + 1] = cl === 2 ? 255 : 0; A[o + 2] = kd[i] * 255; A[o + 3] = kf[i] * 255; B[o] = 255;
      }
      return { A: A, B: B, Ld: Ld, Lf: Lf, strength: strength, IW: IW, IH: IH, x0: x0, y0: y0, cw: cw, ch: ch };
    }
    return { x0: x0, y0: y0, cw: cw, ch: ch, cls: cls, L: L, dw: dw, kd: kd, kf: kf, Ld: Ld, Lf: Lf, strength: strength, IW: IW, IH: IH };
  }
  function classify(img, w) { var P = rasterCrop(img, w); P.forGL = false; return classifyData(P); }   // synchronous (Canvas2D fallback only)

  var worker = null;
  function classifyAsync(img, w) {                           // GPU path: heavy maths off the main thread
    var P = rasterCrop(img, w); P.forGL = true;
    try {
      if (!worker) worker = new Worker(URL.createObjectURL(new Blob(["var classifyData=" + classifyData.toString() + ";onmessage=function(e){var r=classifyData(e.data);postMessage(r,[r.A.buffer,r.B.buffer]);};"], { type: "text/javascript" })));
      return new Promise(function (res, rej) { worker.onmessage = function (e) { res(e.data); }; worker.onerror = rej; worker.postMessage(P, [P.d.buffer]); });
    } catch (e) { return Promise.resolve(classifyData(P)); }
  }

  /* ---------------- WebGL engine ---------------- */
  var VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}";
  var FS = "precision highp float;varying vec2 v;uniform sampler2D uS,uA,uB;uniform vec3 uD,uF;uniform float uHD,uHF,uHide,uLd,uLf,uStr;uniform vec4 uR;" +
    "void main(){vec4 s=texture2D(uS,v);vec2 q=(v-uR.xy)/uR.zw;float ins=step(0.,q.x)*step(0.,q.y)*step(q.x,1.)*step(q.y,1.);vec4 a=texture2D(uA,q)*ins;float H=texture2D(uB,q).r*ins;vec3 c=s.rgb;float L=max(dot(c,vec3(.3,.59,.11)),.001);" +
    "vec3 fr=c;if(uHF>.5){float f=clamp(pow(L/uLf,.9),.22,2.3);fr=mix(clamp(uF*f,0.,1.),c,a.a);}" +
    "vec3 dr=c;if(uHD>.5){float f=clamp(pow(L/uLd,.85),.3,1.7);dr=mix(c,clamp(uD*f,0.,1.),(1.-a.b)*uStr);}" +
    "vec3 o=mix(c,fr,a.g);o=mix(o,dr,a.r);float al=s.a*mix(1.,H,uHide);gl_FragColor=vec4(o*al,al);}";

  function makeGL(canvas) {
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr); var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["uS", "uA", "uB", "uD", "uF", "uHD", "uHF", "uHide", "uLd", "uLf", "uStr", "uR"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(U.uS, 0); gl.uniform1i(U.uA, 1); gl.uniform1i(U.uB, 2);
    var tex = [gl.createTexture(), gl.createTexture(), gl.createTexture()], cur = null;
    function up(i, w, h, data, isImg) {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (isImg) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    function load(img, c) {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; gl.viewport(0, 0, canvas.width, canvas.height);
      up(0, 0, 0, img, true); up(1, c.cw, c.ch, c.A); up(2, c.cw, c.ch, c.B); cur = c;
    }
    function draw(dialHex, frameHex, hide) {
      if (!cur) return; var d = dialHex && rgb01(dialHex), f = frameHex && rgb01(frameHex);
      gl.uniform3fv(U.uD, d || [0, 0, 0]); gl.uniform3fv(U.uF, f || [0, 0, 0]); gl.uniform1f(U.uHD, d ? 1 : 0); gl.uniform1f(U.uHF, f ? 1 : 0); gl.uniform1f(U.uHide, hide ? 1 : 0);
      gl.uniform4f(U.uR, cur.x0 / cur.IW, cur.y0 / cur.IH, cur.cw / cur.IW, cur.ch / cur.IH); gl.uniform1f(U.uLd, cur.Ld); gl.uniform1f(U.uLf, cur.Lf); gl.uniform1f(U.uStr, cur.strength);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return { kind: "gl", load: load, draw: draw };
  }

  /* ---------------- Canvas2D fallback (same maths) ---------------- */
  function make2D(canvas) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true }), cur = null, img0 = null, src = null;
    function load(img, c) { img0 = img; cur = c; canvas.width = c.IW; canvas.height = c.IH; ctx.drawImage(img, 0, 0, c.IW, c.IH); src = ctx.getImageData(c.x0, c.y0, c.cw, c.ch); }
    function draw(dialHex, frameHex, hide) {
      var c = cur, td = dialHex && rgb01(dialHex), tf = frameHex && rgb01(frameHex), n = c.cw * c.ch, s = src.data, out = ctx.createImageData(c.cw, c.ch), o = out.data, i, j, cl, f, a, w1, R, G, B, fr, fg, fb, dr, dg, db;
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img0, 0, 0, c.IW, c.IH);
      for (i = 0, j = 0; i < n; i += 1, j += 4) {
        cl = c.cls[i]; R = s[j]; G = s[j + 1]; B = s[j + 2]; o[j + 3] = s[j + 3];
        if (cl === 0 || cl === 3 || cl === 4) { o[j] = R; o[j + 1] = G; o[j + 2] = B; continue; }
        fr = R; fg = G; fb = B; dr = R; dg = G; db = B;
        if (tf) { f = Math.min(2.3, Math.max(0.22, Math.pow(c.L[i] / c.Lf, 0.9))); a = c.kf[i]; fr = Math.min(255, tf[0] * 255 * f) * (1 - a) + R * a; fg = Math.min(255, tf[1] * 255 * f) * (1 - a) + G * a; fb = Math.min(255, tf[2] * 255 * f) * (1 - a) + B * a; }
        if (td) { f = Math.min(1.7, Math.max(0.3, Math.pow(c.L[i] / c.Ld, 0.85))); a = (1 - c.kd[i]) * c.strength; dr = R * (1 - a) + Math.min(255, td[0] * 255 * f) * a; dg = G * (1 - a) + Math.min(255, td[1] * 255 * f) * a; db = B * (1 - a) + Math.min(255, td[2] * 255 * f) * a; }
        w1 = cl === 1 ? Math.max(c.dw[i], 1) : c.dw[i]; o[j] = fr + (dr - fr) * w1; o[j + 1] = fg + (dg - fg) * w1; o[j + 2] = fb + (db - fb) * w1;
      }
      ctx.putImageData(out, c.x0, c.y0);
      if (hide) {                                              // keep only the head: everything outside the classified case pixels becomes transparent
        var full = ctx.getImageData(0, 0, c.IW, c.IH), fd = full.data, yy, xx, ci, p;
        for (yy = 0; yy < c.IH; yy++) for (xx = 0; xx < c.IW; xx++) { p = (yy * c.IW + xx) * 4; ci = (yy - c.y0) * c.cw + (xx - c.x0); if (yy < c.y0 || yy >= c.y0 + c.ch || xx < c.x0 || xx >= c.x0 + c.cw || !c.cls[ci] || c.cls[ci] === 3) fd[p + 3] = 0; }
        ctx.putImageData(full, 0, 0);
      }
    }
    return { kind: "2d", load: load, draw: draw };
  }

  /** Bind an engine to a display canvas. create(canvas).load(img, watch) -> Promise, then .draw(dialHex, frameHex, hideStrap). */
  function create(canvas) {
    var eng = makeGL(canvas) || make2D(canvas);
    return { kind: eng.kind, draw: eng.draw, load: function (img, watch) { return eng.kind === "gl" ? classifyAsync(img, watch).then(function (c) { eng.load(img, c); }) : Promise.resolve(eng.load(img, classify(img, watch))); } };
  }
  return { create: create };
})();
