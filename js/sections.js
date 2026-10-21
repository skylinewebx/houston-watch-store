/* Reviews, store details, ambient boutique video, subtle fade-ins. */
(function () {
  var U = window.UI, S = window.SITE, $ = U.$;

  /* reviews */
  var R = S.reviews, avg = R.reduce(function (a, r) { return a + r.stars; }, 0) / R.length;
  var star = function (n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); };
  $("#revAvg").textContent = avg.toFixed(1); $("#revStars").textContent = star(Math.round(avg)); $("#revCount").textContent = R.length + " reviews";
  $("#revBars").innerHTML = [5, 4, 3, 2, 1].map(function (n) {
    var c = R.filter(function (r) { return r.stars === n; }).length;
    return "<div><span>" + n + '★</span><em><i style="transform:scaleX(' + (c / R.length) + ')"></i></em><span>' + c + "</span></div>";
  }).join("");
  $("#revTrack").innerHTML = R.map(function (r) {
    var ini = r.name.split(" ").map(function (s) { return s[0]; }).join("");
    return '<article class="rev"><div class="stars" aria-label="' + r.stars + ' out of 5">' + star(r.stars) + "</div><p>“" + U.esc(r.text) + "”</p>" +
      '<div class="who"><span class="av" aria-hidden="true">' + U.esc(ini) + "</span><div>" + U.esc(r.name) + "<small>" + U.esc(r.area) + ", TX</small></div></div></article>";
  }).join("");
  var track = $("#revTrack");
  $("#revPrev").onclick = function () { track.scrollBy({ left: -track.clientWidth * 0.5, behavior: "smooth" }); };
  $("#revNext").onclick = function () { track.scrollBy({ left: track.clientWidth * 0.5, behavior: "smooth" }); };

  /* store */
  var s = S.store;
  $("#stAddr").innerHTML = U.esc(s.address).replace(", ", "<br>");
  var ph = $("#stPhone"); ph.textContent = s.phone; ph.href = "tel:" + s.phone.replace(/[^\d+]/g, "");
  $("#stHours").innerHTML = s.hours.map(function (h) { return "<div><dt>" + h[0] + "</dt><dd>" + h[1] + "</dd></div>"; }).join("");
  $("#stDir").href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(s.address);

  /* ambient boutique video: poster always; video only when it is cheap + allowed, paused off-screen */
  var poster = $("#storePoster"), vid = $("#storeVideo");
  poster.src = S.video.poster;
  var c = navigator.connection || {}, slow = c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || "");
  var okMotion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (okMotion && !slow && "IntersectionObserver" in window) {
    var loaded = false;
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on && !loaded) { loaded = true; vid.src = S.video.src; vid.playbackRate = 0.8; vid.addEventListener("playing", function () { vid.classList.add("on"); }, { once: true }); }
      if (on) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else vid.pause();
    }, { rootMargin: "100px" }).observe($("#store"));
  }

  /* subtle fade-in (opacity only) */
  var io = "IntersectionObserver" in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  U.$$(".rev-top, .store-grid, .reviews .h2, .store .h2, .collection .h2").forEach(function (el) {
    el.classList.add("reveal"); io ? io.observe(el) : el.classList.add("in");
  });
})();
