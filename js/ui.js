/* Shared UI: helpers, glass header, mobile menu, cart + wishlist drawer, toast, callout builder, colour helpers. */
(function () {
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return S.currency + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };   // no Intl: it costs ~20ms on first use
  var money2 = function (n) { return S.currency + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var byId = function (id) { return S.watches.filter(function (w) { return w.id === id; })[0]; };

  /** Watch photo: <picture> (AVIF/WebP ladder). o = { sizes, lazy, high, cls }. */
  function im(id, alt, o) { o = o || {}; return Preload.pic(id, { sizes: o.sizes, alt: alt, cls: o.cls, lazy: o.lazy, high: o.high }); }
  /** Baked soft contact shadow (falls opposite the light) - replaces expensive CSS drop-shadow filters. */
  function shadow(id) { return '<img class="shd" src="' + S.img.base + id + '-shadow.webp" width="400" height="536" alt="" decoding="async">'; }

  /** Stage geometry comes from the CSS custom properties (single source of truth). */
  function stageGeom(el) {
    var cs = getComputedStyle(el), n = function (k) { return parseFloat(cs.getPropertyValue(k)); };
    return { w: n("--w"), h: n("--h"), y0: n("--y0") || 0 };
  }
  /** Thin line + dot + tiny label. a/t are STAGE units (line start / label end); G = stageGeom. */
  function callout(c, i, a, t, side, G) {
    var dx = t.x - a.x, dy = t.y - a.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    var px = function (v) { return (v / G.w * 100).toFixed(3) + "%"; }, py = function (v) { return (v / G.h * 100).toFixed(3) + "%"; };
    var tw = Math.min(300, side === "r" ? G.w - t.x - 10 : t.x - 10);
    var pos = side === "r" ? "left:" + px(t.x + 8) : "right:" + px(G.w - t.x + 8);
    return '<div class="co ' + side + '" style="--n:' + i + '"><u style="left:' + px(a.x) + ";top:" + py(a.y) + '"></u>' +
      '<i style="left:' + px(a.x) + ";top:" + py(a.y) + ";width:" + px(len) + ";transform:rotate(" + ang.toFixed(2) + 'deg) scaleX(var(--p,1))"></i>' +
      '<span style="top:' + py(t.y) + ";" + pos + ";width:" + px(tw) + '"><b>' + esc(c.title) + "</b>" + esc(c.text) + "</span></div>";
  }

  /* ---- persistent state (safe if storage is blocked) ---- */
  function read(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var cart = read("mw-cart2"), wish = read("mw-wish2");

  var toastT;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2600); }

  /* ---- cart / wishlist ---- */
  function count() { return cart.reduce(function (a, i) { return a + i.qty; }, 0); }
  function subtotal() { return cart.reduce(function (a, i) { return a + i.price * i.qty; }, 0); }
  function counts() {
    [["cartCount", count()], ["cartCount2", count()], ["wishCount", wish.length]].forEach(function (p) { var b = $("#" + p[0]); if (b) { b.textContent = p[1]; b.hidden = !p[1]; } });
  }
  function save() { write("mw-cart2", cart); counts(); }
  function addToCart(item) {
    var key = item.id + "|" + (item.opts || ""), f = cart.filter(function (i) { return i.key === key; })[0];
    if (f) f.qty++; else cart.push({ key: key, id: item.id, name: item.name, price: item.price, opts: item.opts || "", qty: 1 });
    save(); toast(item.name + " added to cart"); if (current === "cart") render();
  }
  function clearCart() { cart = []; save(); }
  function toggleWish(id) {
    var i = wish.indexOf(id); if (i < 0) wish.push(id); else wish.splice(i, 1);
    write("mw-wish2", wish); counts(); syncHearts(); if (current === "wishlist") render(); return i < 0;
  }
  function syncHearts() { $$("[data-heart]").forEach(function (b) { var on = wish.indexOf(b.dataset.heart) > -1; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }

  /* ---- drawer (cart, wishlist; checkout renders into the same panel) ---- */
  var current = null, drawer = $("#drawer"), scrim = $("#scrim"), lastFocus;
  var PAY = window.PAYMENTS = [
    ["cod", "Cash on Delivery", "Pay in cash when your watch arrives", '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>'],
    ["paypal", "PayPal", "Pay with your PayPal balance, bank or card", '<svg viewBox="0 0 24 24"><path d="M7 20l2-14h6a3.5 3.5 0 0 1 0 7H10"/></svg>'],
    ["card", "Credit / Debit Card", "Visa, Mastercard, Amex, Discover — all major banks", '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>']
  ];
  var thumb = function (id, n) { return '<img src="' + Preload.url(id, 240) + '" width="64" height="86" alt="' + esc(n) + '" decoding="async" loading="lazy">'; };

  function setPanel(title, body, foot) { $("#drawerTitle").textContent = title; $("#drawerBody").innerHTML = body; $("#drawerFoot").innerHTML = foot || ""; $("#drawerBody").scrollTop = 0; }
  function render() {
    if (current === "cart") {
      if (!cart.length) return setPanel("Your cart", '<p class="empty">Your cart is empty.<br><a class="btn btn-outline" href="#collection" data-close style="margin-top:18px">Browse the collection</a></p>', "");
      var body = cart.map(function (i, n) {
        return '<div class="line">' + thumb(i.id, i.name) + '<div><h4>' + esc(i.name) + '</h4><small>' + esc(i.opts) + '</small><span class="price" style="font-size:16px">' + money(i.price) + '</span> <button class="lnk" data-rm="' + n + '">Remove</button></div>' +
          '<div class="qty"><button data-q="' + n + '" data-d="-1" aria-label="Decrease quantity">−</button><span>' + i.qty + '</span><button data-q="' + n + '" data-d="1" aria-label="Increase quantity">+</button></div></div>';
      }).join("");
      setPanel("Your cart", body, '<div class="total"><span>Subtotal</span><span>' + money(subtotal()) + '</span></div><p class="fine">Insured delivery and tax are calculated at checkout.</p>' +
        '<button class="btn btn-primary btn-block" id="goCheckout">Checkout</button>');
    } else if (current === "wishlist") {
      setPanel("Wishlist", wish.length ? wish.map(function (id) {
        var w = byId(id); if (!w) return "";
        return '<div class="line">' + thumb(id, w.name) + '<div><h4>' + esc(w.name) + '</h4><span class="price" style="font-size:16px">' + money(w.price) + '</span></div>' +
          '<div><button class="btn btn-outline no-arrow" style="min-height:44px;padding:0 12px;font-size:10px" data-cust="' + id + '">Customize</button><button class="icon-btn" data-unwish="' + id + '" aria-label="Remove ' + esc(w.name) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>';
      }).join("") : '<p class="empty">Tap the heart on any watch to save it here.</p>', "");
    }
  }
  function open(kind) {
    current = kind; lastFocus = document.activeElement; render(); scrim.hidden = false; drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); document.documentElement.classList.add("lock2");
    requestAnimationFrame(function () { scrim.classList.add("on"); $("#drawerClose").focus(); });
  }
  function close() {
    current = null; drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); scrim.classList.remove("on"); document.documentElement.classList.remove("lock2");
    setTimeout(function () { if (!current) scrim.hidden = true; }, 300); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button,a,[data-heart]"); if (!t) return;
    if (t.dataset.open) open(t.dataset.open);
    else if (t.id === "drawerClose" || t.hasAttribute("data-close")) close();
    else if (t.dataset.q) { var it = cart[+t.dataset.q]; it.qty += +t.dataset.d; if (it.qty < 1) cart.splice(+t.dataset.q, 1); save(); render(); }
    else if (t.dataset.rm) { cart.splice(+t.dataset.rm, 1); save(); render(); }
    else if (t.dataset.heart) { var on = toggleWish(t.dataset.heart); toast(on ? "Saved to wishlist" : "Removed from wishlist"); }
    else if (t.dataset.unwish) toggleWish(t.dataset.unwish);
    else if (t.dataset.cust) { close(); window.Router.go(t.dataset.cust); }
    else if (t.id === "goCheckout") window.Checkout.start();
  });
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (current) close(); menu(false); } });

  /* ---- mobile menu ---- */
  var nav = $("#nav"), burger = $("#burger");
  function menu(on) { nav.classList.toggle("open", on); burger.setAttribute("aria-expanded", on); burger.setAttribute("aria-label", on ? "Close menu" : "Menu"); }
  burger.addEventListener("click", function () { menu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") menu(false); });
  document.addEventListener("click", function (e) { if (nav.classList.contains("open") && !e.target.closest("#nav,#burger")) menu(false); });

  /* ---- in-page links: one smooth glide straight to the target. The target is re-measured every frame (lazy sections change height as they render), the glide stops the moment the user scrolls, and nothing is pinned or hijacked. ---- */
  var glide = 0;
  function goTo(el, hash) {
    cancelAnimationFrame(glide);
    var root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var top = function () { return Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - (el.id === "home" ? 0 : parseFloat(getComputedStyle(el).scrollMarginTop) || 0))); };
    var from = scrollY, t0 = performance.now(), dist = Math.abs(top() - from), dur = reduce ? 0 : Math.min(900, 380 + dist * 0.12);
    if (hash && history.replaceState) history.replaceState(null, "", hash);
    var stop = function () { cancelAnimationFrame(glide); ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) { removeEventListener(t, stop, true); }); };
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) { addEventListener(t, stop, { capture: true, passive: true }); });
    (function step(now) {
      var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, to = top();
      scrollTo(0, Math.round(from + (to - from) * e));
      if (k < 1) glide = requestAnimationFrame(step); else { scrollTo(0, top()); stop(); }
    })(t0);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var h = a.getAttribute("href"); if (h === "#" || h.indexOf("#/") === 0) return;
    var el = document.getElementById(h.slice(1)); if (!el) return;
    e.preventDefault(); if (document.documentElement.classList.contains("lock")) setTimeout(function () { goTo(el, h); }, 30); else goTo(el, h);
  });

  /* ---- brand text + footer ---- */
  $$("[data-brand]").forEach(function (n) { n.textContent = S.brand; });
  $("#yr").textContent = new Date().getFullYear();
  $("#payFooter").innerHTML = PAY.map(function (p) { return '<li class="pay">' + p[3] + p[1] + "</li>"; }).join("");
  counts();

  /* ---- colour helpers + watch-tinted button accent ---- */
  function hex2(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, t) { var A = hex2(a), B = hex2(b); return "#" + A.map(function (v, i) { return ("0" + Math.round(v + (B[i] - v) * t).toString(16)).slice(-2); }).join(""); }
  function accent(glow) {          // champagne gold softly tinted towards the selected watch's colour
    var r = document.documentElement.style, tint = mix(glow, "#ffffff", .5);
    r.setProperty("--btn", mix("#c8a96a", tint, .22)); r.setProperty("--btn-2", mix("#e0c88f", tint, .22));
  }

  /* ---- glass header once scrolled (class toggled only when crossing the threshold; passive listener) ---- */
  var hdr = $("#top"), scrolled = false;
  function onScroll() { var s = scrollY > 24; if (s !== scrolled) { scrolled = s; hdr.classList.toggle("scrolled", s); } }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  window.UI = { mix: mix, accent: accent, $: $, $$: $$, money: money, money2: money2, esc: esc, im: im, shadow: shadow, byId: byId, stageGeom: stageGeom, callout: callout,
    addToCart: addToCart, toast: toast, syncHearts: syncHearts, cart: { items: function () { return cart; }, subtotal: subtotal, clear: clearCart, count: count },
    drawer: { open: open, close: close, setPanel: setPanel, render: render } };
})();
