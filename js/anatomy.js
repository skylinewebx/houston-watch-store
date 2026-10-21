/* Interactive anatomy.
   1. Scroll drives the opening (sticky section, progress is a RATCHET: once open it stays open).
      The watch descends, then 5 parts glide to their exploded positions in 3D.
   2. Once open, each part has a hotspot. Hover (desktop) / tap (mobile) lifts + lights that part,
      dims the rest to 35%, and shows a label (floating card + thin line on desktop, bottom card on mobile).
   Only transform / opacity are written per frame. */
(function () {
  var U = window.UI, S = window.SITE, A = S.anatomy, P = A.parts;
  var sec = U.$("#anatomy"), scene = U.$("#xscene"), card = U.$("#xcard");
  var bp = matchMedia("(min-width: 900px)"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* label card centres on desktop (fractions of the scene) — placed in free space around each part */
  var SLOT = { dial: [0.27, 0.8], frame: [0.14, 0.62], crown: [0.86, 0.22], "strap-top": [0.45, 0.12], "strap-bottom": [0.5, 0.88] };

  scene.innerHTML = '<div class="xrig" id="xrig"><div class="xbox" id="xbox"><div class="xdrop" id="xdrop">' + P.map(function (p) {
    var b = p.bbox, bw = b[2] - b[0], bh = b[3] - b[1], pw = Math.max(bw + 0.03, 0.11), ph = Math.max(bh + 0.03, 0.09);   // generous hit area
    var hx = (b[0] + b[2]) / 2 - pw / 2, hy = (b[1] + b[3]) / 2 - ph / 2, f = function (v) { return (v * 100).toFixed(2) + "%"; };
    return '<div class="part" data-id="' + p.id + '" style="--bx0:' + b[0] + ";--by1:" + b[3] + ";--bw:" + bw + ";transform-origin:" + f((b[0] + b[2]) / 2) + " " + f((b[1] + b[3]) / 2) + '">' +
      '<div class="lift"><img src="' + p.src + '" width="1200" height="1607" alt="" decoding="async"><i class="ghost" style="left:' + f(hx) + ";top:" + f(hy) + ";width:" + f(pw) + ";height:" + f(ph) + '"></i></div></div>';
  }).join("") + '</div></div></div><div class="hots" id="hots">' + P.map(function (p) { return '<button class="hot" data-id="' + p.id + '" aria-label="' + U.esc(p.title) + '"></button>'; }).join("") +
    '</div><div class="xline" id="xline"></div><div class="xlabel" id="xlabel"></div><div class="xhint">Hover a part to explore</div>';

  var hots = {}, rig = U.$("#xrig"), box = U.$("#xbox"), drop = U.$("#xdrop"), line = U.$("#xline"), label = U.$("#xlabel");
  var els = {}; U.$$(".part", scene).forEach(function (e) { els[e.dataset.id] = e; }); U.$$(".hot", scene).forEach(function (e) { hots[e.dataset.id] = e; });
  var lay = {}, top = 0, span = 1, maxP = 0, lastP = -1, raf = 0, opened = false, cur = null, leaveT;

  /* ---- layout: translation (in % of the layer box) that carries each part from "assembled" to its target ---- */
  function layout() {
    var L = A.layout[bp.matches ? "desktop" : "mobile"], sw = scene.offsetWidth, sh = scene.offsetHeight, wb = box.offsetWidth, hb = box.offsetHeight;
    P.forEach(function (p) {
      var b = p.bbox, ox = ((b[0] + b[2]) / 2 - 0.5) * wb, oy = ((b[1] + b[3]) / 2 - 0.5) * hb, t = L[p.id];
      lay[p.id] = { x: ((t[0] - 0.5) * sw - ox) / wb * 100, y: ((t[1] - 0.5) * sh - oy) / hb * 100 };
    });
    lastP = -1; measure(); request();
  }
  function measure() { top = sec.getBoundingClientRect().top + scrollY; span = Math.max(1, sec.offsetHeight - innerHeight); }
  var seg = function (p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  function draw() {
    raf = 0;
    var p = reduce ? 1 : Math.max(maxP, Math.min(1, ((scrollY - top) / span) * 1.1));       // ratchet
    maxP = p; if (p === lastP) return; lastP = p;
    var d = ease(seg(p, A.descent[0], A.descent[1]));
    drop.style.transform = "translate3d(0," + (-(1 - d) * innerHeight * 1.1).toFixed(1) + "px,0)";
    drop.style.opacity = Math.min(1, d * 3).toFixed(2);
    P.forEach(function (pt) {
      var t = ease(seg(p, pt.at[0], pt.at[1])), l = lay[pt.id];
      els[pt.id].style.transform = "translate3d(" + (l.x * t).toFixed(2) + "%," + (l.y * t).toFixed(2) + "%," + (pt.z * t).toFixed(1) + "px) rotateZ(" + (pt.rz * t).toFixed(2) + "deg) scale(" + (1 + (pt.s - 1) * t).toFixed(3) + ")";
    });
    if (!opened && p >= A.hotAt) { opened = true; rig.classList.add("open"); scene.classList.add("open"); requestAnimationFrame(function () { placeHots(); }); idleCard(); }
  }
  function request() { if (!raf) raf = requestAnimationFrame(draw); }

  /** Hotspots live in a flat overlay (never inside the 3D layers, so lifting a part cannot move its own hit area). Measured from the parts' resting positions. */
  function placeHots() {
    if (!opened || cur) return; var sr = scene.getBoundingClientRect();
    P.forEach(function (p) { var r = U.$(".ghost", els[p.id]).getBoundingClientRect(), h = hots[p.id]; h.style.cssText = "left:" + (r.left - sr.left).toFixed(1) + "px;top:" + (r.top - sr.top).toFixed(1) + "px;width:" + r.width.toFixed(1) + "px;height:" + r.height.toFixed(1) + "px"; });
  }

  /* ---- hotspot interaction ---- */
  function partById(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function idleCard() { card.className = "xcard idle"; card.textContent = opened ? "Tap a part to explore it." : "Scroll to open the watch, then tap a part."; }

  function activate(id) {
    clearTimeout(leaveT); if (cur === id) return; cur = id;
    rig.classList.add("has", "touched"); scene.classList.add("touched");
    Object.keys(els).forEach(function (k) { els[k].classList.toggle("on", k === id); });
    var p = partById(id), html = "<b>" + U.esc(p.title) + "</b><strong>" + U.esc(p.material) + "</strong><span>" + U.esc(p.finish) + "</span><em>" + U.esc(p.detail) + "</em>";
    card.className = "xcard"; card.innerHTML = html;
    if (bp.matches) placeLabel(id, html);
  }
  function clear() {
    if (!cur) return; cur = null; rig.classList.remove("has");
    Object.keys(els).forEach(function (k) { els[k].classList.remove("on"); });
    label.classList.remove("on"); line.classList.remove("on"); idleCard();
  }
  /** Desktop label: card in free space + a thin line from the part's centre to the card's nearest edge. */
  function placeLabel(id, html) {
    var sr = scene.getBoundingClientRect(), hr = hots[id].getBoundingClientRect();
    var pc = { x: hr.left + hr.width / 2 - sr.left, y: hr.top + hr.height / 2 - sr.top };
    label.innerHTML = html;
    var cw = label.offsetWidth, ch = label.offsetHeight, s = SLOT[id];
    var cx = Math.min(sr.width - cw - 8, Math.max(8, s[0] * sr.width - cw / 2)), cy = Math.min(sr.height - ch - 8, Math.max(8, s[1] * sr.height - ch / 2));
    var nx = Math.min(cx + cw, Math.max(cx, pc.x)), ny = Math.min(cy + ch, Math.max(cy, pc.y));      // nearest point on the card
    var dx = nx - pc.x, dy = ny - pc.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    label.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
    line.style.width = len.toFixed(1) + "px";
    line.style.transform = "translate3d(" + pc.x.toFixed(1) + "px," + pc.y.toFixed(1) + "px,0) rotate(" + ang.toFixed(2) + "deg)";
    label.classList.add("on"); line.classList.add("on");
  }

  scene.addEventListener("pointerover", function (e) { var h = e.target.closest(".hot"); if (h && e.pointerType === "mouse") activate(h.dataset.id); });
  scene.addEventListener("pointerout", function (e) {
    var h = e.target.closest(".hot"); if (h && e.pointerType === "mouse") { clearTimeout(leaveT); leaveT = setTimeout(clear, 70); }
  });
  scene.addEventListener("click", function (e) {                  // tap (touch) toggles; keyboard Enter/Space too
    var h = e.target.closest(".hot");
    if (h) { if (cur === h.dataset.id && e.detail !== 0 && e.pointerType !== "mouse") clear(); else activate(h.dataset.id); }
    else clear();
  });
  scene.addEventListener("focusin", function (e) { var h = e.target.closest(".hot"); if (h && h.matches(":focus-visible")) activate(h.dataset.id); });   // keyboard only: a tap also focuses the button and would double-toggle
  scene.addEventListener("focusout", function (e) { var r = e.relatedTarget; if (!r || !r.closest || !r.closest(".hot")) leaveT = setTimeout(clear, 70); });

  layout(); draw();
  var pl = function () { if (opened) { var was = cur; if (!was) placeHots(); } };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", function () { layout(); requestAnimationFrame(pl); if (cur) { var c = cur; cur = null; activate(c); } });
  addEventListener("load", function () { layout(); requestAnimationFrame(pl); });
  (bp.addEventListener ? bp.addEventListener.bind(bp, "change") : bp.addListener.bind(bp))(function () { clear(); layout(); requestAnimationFrame(pl); });
  Preload.near(sec, function () { Preload.many(P.map(function (p) { return p.src; })); }, 2500);   // only when the section is about to be reached
})();
