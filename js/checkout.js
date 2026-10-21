/* Checkout inside the drawer: Details -> Payment (Cash on Delivery / PayPal / Credit-Debit card) -> Confirmation.
   Front-end demo: nothing is sent anywhere and card numbers are never stored. Real processing would plug in at placeOrder(). */
window.Checkout = (function () {
  var U = window.UI, TAX = 0.0825, COD_FEE = 15, st = { step: "details", pay: "cod", d: {}, order: null, busy: false };

  function totals() {
    var sub = U.cart.subtotal(), fee = st.pay === "cod" ? COD_FEE : 0, tax = Math.round(sub * TAX * 100) / 100;
    return { sub: sub, fee: fee, tax: tax, total: sub + fee + tax };
  }
  function summary() {
    var t = totals();
    return '<dl class="co-sum"><div><dt>Subtotal <small>(' + U.cart.count() + ' item' + (U.cart.count() > 1 ? "s" : "") + ')</small></dt><dd>' + U.money2(t.sub) + '</dd></div>' +
      '<div><dt>Insured delivery</dt><dd>Free</dd></div><div><dt>Houston sales tax <small>8.25%</small></dt><dd>' + U.money2(t.tax) + '</dd></div>' +
      (t.fee ? '<div><dt>Cash handling fee</dt><dd>' + U.money2(t.fee) + '</dd></div>' : "") + '<div class="tot"><dt>Total</dt><dd>' + U.money2(t.total) + "</dd></div></dl>";
  }
  var stepper = function (n) { return '<ol class="steps" aria-label="Checkout progress">' + ["Details", "Payment", "Done"].map(function (s, i) { return '<li' + (i === n ? ' aria-current="step"' : "") + (i < n ? ' class="done"' : "") + ">" + s + "</li>"; }).join("") + "</ol>"; };
  var field = function (id, label, o) {
    o = o || {}; return '<div class="fld' + (o.half ? " half" : "") + '"><label for="co-' + id + '">' + label + '</label><input id="co-' + id + '" name="' + id + '" type="' + (o.type || "text") + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : "") + (o.ac ? ' autocomplete="' + o.ac + '"' : "") +
      (o.ph ? ' placeholder="' + o.ph + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + ' value="' + U.esc(o.v || "") + '" aria-describedby="co-' + id + '-e"><p class="err" id="co-' + id + '-e" role="alert"></p></div>';
  };

  function start() { if (!U.cart.count()) return; st.step = "details"; render(); }
  function render() {
    var d = st.d;
    if (st.step === "details") {
      U.drawer.setPanel("Checkout", stepper(0) + '<form id="coForm" novalidate data-co="details"><h4 class="co-h">Delivery details</h4>' +
        field("name", "Full name", { ac: "name", v: d.name }) + field("email", "Email", { type: "email", ac: "email", v: d.email }) + field("phone", "Phone", { type: "tel", mode: "tel", ac: "tel", ph: "(713) 555-0100", v: d.phone }) +
        field("addr", "Street address", { ac: "street-address", v: d.addr }) + field("city", "City", { half: true, ac: "address-level2", v: d.city || "Houston" }) +
        field("state", "State", { half: true, ac: "address-level1", max: 2, v: d.state || "TX" }) + field("zip", "ZIP code", { mode: "numeric", ac: "postal-code", max: 5, v: d.zip }) + "</form>",
        '<button class="btn btn-primary btn-block" type="submit" form="coForm">Continue to payment</button><button class="btn btn-ghost no-arrow btn-block" data-co-back="cart">← Back to cart</button>');
    } else if (st.step === "payment") {
      var opts = window.PAYMENTS.map(function (p) {
        var body = p[0] === "cod" ? '<p class="pay-note">Pay <b>' + U.money2(totals().total) + '</b> in cash to our courier on delivery. A small cash-handling fee applies. Please have exact change.</p>'
          : p[0] === "paypal" ? '<p class="pay-note">You will be redirected to PayPal to approve the payment securely, then returned here. <em>(Demo: the redirect is simulated.)</em></p>'
          : '<div class="cards" aria-hidden="true"><i>VISA</i><i>MC</i><i>AMEX</i><i>DISC</i></div>' + field("cnum", "Card number", { mode: "numeric", ac: "cc-number", ph: "1234 5678 9012 3456", max: 23 }) + field("cname", "Name on card", { ac: "cc-name", v: d.name }) +
            field("cexp", "Expiry", { half: true, mode: "numeric", ac: "cc-exp", ph: "MM / YY", max: 7 }) + field("ccvc", "CVC", { half: true, mode: "numeric", ac: "cc-csc", ph: "123", max: 4 }) + '<p class="pay-note">Credit and debit cards from all major banks. <em>(Demo: card details are validated but never sent or stored.)</em></p>';
        return '<div class="pay-card' + (st.pay === p[0] ? " on" : "") + '"><label class="pay-opt"><input type="radio" name="pay" value="' + p[0] + '"' + (st.pay === p[0] ? " checked" : "") + '><span class="pi">' + p[3] + '</span><span><b>' + p[1] + "</b><small>" + p[2] + "</small></span></label>" + (st.pay === p[0] ? '<div class="pay-body">' + body + "</div>" : "") + "</div>";
      }).join("");
      U.drawer.setPanel("Payment", stepper(1) + '<form id="coForm" novalidate data-co="payment"><h4 class="co-h">Choose how to pay</h4><div role="radiogroup" aria-label="Payment method">' + opts + "</div></form>" + '<h4 class="co-h" style="margin-top:22px">Order summary</h4>' + summary(),
        '<button class="btn btn-primary btn-block" type="submit" form="coForm" id="placeBtn">' + (st.pay === "paypal" ? "Continue with PayPal" : st.pay === "cod" ? "Place order · pay on delivery" : "Pay " + U.money2(totals().total)) + '</button><button class="btn btn-ghost no-arrow btn-block" data-co-back="details">← Back to details</button>');
    } else {
      var o = st.order;
      U.drawer.setPanel("Thank you", stepper(2) + '<div class="done-card"><svg viewBox="0 0 48 48" class="tick" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="M14 25l7 7 13-15"/></svg><h4>Order confirmed</h4><p class="muted">Order <b>' + o.no + "</b> · " + U.esc(o.method) + '</p><p>We will email <b>' + U.esc(st.d.email) + "</b> with tracking. Insured delivery to " + U.esc(st.d.addr) + ", " + U.esc(st.d.city) + ", " + U.esc(st.d.state) + " " + U.esc(st.d.zip) + " in 2–3 business days.</p>" +
        '<ul class="done-list">' + o.items.map(function (i) { return "<li><span>" + U.esc(i.name) + (i.qty > 1 ? " × " + i.qty : "") + "<small>" + U.esc(i.opts) + "</small></span><b>" + U.money(i.price * i.qty) + "</b></li>"; }).join("") + "</ul>" +
        '<dl class="co-sum"><div class="tot"><dt>' + (o.pay === "cod" ? "To pay on delivery" : "Paid") + "</dt><dd>" + U.money2(o.total) + "</dd></div></dl></div>",
        '<a class="btn btn-primary btn-block" href="#collection" data-close>Continue shopping</a>');
    }
  }

  function err(id, msg) { var e = document.getElementById("co-" + id + "-e"), i = document.getElementById("co-" + id); if (e) e.textContent = msg || ""; if (i) i.setAttribute("aria-invalid", msg ? "true" : "false"); return !msg; }
  function luhn(n) { var s = 0, alt = false; for (var i = n.length - 1; i >= 0; i--) { var d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; }
  function brand(n) { return /^4/.test(n) ? "visa" : /^(5[1-5]|2[2-7])/.test(n) ? "mc" : /^3[47]/.test(n) ? "amex" : /^6(011|5)/.test(n) ? "disc" : ""; }
  var v = function (id) { return (document.getElementById("co-" + id) || { value: "" }).value.trim(); };

  function validateDetails() {
    var ok = true, first = null, chk = function (id, test, msg) { var good = err(id, test() ? "" : msg); if (!good && !first) first = id; ok = ok && good; };
    chk("name", function () { return v("name").length > 2 && /\s/.test(v("name")); }, "Enter your first and last name.");
    chk("email", function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email")); }, "Enter a valid email address.");
    chk("phone", function () { return v("phone").replace(/\D/g, "").length >= 10; }, "Enter a phone number with area code.");
    chk("addr", function () { return v("addr").length > 4; }, "Enter your street address.");
    chk("city", function () { return v("city").length > 1; }, "Enter your city.");
    chk("state", function () { return /^[A-Za-z]{2}$/.test(v("state")); }, "Use the 2-letter state code.");
    chk("zip", function () { return /^\d{5}$/.test(v("zip")); }, "Enter a 5-digit ZIP code.");
    if (first) document.getElementById("co-" + first).focus(); return ok;
  }
  function validateCard() {
    var ok = true, first = null, chk = function (id, test, msg) { var good = err(id, test() ? "" : msg); if (!good && !first) first = id; ok = ok && good; };
    var num = v("cnum").replace(/\s/g, ""), b = brand(num), exp = v("cexp").replace(/\D/g, ""), mm = +exp.slice(0, 2), yy = 2000 + +exp.slice(2, 4), now = new Date();
    chk("cnum", function () { return /^\d{13,19}$/.test(num) && luhn(num); }, "Check the card number.");
    chk("cname", function () { return v("cname").length > 2; }, "Enter the name on the card.");
    chk("cexp", function () { return exp.length === 4 && mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1)); }, "Enter a valid future expiry (MM / YY).");
    chk("ccvc", function () { return new RegExp("^\\d{" + (b === "amex" ? 4 : 3) + "}$").test(v("ccvc")); }, b === "amex" ? "Amex uses a 4-digit code." : "Enter the 3-digit code.");
    if (first) document.getElementById("co-" + first).focus(); return ok;
  }

  function placeOrder() {
    if (st.busy) return; st.busy = true; var btn = document.getElementById("placeBtn"); if (btn) { btn.disabled = true; btn.textContent = st.pay === "paypal" ? "Redirecting to PayPal…" : "Processing…"; }
    setTimeout(function () {
      var t = totals(), no = "MW-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      st.order = { no: no, method: window.PAYMENTS.filter(function (p) { return p[0] === st.pay; })[0][1], pay: st.pay, total: t.total, items: JSON.parse(JSON.stringify(U.cart.items())) };
      U.cart.clear(); st.step = "done"; st.busy = false; render();
    }, st.pay === "paypal" ? 1400 : 700);
  }

  /** Re-format a field while keeping the caret next to the same digit (editing the middle of a card number must not jump to the end). */
  function keepCaret(t, fmt) {
    var pos = t.selectionStart == null ? t.value.length : t.selectionStart, before = t.value.slice(0, pos).replace(/\D/g, "").length;
    t.value = fmt(t.value); var n = 0, i = 0; for (; i < t.value.length && n < before; i++) if (/\d/.test(t.value[i])) n++;
    try { t.setSelectionRange(i, i); } catch (e) {}
  }

  /* one set of delegated handlers on the drawer */
  var drawer = document.getElementById("drawer");
  drawer.addEventListener("submit", function (e) {
    var f = e.target.closest("form[data-co]"); if (!f) return; e.preventDefault();
    if (f.dataset.co === "details") { if (!validateDetails()) return; ["name", "email", "phone", "addr", "city", "state", "zip"].forEach(function (k) { st.d[k] = v(k); }); st.d.state = st.d.state.toUpperCase(); st.step = "payment"; render(); }
    else if (f.dataset.co === "payment") { if (st.pay === "card" && !validateCard()) return; placeOrder(); }
  });
  drawer.addEventListener("change", function (e) { if (e.target.name === "pay") { st.pay = e.target.value; render(); var r = drawer.querySelector('input[name="pay"]:checked'); if (r) r.focus(); } });
  drawer.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "co-cnum") keepCaret(t, function (v) { var d = v.replace(/\D/g, "").slice(0, 19), b = brand(d), g = b === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3], o = [], p = 0; g.forEach(function (n) { if (d.length > p) o.push(d.substr(p, n)); p += n; }); return o.join(" "); });
    else if (t.id === "co-cexp") keepCaret(t, function (v) { var x = v.replace(/\D/g, "").slice(0, 4); return x.length > 2 ? x.slice(0, 2) + " / " + x.slice(2) : x; });
    else if (t.id === "co-ccvc" || t.id === "co-zip") t.value = t.value.replace(/\D/g, "");
    else if (t.id === "co-state") t.value = t.value.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (t.getAttribute && t.getAttribute("aria-invalid") === "true") err(t.id.replace("co-", ""), "");
  });
  drawer.addEventListener("click", function (e) {
    var b = e.target.closest("[data-co-back]"); if (!b) return;
    if (b.dataset.coBack === "cart") { U.drawer.render(); } else { st.step = b.dataset.coBack; render(); }
  });
  return { start: start };
})();
