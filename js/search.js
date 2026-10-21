/* Search: header icon opens a quick finder over the 10 watches (name / type / description). Enter or click opens that watch's customizer. */
(function () {
  var U = window.UI, S = window.SITE, box = U.$("#search"), input = U.$("#searchInput"), list = U.$("#searchList"), btn = U.$("#searchBtn"), last, sel = 0, items = [];

  function match(q) {
    q = q.trim().toLowerCase(); if (!q) return S.watches.slice();
    return S.watches.filter(function (w) { return (w.name + " " + w.type + " " + w.desc).toLowerCase().indexOf(q) > -1; });
  }
  function render() {
    items = match(input.value); sel = Math.min(sel, Math.max(0, items.length - 1));
    list.innerHTML = items.length ? items.map(function (w, i) {
      return '<li role="option" id="sr-' + w.id + '" aria-selected="' + (i === sel) + '"><button data-go="' + w.id + '" tabindex="-1"><img src="' + Preload.url(w.id, 240) + '" width="48" height="64" alt="" loading="lazy" decoding="async"><span><b>' + U.esc(w.name) + "</b><small>" + U.esc(w.type) + " · " + U.money(w.price) + "</small></span></button></li>";
    }).join("") : '<li class="none">No watch matches “' + U.esc(input.value) + "”. Try “diver”, “GMT” or “gold”.</li>";
    if (items[sel]) input.setAttribute("aria-activedescendant", "sr-" + items[sel].id); else input.removeAttribute("aria-activedescendant");
  }
  function open() { last = document.activeElement; box.hidden = false; document.documentElement.classList.add("lock2"); btn.setAttribute("aria-expanded", "true"); input.value = ""; sel = 0; render(); requestAnimationFrame(function () { box.classList.add("on"); input.focus(); }); }
  function close() { box.classList.remove("on"); btn.setAttribute("aria-expanded", "false"); document.documentElement.classList.remove("lock2"); setTimeout(function () { box.hidden = true; }, 220); if (last && last.focus) last.focus({ preventScroll: true }); }
  function go(id) { close(); setTimeout(function () { window.Router.go(id); }, 120); }

  btn.addEventListener("click", open);
  input.addEventListener("input", function () { sel = 0; render(); });
  box.addEventListener("click", function (e) { var b = e.target.closest("[data-go]"); if (b) return go(b.dataset.go); if (e.target.closest("[data-sclose]") || e.target === box) close(); });
  box.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
    else if (e.key === "Enter" && items[sel]) { e.preventDefault(); go(items[sel].id); }
  });
  addEventListener("keydown", function (e) { if ((e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) && box.hidden) { e.preventDefault(); open(); } });
})();
