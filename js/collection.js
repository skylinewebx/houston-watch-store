/* Collection: dark glass cards. Each watch keeps its own 3D pose; the card tilts toward the cursor (desktop, with a counter-parallax on
   the watch for depth) or follows scroll position (phones). Light sweep, staggered fade-and-rise. A card is revealed only once its
   image is decoded, so there are never empty boxes. All motion is transform-only, one rAF per frame. */
(function () {
  var U = window.UI, S = window.SITE, grid = U.$("#grid");
  var reduce = Tilt.reduce, hover = matchMedia("(hover: hover)").matches, wide = function () { return innerWidth >= 900; };

  grid.innerHTML = S.watches.map(function (w, i) {
    var p = w.pose, v = "--prx:" + (p.rx * 0.85).toFixed(1) + "deg;--pry:" + (p.ry * 0.85).toFixed(1) + "deg;--prz:" + (p.rz * 0.85).toFixed(1) + "deg";
    return '<article class="card" data-i="' + i + '" style="--tone:' + w.tone + '"><div class="card-in"><div class="glow"></div><div class="pic">' +
      '<button class="icon-btn heart" data-heart="' + w.id + '" aria-pressed="false" aria-label="Save ' + U.esc(w.name) + ' to wishlist"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>' +
      '<div class="ti" style="' + v + '">' + U.shadow(w.id) + U.im(w.id, w.name + " " + w.type + " watch", { sizes: Preload.cardSizes, lazy: true }) + '</div><div class="shine"></div></div>' +
      '<p class="type">' + U.esc(w.type) + '</p><h3>' + U.esc(w.name) + '</h3><p class="d">' + U.esc(w.desc) + '</p><p class="price">' + U.money(w.price) + "</p>" +
      '<button class="btn btn-outline" data-pick="' + w.id + '">Customize</button></div></article>';
  }).join("");
  U.syncHearts();

  /* open the dedicated customizer for exactly this watch (the card's image flies into the preview) */
  grid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]"); if (!b) return;
    var card = b.closest(".card"); window.Router.go(b.dataset.pick, { card: card, index: +card.dataset.i });
  });

  /* staggered reveal once the card is near the viewport AND its image has decoded */
  var cards = U.$$(".card", grid), vis = new Set();
  var io = "IntersectionObserver" in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var c = e.target; if (e.isIntersecting) vis.add(c); else vis.delete(c);
      if (!e.isIntersecting || c.__shown) return; c.__shown = true;
      var col = +c.dataset.i % (wide() ? 4 : 2); c.style.setProperty("--d", (col * 0.08).toFixed(2) + "s");
      var w = S.watches[+c.dataset.i]; Preload.warm(w.id, Preload.cardSizes).then(function () { c.classList.add("in"); });
    });
    if (!hover) scrollTilt();
  }, { rootMargin: "0px 0px -6% 0px", threshold: [0, 0.2, 0.6] });
  cards.forEach(function (c) { io ? io.observe(c) : c.classList.add("in"); });

  /* desktop: tilt toward the pointer (mouse only) */
  if (!reduce && hover) {
    var raf = 0, tgt = null, px = 0, py = 0;
    var apply = function () {
      raf = 0; if (!tgt) return; var r = tgt.getBoundingClientRect(), x = (px - r.left) / r.width - 0.5, y = (py - r.top) / r.height - 0.5, ci = tgt.firstElementChild, ti = ci.querySelector(".ti");
      ci.style.setProperty("--ry", (x * 7).toFixed(2) + "deg"); ci.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
      ti.style.setProperty("--py", (x * 6).toFixed(2) + "deg"); ti.style.setProperty("--px", (-y * 5).toFixed(2) + "deg");
    };
    grid.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; var c = e.target.closest(".card"); if (!c) return; tgt = c; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    grid.addEventListener("pointerout", function (e) {
      var c = e.target.closest(".card"); if (c && !c.contains(e.relatedTarget)) { var ci = c.firstElementChild; ["--rx", "--ry"].forEach(function (k) { ci.style.setProperty(k, "0deg"); }); var ti = ci.querySelector(".ti"); ["--px", "--py"].forEach(function (k) { ti.style.setProperty(k, "0deg"); }); if (tgt === c) tgt = null; }
    }, { passive: true });
  }
  /* phones: a soft tilt that follows the card's position in the viewport */
  var sraf = 0;
  function scrollTilt() {
    if (reduce || hover || sraf) return;
    sraf = requestAnimationFrame(function () {
      sraf = 0; var h = innerHeight;
      vis.forEach(function (c) { var r = c.getBoundingClientRect(), t = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - h / 2) / (h / 2))), ti = c.querySelector(".ti"); ti.style.setProperty("--px", (-t * 5).toFixed(2) + "deg"); ti.style.setProperty("--py", (t * 3).toFixed(2) + "deg"); });
    });
  }
  if (!hover && !reduce) addEventListener("scroll", scrollTilt, { passive: true });
  Preload.near(grid, function () { S.watches.forEach(function (w) { Preload.warm(w.id, Preload.cardSizes); }); }, 3500);
})();
