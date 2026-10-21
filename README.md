# Meridian — luxury watch store (plain HTML/CSS/JS, no framework)

## Run
    python -m http.server 8123        # then open http://localhost:8123
(any static server works; WebGL recolouring needs http://, not file://)

## Edit / build
- Content, prices, colours, labels:  `assets/config.js`   |  per-watch geometry + srcset widths:  `assets/watches/meta.js` (generated)
- Source code:  `css/*.css`, `js/*.js`  ->  bundled + minified into `dist/app.css` + `dist/app.js`:
      npm i esbuild   # once
      node tools/build.js
  (bump the `?v=` on the dist links in index.html when you ship a change)
- `index.html` contains the first hero watch as static HTML (instant LCP); the other sections are built by JS and flushed on idle / first interaction.

## Images
- Originals live in `Watch Store Assets/collection/*.jpg` (never upscaled). `tools/build_assets/` (Python: opencv-python-headless, scipy, pillow>=11 with AVIF) cuts them out
  (GrabCut -> guided-filter edges, <=1px feather, halo removal), adds a studio rim light + baked soft contact shadow (opposite the light), sharpens lightly, and writes
  `assets/watches/<id>-<width>.avif|webp` ladders (240...native) + `<id>-shadow.webp`.  Anatomy layers: `tools/build_assets/layers2.py`.
- Source resolution: 9 photos are 1792x2400; **the Cognac Chronograph source (`Gold_chronograph_wristwatch_on_d…20261020202957.jpg`) is only 896x1200** and is served at its native 896px (no upscaling).
  Replace it with a >=1792x2400 render for the same sharpness as the rest.

## Tilt
Each watch has a pose (`rx` faces up, `ry` faces right, `rz` roll, 6-12 deg) in `meta.js`; the light always comes from the side it faces and from above, the baked shadow falls the other way.
Desktop: cursor parallax. Phones: touch drag / scroll tilt, optional gyroscope (opt-in button).

Checkout is a front-end demo (no real payment processing, card data is never stored). Address, phone and reviews are placeholders.
