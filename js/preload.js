/* Image delivery + preloading.
   Every watch ships as an AVIF + WebP ladder (assets/watches/<id>-<width>.avif|webp, native resolution is the top rung,
   nothing is ever upscaled). Markup uses <picture> with srcset/sizes so each device gets the smallest crisp file for
   its size x pixel density. Critical images are hinted in <head>; everything else is fetched AND decoded early,
   using the very same <picture> so the cached/decoded copy is the one that gets painted. */
(function () {
  var S = window.SITE, I = S.img, cache = {}, by = {};
  S.watches.forEach(function (w) { by[w.id] = w; });
  var saver = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));

  function widths(id) { return by[id].widths; }
  /** URL of one rung of the ladder (default WebP; pass "avif" for AVIF). */
  function url(id, w, ext) { return I.base + id + "-" + w + "." + (ext || "webp"); }
  /** Smallest available rung that is >= w (css px * dpr), else the largest (native) one. */
  function pick(id, w) { var l = widths(id); for (var i = 0; i < l.length; i++) if (l[i] >= w) return l[i]; return l[l.length - 1]; }
  function srcset(id, ext) { return widths(id).map(function (w) { return url(id, w, ext) + " " + w + "w"; }).join(", "); }

  /** <picture> markup: AVIF -> WebP, srcset + sizes, explicit width/height, blur-up placeholder, async decode. */
  function pic(id, o) {
    o = o || {}; var w = by[id], sizes = o.sizes || "100vw", esc = function (s) { return String(s).replace(/"/g, "&quot;"); };
    var fb = url(id, pick(id, o.fallbackW || 960));
    return '<picture><source type="image/avif" srcset="' + srcset(id, "avif") + '" sizes="' + sizes + '"><source type="image/webp" srcset="' + srcset(id, "webp") + '" sizes="' + sizes + '">' +
      '<img class="' + (o.cls || "") + '" src="' + fb + '" width="' + I.w + '" height="' + I.h + '" alt="' + esc(o.alt || "") + '" decoding="async"' +
      (o.lazy ? ' loading="lazy"' : "") + (o.high ? ' fetchpriority="high"' : "") +
      (w && w.lqip ? ' style="background:url(' + w.lqip + ') 0 0/100% 100% no-repeat"' : "") + ' onload="this.style.background=\'none\'"></picture>';
  }

  /** Fetch + decode a plain URL once. */
  function load(u) {
    if (cache[u]) return cache[u];
    var im = new Image(); im.decoding = "async"; im.src = u;
    return (cache[u] = (im.decode ? im.decode() : new Promise(function (r) { im.onload = r; })).catch(function () {}));
  }
  /** Fetch + decode the exact <picture> candidate the page will paint (same sizes + dpr => same file => cache hit). */
  var box;
  function warm(id, sizes, fallbackW) {
    var k = id + "|" + sizes; if (cache[k]) return cache[k];
    if (!box) { box = document.createElement("div"); box.setAttribute("aria-hidden", "true"); box.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden"; document.documentElement.appendChild(box); }
    var d = document.createElement("div"); d.innerHTML = pic(id, { sizes: sizes, fallbackW: fallbackW }); var p = d.firstChild, img = p.querySelector("img");
    box.appendChild(p);                                       // must be connected for <picture> source selection to run
    var done = (img.decode ? img.decode() : new Promise(function (r) { img.onload = r; })).catch(function () {});
    var capped = Promise.race([done, new Promise(function (r) { setTimeout(r, 1500); })]);   // a slow network must never block the UI
    done.then(function () { setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 4000); });   // keep it decoded a moment, then free the node
    return (cache[k] = capped);
  }
  function many(list) { return Promise.all(list.map(load)); }
  function near(el, fn, margin) {
    if (!("IntersectionObserver" in window)) return fn();
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { fn(); io.disconnect(); } }, { rootMargin: (margin || 1500) + "px 0px" });
    io.observe(el);
  }

  /* sizes strings (CSS px) - kept in one place so markup and warm-up agree */
  var wide = function () { return innerWidth >= 900; };
  var HERO_SIZES = "(min-width: 900px) 520px, 90vw";          // identical to the static <picture> in index.html so the preloaded/decoded file is the one painted
  function heroSizes() { return HERO_SIZES; }
  var cardSizes = "(min-width: 900px) 280px, 46vw", thumbSizes = "80px";

  // 2. everything else in idle time: other hero watches, thumbnails, then the collection cards
  var idle = window.requestIdleCallback || function (f) { setTimeout(f, 200); };
  function startWarm() {
    S.watches.slice(0, 5).forEach(function (w) { warm(w.id, thumbSizes); });
    var q = S.watches.slice(1, 5).map(function (w) { return function () { return warm(w.id, heroSizes()); }; });     // one big decode at a time, never a burst
    if (!saver) S.watches.forEach(function (w) { q.push(function () { return warm(w.id, cardSizes); }); });
    (function next() { var f = q.shift(); if (f) f().then(function () { idle(next); }); })();
  }
  // never compete with the LCP image: start 2.5s after the page has loaded and the browser is idle
  function arm() { setTimeout(function () { idle(startWarm); }, 2500); }
  if (document.readyState === "complete") arm(); else addEventListener("load", arm);

  window.Preload = { url: url, pick: pick, pic: pic, load: load, many: many, warm: warm, near: near, widths: widths, heroSizes: heroSizes, cardSizes: cardSizes, thumbSizes: thumbSizes, saver: !!saver };
})();
