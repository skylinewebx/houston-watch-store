/* ==========================================================================
   SITE CONFIG — the ONE place for image paths, prices, copy, colours.
   Watch photos live in assets/watches/<id>-<240|640|1200>.webp (transparent cut-outs
   generated from the original JPGs). To swap a photo, replace those 3 files (same names)
   and update that watch's geometry in assets/watches/meta.js (case centre/radius).
   ========================================================================== */
window.SITE = {
  brand: "Meridian",
  tagline: "Time, considered.",
  sub: "Hand-picked luxury watches, customised your way. Houston, Texas.",
  currency: "$",

  /* ---- images --------------------------------------------------------- */
  img: { base: "assets/watches/", w: 1200, h: 1607 },   /* per-watch srcset widths + AVIF/WebP come from watches/meta.js */
  video: { src: "assets/video/boutique.mp4", poster: "assets/video/boutique-poster.webp" },

  /* ---- ANATOMY (interactive exploded view) ------------------------------
     Five parts sliced from the Opus Diver photo; every layer shares one canvas.
     bbox = visible area of the part (fractions of the canvas), used for the hotspot.
     at   = scroll-progress window in which the part separates.
     rz / z = slight tilt (deg) and depth (px) in the exploded state, s = scale.
     layout = where each part's centre ends up, as a fraction of the scene (w,h).  */
  anatomy: {
    descent: [0, 0.18], hotAt: 0.66,
    parts: [
      { id: "strap-top", src: "assets/layers/layer-strap-top.webp", bbox: [0.3625, 0.0205, 0.6325, 0.3273], at: [0.20, 0.40], rz: 7, z: -40, s: 1,
        title: "Strap · upper", material: "Italian calf leather", finish: "Hand-stitched, edge-painted", detail: "22 mm with quick-release spring bars" },
      { id: "strap-bottom", src: "assets/layers/layer-strap-bottom.webp", bbox: [0.3625, 0.6708, 0.6325, 0.9788], at: [0.24, 0.44], rz: -5, z: -20, s: 1,
        title: "Strap · tail", material: "Italian calf leather", finish: "Pebbled grain, steel keeper", detail: "Seven-hole adjustment, 80 mm" },
      { id: "crown", src: "assets/layers/layer-crown.webp", bbox: [0.74, 0.448, 0.8083, 0.5501], at: [0.30, 0.50], rz: -10, z: 30, s: 1.9,
        title: "Crown", material: "316L steel, screw-down", finish: "Knurled grip, laser-signed", detail: "Triple-gasket seal for 300 m" },
      { id: "frame", src: "assets/layers/layer-frame.webp", bbox: [0.2442, 0.2707, 0.7917, 0.7393], at: [0.36, 0.58], rz: -6, z: -10, s: 1.04,
        title: "Bezel & case", material: "316L stainless steel", finish: "Brushed flanks, polished chamfers", detail: "Blue ceramic insert, 41 mm" },
      { id: "dial", src: "assets/layers/layer-dial.webp", bbox: [0.2933, 0.3466, 0.7017, 0.6515], at: [0.44, 0.60], rz: -2, z: 90, s: 1.08,
        title: "Dial", material: "Sunburst navy lacquer", finish: "Lume indices, applied markers", detail: "Domed sapphire, anti-reflective" }
    ],
    layout: {
      desktop: { dial: [0.5, 0.5], frame: [0.2, 0.3], crown: [0.9, 0.5], "strap-top": [0.7, 0.2], "strap-bottom": [0.74, 0.82] },
      mobile: { dial: [0.45, 0.52], frame: [0.25, 0.22], crown: [0.88, 0.5], "strap-top": [0.74, 0.2], "strap-bottom": [0.72, 0.82] }
    }
  },

  /* ---- WATCHES (10) -----------------------------------------------------
     The first 5 (those with `show`) are the hero showcase, in this order:
     blue, brown, black, green, silver. bg = page colours for that watch
     (always dark + muted).  crown = crown position on the photo.             */
  watches: [
    { id: "dive", tone: "#1d4fa8", rc: { mode: "dark", spread: 0.3, bezelKeep: 0.9, strength: 1, lugDist: 0.2 }, name: "Opus Diver 300", type: "Dive", price: 2850, desc: "300 m ceramic-bezel diver with a deep sunburst blue dial.",
      show: { bg1: "#050b18", bg2: "#0b1b3c", glow: "#1d4fa8", crownXY: [960, 812],
        strap: "Black calf leather, navy stitching", dial: "Sunburst navy, sapphire crystal", frame: "316L steel, blue ceramic bezel", crown: "Screw-down crown, 300 m" } },
    { id: "chrono", tone: "#6e421d", rc: { mode: "both", spread: 0.26, bezelKeep: 0, strength: 1 }, name: "Cognac Chronograph", type: "Chronograph", price: 3200, desc: "Tri-compax chronograph in warm gold with a tobacco dial.",
      show: { bg1: "#0b0705", bg2: "#1d120a", glow: "#6e421d", crownXY: [953, 790],
        strap: "Cognac vegetable-tanned leather", dial: "Tobacco sunburst, three subdials", frame: "Gold-tone steel, brushed", crown: "Signed crown, pump pushers" } },
    { id: "skeleton", tone: "#2c2c31", rc: { mode: "dark", spread: 0.3, bezelKeep: 0, strength: 0.5 }, name: "Obsidian Skeleton", type: "Skeleton", price: 4600, desc: "Open-worked automatic in blacked-out steel.",
      show: { bg1: "#000000", bg2: "#070708", glow: "#2c2c31", crownXY: [930, 783],
        strap: "Black pebbled leather, stitched", dial: "Open-worked, visible movement", frame: "Black DLC steel, screwed bezel", crown: "Black screw-down crown" } },
    { id: "gmt", tone: "#12673a", rc: { mode: "dark", spread: 0.3, bezelKeep: 0.9, strength: 1 }, name: "Verdant GMT", type: "GMT", price: 3450, desc: "Dual-time traveller with a racing-green dial and two-tone bezel.",
      show: { bg1: "#04100a", bg2: "#09210f", glow: "#12673a", crownXY: [980, 783],
        strap: "Forest green calf leather", dial: "Racing green, date window", frame: "Steel, ceramic GMT bezel", crown: "Screw-down crown, steel" } },
    { id: "dress", tone: "#5b6673", rc: { detail: 0.07, mode: "both", spread: 0.2, bezelKeep: 0, strength: 1 }, name: "Platine Dress", type: "Dress", price: 2400, desc: "Ultra-slim polished steel with a silver grained dial.",
      show: { bg1: "#0a0c0f", bg2: "#151a20", glow: "#5b6673", crownXY: [934, 791],
        strap: "Charcoal calf, hand-stitched", dial: "Silver grain, applied indices", frame: "Polished steel, 7 mm case", crown: "Fluted crown, polished steel" } },
    { id: "pilot", tone: "#5a3a22", rc: { navyBg: true, mode: "dark", spread: 0.3, bezelKeep: 0, strength: 1 }, name: "Aviator Type-A", type: "Pilot", price: 1980, desc: "Big-crown flieger with an aged cream numeral dial." },
    { id: "field", tone: "#4a5a2a", rc: { navyBg: true, mode: "dark", spread: 0.28, bezelKeep: 0, strength: 1 }, name: "Ranger Field 38", type: "Field", price: 1150, desc: "Matte black steel, khaki dial, canvas strap. Built for daily wear." },
    { id: "smart", tone: "#27425e", rc: { navyBg: true, mode: "dark", spread: 0.3, bezelKeep: 0, strength: 1 }, name: "Hybrid One", type: "Smart-hybrid", price: 890, desc: "Analogue hands with a discreet smart display." },
    { id: "minimal", tone: "#8a6a45", rc: { detail: 0.06, navyBg: true, mode: "light", spread: 0.22, bezelKeep: 0, strength: 1 }, name: "Nordic Minimal", type: "Minimalist", price: 720, desc: "White dial, four dots, nothing extra." },
    { id: "vintage", tone: "#8a6d2f", rc: { detail: 0.07, navyBg: true, mode: "both", spread: 0.18, bezelKeep: 0, strength: 1 }, name: "Heritage 1962", type: "Vintage", price: 1680, desc: "Yellow-gold case and aged champagne dial in 60s style." }
  ],

  /* ---- CUSTOMIZER OPTIONS (generated in code) ---------------------------
     hex = null keeps the photo's own colour. d = price change.              */
  dialColors: [
    { name: "Original", hex: null, d: 0 }, { name: "Midnight", hex: "#15171b", d: 0 },
    { name: "Ocean", hex: "#1d4482", d: 0 }, { name: "Forest", hex: "#1f5238", d: 0 },
    { name: "Burgundy", hex: "#64202e", d: 20 }, { name: "Slate", hex: "#505862", d: 0 },
    { name: "Champagne", hex: "#cdb88c", d: 30 }, { name: "Ivory", hex: "#ebe5d3", d: 0 }
  ],
  frameColors: [
    { name: "Original", hex: null, d: 0 }, { name: "Steel", hex: "#bcc1c9", d: 0 },
    { name: "Gold", hex: "#cfa95c", d: 320 }, { name: "Rose gold", hex: "#cf917c", d: 290 },
    { name: "Black DLC", hex: "#26262b", d: 120 }, { name: "Titanium", hex: "#80868f", d: 90 },
    { name: "Bronze", hex: "#8f6339", d: 60 }, { name: "Ocean blue", hex: "#2f5da8", d: 70 }
  ],
  straps: {
    photo: { label: "Original", d: 0, colors: [] },
    leather: { label: "Leather", d: 0, colors: [["Black", "#17181b"], ["Brown", "#5b3a22"], ["Tan", "#a07a54"], ["Navy", "#1b2a4a"], ["Green", "#25402d"]] },
    rubber: { label: "Rubber", d: 40, colors: [["Black", "#17181b"], ["Blue", "#1f4a8a"], ["Green", "#2a5a3a"], ["Orange", "#d2661f"]] },
    canvas: { label: "Canvas", d: 30, colors: [["Olive", "#6b6f4c"], ["Grey", "#6d7077"], ["Navy", "#26344f"], ["Sand", "#b9a98a"]] },
    steel: { label: "Steel bracelet", metal: true, d: 380, colors: [["Brushed steel", "#c3c8cf"], ["Polished steel", "#e2e6ea"]] },
    gold: { label: "Gold bracelet", metal: true, d: 1500, colors: [["Yellow gold", "#d1ad62"], ["Pale gold", "#dcc78f"], ["Rose gold", "#d1957f"]] },
    black: { label: "Black bracelet", metal: true, d: 160, colors: [["Matte black", "#2a2c31"], ["Graphite", "#4b4e56"]] }
  },

  /* ---- REVIEWS (placeholders — replace with real ones) ------------------ */
  reviews: [
    { name: "Marcus T.", area: "Katy", stars: 5, text: "Customised the Opus Diver in gold and a bracelet. It looks far above its price and arrived in two days." },
    { name: "Elena R.", area: "The Heights", stars: 5, text: "Bought the Platine Dress for my husband. Patient staff and superb packaging." },
    { name: "David K.", area: "Sugar Land", stars: 5, text: "Swapping from leather to a steel bracelet in seconds is brilliant. Great quality in person." },
    { name: "Priya S.", area: "Midtown", stars: 4, text: "The Obsidian Skeleton is stunning. I wish the box were a touch smaller, but the watch is superb." },
    { name: "Jamal W.", area: "Pearland", stars: 5, text: "Paid cash on delivery with zero hassle. The Verdant GMT is my daily now." },
    { name: "Hannah L.", area: "Rice Village", stars: 5, text: "Clean, honest and well made. I tried everything on in the boutique first." },
    { name: "Carlos M.", area: "Galleria", stars: 5, text: "Great field watch for the money. The fabric strap is comfortable in the Houston heat." },
    { name: "Aisha B.", area: "Montrose", stars: 4, text: "Lovely minimalist watch, exactly like the photos. Would buy again." }
  ],

  /* ---- STORE (placeholder details — replace) ---------------------------- */
  store: {
    address: "1200 Westheimer Rd, Houston, TX 77006",
    phone: "(713) 555-0142",
    hours: [["Mon – Fri", "10:00 – 19:00"], ["Saturday", "10:00 – 18:00"], ["Sunday", "12:00 – 17:00"]]
  }
};
/* merge per-watch geometry + blur-up placeholders (generated file) */
(function () {
  var m = window.WATCH_META || {};
  window.SITE.watches.forEach(function (w) { Object.assign(w, m[w.id] || {}); });
  window.SITE.showcase = window.SITE.watches.filter(function (w) { return w.show; });
})();
