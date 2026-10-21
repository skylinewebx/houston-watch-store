/* Dedicated full-page configurator for ONE watch, routed by hash:  #/customize/<watch-id>
   - Router: opening a watch pushes the route (so the back button works); a direct link / refresh works too.
   - Shared-element transition: the card's photo flies (transform only, ~440ms) into the large preview
     while the panel enters with a per-card style (left / right / up / down / scale).
   - Preview: a straight, still photo + canvas recolour (dial and bezel/case independently) + code-drawn straps. */
(function () {
  var U = window.UI, S = window.SITE, $ = U.$, I = S.img;
  var view = $("#cview"), stage = $("#cvStage"), inner = $("#cvInner"), photo = $("#cvPhoto"), shd = $("#cvShadow"), strapEl = $("#cvStrap"), cvs = $("#cvCanvas");
  var VARIANTS = ["left", "right", "up", "scale", "right", "left", "down", "scale", "up", "left"];
  var st = { w: null, dial: 0, frame: 0, strap: "photo", sc: 0 }, eng = null, ready = false, token = 0, openFrom = null, pushed = false, lastFocus = null, scrollY0 = 0, flyer = null;

  function shade(h, f) { return "#" + (function (c) { return c.map(function (v) { v = f >= 0 ? v + (255 - v) * f : v * (1 + f); return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); })([1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); })); }

  /* ---------------- straps (SVG drawn in a 600x900 design space, mapped onto the photo's case) ---------------- */
  function strapBody(type, color) {
    var T = S.straps[type], hex = color[1], defs = '<linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="' + shade(hex, -.42) + '"/><stop offset=".5" stop-color="' + shade(hex, .16) + '"/><stop offset="1" stop-color="' + shade(hex, -.42) + '"/></linearGradient>';
    var parts = [[-140, 430], [470, 838]], body = "", y;
    function links(y0) {
      var h = Math.min(38, 838 - y0);
      return '<rect x="212" y="' + y0 + '" width="32" height="' + h + '" rx="6" fill="url(#sg)"/><rect x="250" y="' + y0 + '" width="100" height="' + h + '" rx="6" fill="url(#sg)"/><rect x="356" y="' + y0 + '" width="32" height="' + h + '" rx="6" fill="url(#sg)"/>';
    }
    if (!T.metal) {
      if (type === "canvas") defs += '<pattern id="wv" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#000" stroke-opacity=".28"/><path d="M0 0L6 6" stroke="#fff" stroke-opacity=".08"/></pattern>';
      parts.forEach(function (p) {
        var d = "M212 " + p[0] + " H388 L394 " + p[1] + " H206 Z";
        body += '<path d="' + d + '" fill="url(#sg)"/>';
        if (type === "canvas") body += '<path d="' + d + '" fill="url(#wv)"/>';
        if (type === "leather") body += '<path d="M224 ' + p[0] + " L218 " + p[1] + "M376 " + p[0] + " L382 " + p[1] + '" stroke="' + shade(hex, .5) + '" stroke-width="2" stroke-dasharray="9 7" opacity=".6"/>';
        if (type === "rubber") for (y = p[0] + 10; y < p[1]; y += 16) body += '<path d="M212 ' + y + ' H388" stroke="#000" stroke-opacity=".3" stroke-width="3"/>';
      });
      for (y = 640; y < 760; y += 50) body += '<circle cx="300" cy="' + y + '" r="6" fill="#000" opacity=".55"/>';
    } else {
      for (y = 430; y > -160; y -= 42) body += links(y - 42);
      for (y = 470; y < 838; y += 42) body += links(y);
    }
    var cl = T.metal ? hex : "#c3c8cf";
    body += '<defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="' + shade(cl, -.45) + '"/><stop offset=".5" stop-color="' + shade(cl, .25) + '"/><stop offset="1" stop-color="' + shade(cl, -.45) + '"/></linearGradient></defs>' +
      '<rect x="198" y="834" width="204" height="58" rx="10" fill="url(#cg)"/><rect x="214" y="846" width="172" height="34" rx="6" fill="#000" opacity=".28"/>';
    return "<defs>" + defs + "</defs>" + body;
  }
  function drawStrap() {
    var w = st.w, k = w.r / 142, sx = w.strapHalf / (94 * k);
    strapEl.innerHTML = st.strap === "photo" ? "" : '<svg viewBox="0 0 ' + I.w + " " + I.h + '" xmlns="http://www.w3.org/2000/svg"><g transform="translate(' + (w.cx - 300 * k * sx) + " " + (w.cy - 450 * k) + ") scale(" + (k * sx) + " " + k + ')">' + strapBody(st.strap, S.straps[st.strap].colors[st.sc]) + "</g></svg>";
  }

  /* ---------------- preview layout + recolour ---------------- */
  function layout() {
    var w = st.w; if (!w) return; var sw = stage.clientWidth, sh = stage.clientHeight, r = w.r;
    var k = Math.min(sw / (3.3 * r), sh / (3.0 * r)), fx = w.cx + 0.18 * r;
    inner.style.width = Math.round(I.w * k) + "px"; inner.style.height = Math.round(I.h * k) + "px";                       // whole pixels: no sub-pixel softening at rest
    inner.style.left = Math.round(sw / 2 - fx * k) + "px"; inner.style.top = Math.round(sh / 2 - w.cy * k) + "px";
    inner.style.transformOrigin = Math.round(w.cx * k) + "px " + Math.round(w.cy * k) + "px";
  }
  function dialHex() { return S.dialColors[st.dial].hex; } function frameHex() { return S.frameColors[st.frame].hex; }
  function redraw() {
    var generated = st.strap !== "photo";
    if (eng && ready) { eng.draw(dialHex(), frameHex(), generated); cvs.style.visibility = "visible"; photo.style.visibility = "hidden"; }
    // page glow follows the chosen dial colour
    view.style.setProperty("--cglow", dialHex() ? U.mix(dialHex(), "#000000", 0.35) : st.w.tone);
  }

  /* ---------------- controls ---------------- */
  function swatches(el, arr, key) {
    el.innerHTML = arr.map(function (c, i) {
      var hex = Array.isArray(c) ? c[1] : c.hex, name = Array.isArray(c) ? c[0] : c.name;
      return '<button class="sw" aria-label="' + name + '" title="' + name + '" aria-pressed="' + (st[key] === i) + '" data-i="' + i + '"><i class="' + (hex ? "" : "orig") + '" style="' + (hex ? "background:" + hex : "") + '"></i></button>';
    }).join("");
  }
  function strapColors() { return S.straps[st.strap].colors; }
  function parts() {
    var D = S.dialColors[st.dial], F = S.frameColors[st.frame], T = S.straps[st.strap];
    return [["Watch", st.w.name, st.w.price], ["Dial", D.name, D.d], ["Bezel & case", F.name, F.d], ["Strap", T.label + (strapColors()[st.sc] ? " · " + strapColors()[st.sc][0] : ""), T.d]];
  }
  function total() { return parts().reduce(function (a, p) { return a + p[2]; }, 0); }
  function labels() {
    $("#dialLbl").textContent = S.dialColors[st.dial].name; $("#frameLbl").textContent = S.frameColors[st.frame].name;
    var c = strapColors()[st.sc]; $("#strapLbl").textContent = S.straps[st.strap].label + (c ? " · " + c[0] : "");
    $("#cvBd").innerHTML = parts().map(function (p, i) { return "<div><dt>" + U.esc(i ? p[0] : "Base") + "<small>" + U.esc(p[1]) + "</small></dt><dd>" + (i && !p[2] ? "Included" : (i ? "+ " : "") + U.money(p[2])) + "</dd></div>"; }).join("") +
      '<div class="tot"><dt>Total</dt><dd>' + U.money(total()) + "</dd></div>";
    $("#cvAdd").textContent = "Add to cart · " + U.money(total());
  }
  function press(el, i) { U.$$(".sw", el).forEach(function (b, n) { b.setAttribute("aria-pressed", n === i); }); }

  /** Load a watch into the view: its own photo, name, description and base price. */
  function load(id) {
    var w = U.byId(id); st.w = w; st.dial = 0; st.frame = 0; st.strap = "photo"; st.sc = 0; ready = false;
    $("#cvType").textContent = w.type; $("#cvName").textContent = w.name; $("#cvDesc").textContent = w.desc; $("#cvBase").textContent = U.money(w.price);
    $("#cvTag").textContent = w.name; document.title = w.name + " — Customize · Meridian";
    var mid = Preload.url(id, Preload.pick(id, 960)); layout(); var need = Math.round((parseFloat(inner.style.width) || 700) * (window.devicePixelRatio || 1)), top = Preload.url(id, Preload.pick(id, need));   // native density of the preview, never more than the source
    photo.alt = w.name; photo.src = mid; photo.style.visibility = "visible"; cvs.style.visibility = "hidden"; shd.src = S.img.base + id + "-shadow.webp";
    $("#strapTypes").innerHTML = Object.keys(S.straps).map(function (k) { return '<button class="chip" data-s="' + k + '" aria-pressed="' + (k === "photo") + '">' + S.straps[k].label + "</button>"; }).join("");
    swatches($("#dialSw"), S.dialColors, "dial"); swatches($("#frameSw"), S.frameColors, "frame"); swatches($("#strapSw"), strapColors(), "sc");
    drawStrap(); labels(); layout();
    var my = ++token, im = new Image(); im.src = top;
    return im.decode().then(function () {                    // native-resolution photo -> GPU texture (recolour engine)
      if (my !== token) return; if (!eng) eng = Recolor.create(cvs);
      return eng.load(im, w).then(function () { if (my !== token) return; ready = true; redraw(); });
    }).catch(function () {});
  }
  function reset() { var id = st.w.id; load(id); U.toast("Reset to the original watch"); }

  view.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.id === "cvBack" || b.id === "cvBack2") return Router.back();
    if (b.id === "cvReset") return reset();
    if (b.id === "cvAdd") { var c = strapColors()[st.sc]; return U.addToCart({ id: st.w.id, name: st.w.name, price: total(),
      opts: "Dial " + S.dialColors[st.dial].name + " · Bezel " + S.frameColors[st.frame].name + " · " + S.straps[st.strap].label + (c ? " " + c[0] : "") }); }
    if (b.dataset.s) {
      st.strap = b.dataset.s; st.sc = 0; U.$$(".chip", view).forEach(function (c) { c.setAttribute("aria-pressed", c === b); });
      swatches($("#strapSw"), strapColors(), "sc"); drawStrap(); redraw(); return labels();
    }
    if (b.classList.contains("sw")) {
      var i = +b.dataset.i, grp = b.parentNode.id;
      if (grp === "dialSw") st.dial = i; else if (grp === "frameSw") st.frame = i; else { st.sc = i; drawStrap(); }
      press(b.parentNode, i); redraw(); labels();
    }
  });
  addEventListener("resize", function () { if (view.classList.contains("open")) layout(); });

  /* ---------------- open / close with the shared-element flight ---------------- */
  function fly(from) {
    var pic = from.card.querySelector(".pic"), img = from.card.querySelector(".pic img");
    var a = pic.getBoundingClientRect(), t = inner.getBoundingClientRect();
    if (!a.width || !t.width) { inner.style.opacity = 1; return; }
    flyer = document.createElement("img"); flyer.className = "flyer"; flyer.alt = ""; flyer.src = img.currentSrc || img.src;
    flyer.style.cssText = "left:" + t.left + "px;top:" + t.top + "px;width:" + t.width + "px;height:" + t.height + "px";
    document.body.appendChild(flyer); inner.style.opacity = 0;
    var s0 = a.width * 0.96 / t.width, dx = (a.left + a.width / 2) - (t.left + t.width / 2), dy = (a.top + a.height / 2) - (t.top + t.height / 2);
    var an = flyer.animate([{ transform: "translate3d(" + dx + "px," + dy + "px,0) scale(" + s0 + ")" }, { transform: "translate3d(0,0,0) scale(1)" }], { duration: 440, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" });
    an.onfinish = an.oncancel = function () { inner.style.opacity = 1; if (flyer) { flyer.remove(); flyer = null; } };
  }
  function openView(id, from) {
    lastFocus = document.activeElement; scrollY0 = scrollY;
    VARIANTS.forEach(function (v) { view.classList.remove("v-" + v); });
    view.classList.add("v-" + VARIANTS[((from && from.index) || 0) % VARIANTS.length]);
    view.scrollTop = 0; view.setAttribute("aria-hidden", "false"); document.documentElement.classList.add("lock");
    inner.style.opacity = from && from.card ? 0 : 1;
    var p = load(id);
    view.classList.remove("open"); void view.offsetWidth; view.classList.add("fading", "open");
    layout();
    if (from && from.card && !(window.Tilt && Tilt.reduce) && !matchMedia("(prefers-reduced-motion: reduce)").matches) { Promise.race([Preload.load(photo.src), new Promise(function (r) { setTimeout(r, 140); })]).then(function () { layout(); fly(from); }); }
    else { inner.style.opacity = 1; }
    $("#cvBack").focus({ preventScroll: true }); return p;
  }
  function closeView() {
    view.classList.remove("open"); view.setAttribute("aria-hidden", "true"); document.documentElement.classList.remove("lock");
    if (flyer) { flyer.remove(); flyer = null; } inner.style.opacity = 1; document.title = "Meridian — Luxury Watches, Houston TX";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  var Router = {
    /** Go to the dedicated page of a watch (pushes history). */
    go: function (id, from) { openFrom = from || null; pushed = true; if (location.hash === "#/customize/" + id) route(); else location.hash = "#/customize/" + id; },
    back: function () { if (pushed) { pushed = false; history.back(); } else { history.replaceState(null, "", "#collection"); route(); var c = document.getElementById("collection"); c && c.scrollIntoView(); } }
  };
  function route() {
    var m = /^#\/customize(?:\/([\w-]+))?$/.exec(location.hash), open = view.classList.contains("open");
    if (m) {
      var id = m[1] || (window.Hero ? Hero.current() : S.watches[0].id);
      if (!U.byId(id)) { history.replaceState(null, "", "#collection"); if (open) closeView(); return; }
      if (!m[1]) history.replaceState(null, "", "#/customize/" + id);
      if (!open) { openView(id, openFrom); openFrom = null; } else if (st.w.id !== id) { load(id); view.scrollTop = 0; }
    } else if (open) closeView();
  }
  addEventListener("hashchange", route);
  addEventListener("keydown", function (e) { if (e.key === "Escape" && view.classList.contains("open") && !$("#drawer").classList.contains("open")) Router.back(); });
  cvs.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ready = false; });                                        // GPU reset: rebuild instead of showing a dead canvas
  cvs.addEventListener("webglcontextrestored", function () { if (view.classList.contains("open") && st.w) { eng = null; load(st.w.id); } });
  window.Router = Router;
  route();                                                   // direct link / refresh on #/customize/<id>
  Preload.near($("#collection"), function () { S.watches.slice(0, 3).forEach(function (w) { Preload.load(Preload.url(w.id, Preload.pick(w.id, 960))); }); }, 1200);
})();
