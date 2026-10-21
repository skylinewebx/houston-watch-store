/* 3D tilt engine. Every watch has a pose { rx: faces up(+), ry: faces right(+), rz: roll } of roughly 6-12 degrees and is shown with a real
   perspective() so it looks angled in space. On top of the pose, a gentle parallax follows:
     - the mouse (desktop), a touch drag (phones), the device gyroscope (opt-in), or page scroll (cards).
   Each rig eases toward its target with a frame-rate independent exponential smoother, writes ONE transform per frame
   (transform only, never filters) and goes completely idle once it has settled. prefers-reduced-motion = static pose. */
window.Tilt = (function () {
  var PERSP = 1100, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rigs = [];

  function Rig(el, o) {
    o = o || {}; this.el = el; this.rx = o.rangeX == null ? 5 : o.rangeX; this.ry = o.rangeY == null ? 7 : o.rangeY; this.tau = o.tau || 110;
    this.cur = { rx: 0, ry: 0, rz: 0 }; this.pose = { rx: 0, ry: 0, rz: 0 }; this.off = { x: 0, y: 0 }; this.raf = 0; this.last = 0; this.persp = o.persp || PERSP;
    rigs.push(this);
  }
  Rig.prototype.target = function () { return { rx: this.pose.rx + (reduce ? 0 : -this.off.y * this.rx), ry: this.pose.ry + (reduce ? 0 : this.off.x * this.ry), rz: this.pose.rz }; };
  Rig.prototype.write = function () {
    var c = this.cur; this.el.style.transform = "perspective(" + this.persp + "px) rotateX(" + c.rx.toFixed(2) + "deg) rotateY(" + c.ry.toFixed(2) + "deg) rotateZ(" + c.rz.toFixed(2) + "deg)";
  };
  Rig.prototype.go = function () { if (!this.raf) { this.last = performance.now(); var s = this; this.raf = requestAnimationFrame(function f(t) { s.step(t, f); }); } };
  Rig.prototype.step = function (t, f) {
    var dt = Math.min(64, t - this.last); this.last = t; var k = 1 - Math.exp(-dt / this.tau), g = this.target(), c = this.cur, d = 0, n;
    for (n in g) { var delta = g[n] - c[n]; c[n] += delta * k; d += Math.abs(delta); }
    this.write();
    if (d < 0.01) { for (n in g) c[n] = g[n]; this.write(); this.raf = 0; } else { var s = this; this.raf = requestAnimationFrame(function (tt) { s.step(tt, f); }); }
  };
  /** Ease to a new pose (instant = jump). */
  Rig.prototype.setPose = function (p, instant) { this.pose = { rx: p.rx, ry: p.ry, rz: p.rz }; if (instant || reduce) { this.cur = this.target(); this.write(); } else this.go(); };
  Rig.prototype.setOffset = function (x, y) { this.off.x = Math.max(-1, Math.min(1, x)); this.off.y = Math.max(-1, Math.min(1, y)); if (!reduce) this.go(); };
  /** Mouse parallax over `area`; touch drag = soft tilt (vertical scrolling is left alone). */
  Rig.prototype.follow = function (area) {
    var s = this, drag = null, r;
    area.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse") { r = r || area.getBoundingClientRect(); s.setOffset(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2); }
      else if (drag) { s.setOffset((e.clientX - drag.x) / 120, (e.clientY - drag.y) / 220); }
    }, { passive: true });
    area.addEventListener("pointerenter", function () { r = area.getBoundingClientRect(); }, { passive: true });
    area.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { r = null; s.setOffset(0, 0); } }, { passive: true });
    area.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") drag = { x: e.clientX, y: e.clientY }; }, { passive: true });
    ["pointerup", "pointercancel"].forEach(function (n) { area.addEventListener(n, function () { drag = null; s.setOffset(motion.x, motion.y); }, { passive: true }); });
    motion.subs.push(function (x, y) { if (!drag) s.setOffset(x, y); });
  };

  /* ---- optional gyroscope (asks permission on iOS; remembered) ---- */
  var motion = { x: 0, y: 0, on: false, subs: [], base: null };
  function onOrient(e) {
    if (e.gamma == null) return; if (!motion.base) motion.base = { g: e.gamma, b: e.beta };
    motion.x = Math.max(-1, Math.min(1, (e.gamma - motion.base.g) / 22)); motion.y = Math.max(-1, Math.min(1, (e.beta - motion.base.b) / 22));
    motion.subs.forEach(function (f) { f(motion.x, motion.y); });
  }
  motion.supported = typeof DeviceOrientationEvent !== "undefined" && matchMedia("(pointer: coarse)").matches;
  motion.enable = function () {
    var ask = typeof DeviceOrientationEvent.requestPermission === "function" ? DeviceOrientationEvent.requestPermission() : Promise.resolve("granted");
    return ask.then(function (r) { if (r !== "granted") return false; motion.on = true; motion.base = null; addEventListener("deviceorientation", onOrient, { passive: true }); try { localStorage.setItem("mw-motion", "1"); } catch (e) {} return true; }).catch(function () { return false; });
  };
  motion.disable = function () { motion.on = false; removeEventListener("deviceorientation", onOrient); motion.x = motion.y = 0; motion.subs.forEach(function (f) { f(0, 0); }); try { localStorage.removeItem("mw-motion"); } catch (e) {} };

  return { Rig: Rig, motion: motion, reduce: reduce, css: function (p, persp) { return "perspective(" + (persp || PERSP) + "px) rotateX(" + p.rx + "deg) rotateY(" + p.ry + "deg) rotateZ(" + p.rz + "deg)"; } };
})();
