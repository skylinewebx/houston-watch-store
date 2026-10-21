/* Hero + showcase: 5 watches, each shown straight and solid (contact + ambient shadow, rim light), crossfade + slow light sweep, page-wide ambient colour,
   buttons tinted by the watch, staged detail callouts. The big images are AVIF/WebP <picture>s that were decoded
   ahead of time (preload.js), so a switch is instant. */
(function () {
  var U = window.UI, S = window.SITE, list = S.showcase;
  var root = document.documentElement, stage = U.$("#scStage"), thumbs = U.$("#scThumbs"), home = U.$("#home");
  var idx = -1, timer, G, bp = matchMedia("(min-width: 900px)"), swept = 0;

  U.$("#heroTitle").innerHTML = "Time, <em>considered.</em>"; U.$("#heroSub").textContent = S.sub;

  // .pic (masked window) > .float > .wimg > .tilt (slow 2deg turn)  > [.w = shadow + photo] x5 + sheen
  var hs = Preload.heroSizes();
  var tiltEl0 = U.$(".tilt", stage), sheen0 = U.$(".sheen", stage);               // watch #1 is static HTML (instant LCP); build the other four
  var ws = U.$$(".tilt .w", stage), built = false;
  /** The other four watches are created only after the LCP image has painted + the page is idle (or on the first interaction), so they never compete with it for bandwidth. */
  function buildRest() {
    if (built) return; built = true;
    list.slice(1).forEach(function (w) { sheen0.insertAdjacentHTML("beforebegin", '<div class="w">' + U.shadow(w.id) + U.im(w.id, w.name + " watch", { sizes: hs }) + "</div>"); });
    ws = U.$$(".tilt .w", stage);
  }
  ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (t) { addEventListener(t, buildRest, { once: true, capture: true, passive: true }); });
  var armBuild = function () { setTimeout(function () { (window.requestIdleCallback || setTimeout)(buildRest); }, 2200); };
  if (document.readyState === "complete") armBuild(); else addEventListener("load", armBuild);
  thumbs.innerHTML = list.map(function (w, i) {
    return '<button class="thumb" role="tab" aria-selected="false" aria-label="' + U.esc(w.name) + '" data-i="' + i + '">' + U.im(w.id, "", { sizes: Preload.thumbSizes }) + "</button>";
  }).join("");
  var tabs = U.$$(".thumb", thumbs), cos = U.$(".cos", stage), sheen = sheen0, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, FLAT = { rx: 0, ry: 0, rz: 0 };

  /** Light sweep across the watch silhouette (mask = the current photo). */
  function sweep(w, ms) {
    var now = Date.now(); if (now - swept < 1100 || reduce) return; swept = now;
    sheen.style.setProperty("--sd", (ms || 950) + "ms");
    sheen.style.setProperty("--m", "url(" + new URL(Preload.url(w.id, Preload.pick(w.id, 720)), document.baseURI).href + ")");   // absolute: var() URLs resolve against the stylesheet
    sheen.classList.remove("go"); void sheen.offsetWidth; sheen.classList.add("go");
  }

  /** Project an image-space point through the watch's 3D pose (same maths as the CSS transform) into stage units. */
  function project(p, x, y, scale) {
    var d = 1100 / scale, X = x - 600, Y = y - 803.5, r = Math.PI / 180, cz = Math.cos(p.rz * r), sz = Math.sin(p.rz * r), cy = Math.cos(p.ry * r), sy = Math.sin(p.ry * r), cx = Math.cos(p.rx * r), sx = Math.sin(p.rx * r);
    var x1 = X * cz - Y * sz, y1 = X * sz + Y * cz, x2 = x1 * cy, z2 = -x1 * sy, y3 = y1 * cx - z2 * sx, z3 = y1 * sx + z2 * cx, f = d / (d - z3);
    return { x: 600 + x2 * f, y: 803.5 + y3 * f };
  }
  /** Callouts: strap -> dial -> frame -> crown, anchored to the posed watch. */
  function build(w, show) {
    G = U.stageGeom(stage); var ox = (G.w - 1200) / 2, s = w.show, sc = stage.clientWidth / G.w || 0.4;
    var r = w.r, rd = w.dialR, sh = w.strapHalf, cx = w.cx, cy = w.cy, rm = (r + rd) / 2;
    var P = function (x, y) { var q = project(FLAT, x, y, sc); return { x: ox + q.x, y: q.y - G.y0 }; };
    var lim = function (p) { p.y = Math.min(G.h - 60, Math.max(60, p.y)); return p; };
    var rows = [
      ["Strap", s.strap, P(cx - sh * 0.5, cy - 1.62 * r), P(cx - sh - 26, cy - 1.62 * r), "l"],
      ["Dial", s.dial, P(cx + 0.36 * rd, cy - 0.4 * rd), P(cx + sh + 26, cy - 1.3 * r), "r"],
      ["Frame", s.frame, P(cx - 0.707 * rm, cy + 0.707 * rm), P(cx - sh - 26, cy + 1.35 * r), "l"],
      ["Crown", s.crown, P(s.crownXY[0], s.crownXY[1]), P(cx + sh + 26, cy + 1.62 * r), "r"]
    ];
    cos.innerHTML = rows.map(function (r, i) { return U.callout({ title: r[0], text: r[1] }, i, r[2], lim(r[3]), r[4], G); }).join("");
    if (show) U.$$(".co", cos).forEach(function (c) { c.classList.add("on"); });
  }

  function apply(i, instant) {
    var w = list[i]; idx = i;
    ws.forEach(function (el, n) { el.classList.toggle("on", n === i); });
    tabs.forEach(function (el, n) { el.setAttribute("aria-selected", n === i); });
    root.style.setProperty("--bg-1", w.show.bg1); root.style.setProperty("--bg-2", w.show.bg2); root.style.setProperty("--glow", w.show.glow);
    U.accent(w.show.glow); U.$("#themeColor").content = w.show.bg1;
    U.$("#scNum").textContent = "0" + (i + 1); U.$("#scName").textContent = w.name; U.$("#scPrice").textContent = U.money(w.price); U.$("#scType").textContent = w.type;
    if (!instant) sweep(w);                                                        // the first paint needs no sweep (and no forced layout)
    clearTimeout(timer); U.$$(".co", cos).forEach(function (c) { c.classList.remove("on"); });   // detail sequence: watch first, then lines one by one
    timer = setTimeout(function () { build(w, false); requestAnimationFrame(function () { requestAnimationFrame(function () { U.$$(".co", cos).forEach(function (c) { c.classList.add("on"); }); }); }); }, 520);
  }
  function show(i) {
    buildRest(); i = (i + list.length) % list.length; if (i === idx) return;
    Preload.warm(list[i].id, hs).then(function () { apply(i); });                // already decoded in nearly every case
  }

  thumbs.addEventListener("click", function (e) { var b = e.target.closest(".thumb"); if (b) show(+b.dataset.i); });
  thumbs.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { show(idx + 1); tabs[idx].focus(); } if (e.key === "ArrowLeft") { show(idx - 1); tabs[idx].focus(); }
  });
  U.$("#scPrev").onclick = function () { show(idx - 1); }; U.$("#scNext").onclick = function () { show(idx + 1); };
  var x0 = null;                                                                  // swipe to switch
  stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; }, { passive: true });
  stage.addEventListener("pointerup", function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 70) show(idx + (e.clientX < x0 ? 1 : -1)); x0 = null; }, { passive: true });
  stage.addEventListener("pointercancel", function () { x0 = null; }, { passive: true });
  U.$("#scAdd").onclick = function () { var w = list[idx]; U.addToCart({ id: w.id, name: w.name, price: w.price }); };
  U.$("#scCustomize").onclick = function () { window.Router.go(list[idx].id); };
  (bp.addEventListener ? bp.addEventListener.bind(bp, "change") : bp.addListener.bind(bp))(function () { if (idx > -1) build(list[idx], true); });

  /* ambient life: a slow specular sweep every ~9s and a barely-there 2deg turn (the shadow and highlight move against it). Only on devices that hold ~60fps with it running. */
  if (!reduce) {
    var sweepTimer = setInterval(function () { if (!document.hidden && idx > -1 && scrollY < innerHeight) sweep(list[idx], 1800); }, 9000);
    var probeStart = function () {
      home.classList.add("turn-on"); var d = [], last = performance.now(), n = 0;
      requestAnimationFrame(function f(t) { d.push(t - last); last = t; if (++n < 45) return requestAnimationFrame(f);
        d = d.slice(4).sort(function (a, b) { return a - b; }); var avg = d.reduce(function (a, b) { return a + b; }, 0) / d.length, p90 = d[Math.floor(d.length * 0.9)];
        if (avg > 19.5 || p90 > 26) home.classList.remove("turn-on"); });
    };
    setTimeout(function () { (window.requestIdleCallback || setTimeout)(probeStart); }, 3000);
  }

  window.Hero = { current: function () { return list[Math.max(0, idx)].id; } };
  ws[0].style.transition = "none"; apply(0, true);                                // first watch visible immediately (blur-up, no fade)
  requestAnimationFrame(function () { requestAnimationFrame(function () { ws[0].style.transition = ""; }); });
})();
