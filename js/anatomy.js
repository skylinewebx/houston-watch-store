/* Anatomy: ONE still composition. The Opus Diver stands straight and assembled; four hairlines point at the strap, dial, frame and crown.
   Lines + labels fade in one after another, once, when the section scrolls into view. No pinning, no scroll-driven motion.
   Desktop: labels left / right of the watch, hover brightens one and dims the rest. Mobile: labels sit above and below the watch. */
(function () {
  var U = window.UI, S = window.SITE, A = S.anatomy, w = U.byId(A.watch), root = U.$("#xs");
  var bp = matchMedia("(min-width: 900px)"), I = S.img;
  var ns = "http://www.w3.org/2000/svg";

  root.innerHTML = '<div class="xw">' + U.shadow(w.id) + U.im(w.id, w.name + " — assembled", { sizes: "(min-width: 900px) 420px, 62vw" }) + '</div><svg class="xl" aria-hidden="true"></svg>' +
    A.parts.map(function (p, i) {
      return '<div class="al" data-id="' + p.id + '" style="--n:' + i + '" tabindex="0"><b>' + U.esc(p.title) + "</b>" + p.lines.map(function (l) { return "<span>" + U.esc(l) + "</span>"; }).join("") + '</div><i class="ad" data-id="' + p.id + '" style="--n:' + i + '"></i>';
    }).join("");
  var xw = U.$(".xw", root), svg = U.$(".xl", root), als = U.$$(".al", root), ads = U.$$(".ad", root);

  function anchor(p, k, ox, oy) {
    var q = p.at === "crown" ? w.show.crownXY : [w.cx + p.at[0] * w.r, w.cy + p.at[1] * w.r];
    return [ox + q[0] * k, oy + q[1] * k];
  }
  function layout() {
    var wide = bp.matches, W = root.clientWidth, row = wide ? 0 : 96, boxH = wide ? Math.min(Math.round(innerHeight * 0.82), 760) : Math.max(330, Math.min(Math.round(W * 0.98), 440)), H = boxH + row * 2;
    var k = boxH / I.h, boxW = Math.round(I.w * k), ox = Math.round((W - boxW) / 2), oy = row;
    root.style.height = H + "px"; xw.style.cssText = "left:" + ox + "px;top:" + oy + "px;width:" + boxW + "px;height:" + boxH + "px";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.innerHTML = "";
    var cx = ox + w.cx * k, rr = w.r * k, SL = { strap: -1.38, dial: -0.78, frame: 0.98, crown: 0.5 };   // label heights on desktop (case radii from the dial centre)
    A.parts.forEach(function (p, i) {
      var a = anchor(p, k, ox, oy), el = als[i], ad = ads[i], x1, y1, left = p.side === "l";
      el.style.cssText = "--n:" + i;
      if (wide) {
        y1 = oy + w.cy * k + SL[p.id] * rr; x1 = left ? cx - rr * 1.55 : cx + rr * 1.55;
        el.style.left = x1 + (left ? -14 : 14) + "px"; el.style.top = y1 + "px"; el.classList.toggle("lft", left); el.classList.remove("top", "bot");
      } else {
        var half = W / 2, top = i < 2, col = i % 2;                                         // strap + dial above, frame + crown below
        el.classList.remove("lft"); el.classList.toggle("top", top); el.classList.toggle("bot", !top);
        el.style.left = (col * half + 14) + "px"; el.style.width = (half - 28) + "px"; el.style.textAlign = col ? "right" : "left";
        if (top) { el.style.top = "4px"; y1 = row - 6; } else { el.style.top = (H - row + 10) + "px"; y1 = H - row + 4; }
        x1 = col * half + half / 2;
      }
      var path = document.createElementNS(ns, "path"); path.setAttribute("d", "M" + x1.toFixed(1) + " " + y1.toFixed(1) + " L" + a[0].toFixed(1) + " " + a[1].toFixed(1)); path.setAttribute("pathLength", "1"); path.dataset.id = p.id; path.style.setProperty("--n", i); svg.appendChild(path);
      ad.style.left = a[0] + "px"; ad.style.top = a[1] + "px";
    });
  }

  /* hover (desktop): brighten one line + label, dim the others */
  function hl(id) { if (id) root.dataset.hl = id; else delete root.dataset.hl; }
  [als, ads].forEach(function (list) { list.forEach(function (el) {
    el.addEventListener("mouseenter", function () { if (bp.matches) hl(el.dataset.id); }); el.addEventListener("mouseleave", function () { hl(""); });
    el.addEventListener("focus", function () { if (el.matches(":focus-visible")) hl(el.dataset.id); }); el.addEventListener("blur", function () { hl(""); });
  }); });

  layout(); addEventListener("resize", layout);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { layout(); requestAnimationFrame(function () { root.classList.add("in"); }); o.disconnect(); } }, { threshold: 0.4 }).observe(root);
  } else root.classList.add("in");
})();
