/* Collection: dark glass cards, every watch shown straight and still (no pointer or scroll tilt). Staggered fade-and-rise; a card is
   revealed only once its image is decoded, so there are never empty boxes. */
(function () {
  var U = window.UI, S = window.SITE, grid = U.$("#grid");
  var wide = function () { return innerWidth >= 900; };

  grid.innerHTML = S.watches.map(function (w, i) {
    return '<article class="card" data-i="' + i + '" style="--tone:' + w.tone + '"><div class="card-in"><div class="glow"></div><div class="pic">' +
      '<button class="icon-btn heart" data-heart="' + w.id + '" aria-pressed="false" aria-label="Save ' + U.esc(w.name) + ' to wishlist"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>' +
      '<div class="ti">' + U.shadow(w.id) + U.im(w.id, w.name + " " + w.type + " watch", { sizes: Preload.cardSizes, lazy: true }) + '</div><div class="shine"></div></div>' +
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
  }, { rootMargin: "0px 0px -6% 0px", threshold: [0, 0.2, 0.6] });
  cards.forEach(function (c) { io ? io.observe(c) : c.classList.add("in"); });

  Preload.near(grid, function () { S.watches.forEach(function (w) { Preload.warm(w.id, Preload.cardSizes); }); }, 3500);
})();
