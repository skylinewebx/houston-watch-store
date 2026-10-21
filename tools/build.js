/* Build step: bundles + minifies css/*.css -> dist/app.css and js/*.js -> dist/app.js (2 requests instead of 17).
   Edit the sources in css/ and js/, then run:  npm i esbuild  (once)  &&  node tools/build.js
   (assets/config.js and assets/watches/meta.js stay separate on purpose: they are the files you edit to change content.) */
const esbuild = require("esbuild"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const CSS = ["base", "hero", "anatomy", "collection", "customizer", "sections"].map((n) => `css/${n}.css`);
const CRITICAL = ["preload", "ui", "tilt", "hero"].map((n) => `js/${n}.js`);                       // runs immediately (hero, header, drawers)
const LATER = ["anatomy", "collection", "recolor", "customizer", "checkout", "search", "sections"].map((n) => `js/${n}.js`);   // below the fold / on demand
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const css = CSS.map((f) => esbuild.transformSync(read(f), { loader: "css", minify: true }).code).join("\n");
const min = (f) => esbuild.transformSync(read(f), { loader: "js", minify: !process.env.NOMIN, target: "es2018" }).code.trim().replace(/;?$/, ";");
const boot = `window.__defer=[];window.__run=function(sync){var g=window.__defer.shift();if(!g)return;try{g()}catch(e){console.error(e)}if(window.__defer.length){if(sync)window.__run(1);else(window.requestIdleCallback||setTimeout)(function(){window.__run()})}};`;
const sched = `(function(){var done=0,ev=["pointerdown","keydown","scroll","touchstart","wheel"];function now(){if(done)return;done=1;ev.forEach(function(t){removeEventListener(t,now,true)});window.__run(1)}
ev.forEach(function(t){addEventListener(t,now,{capture:true,passive:true})});addEventListener("hashchange",now);
if(location.hash.indexOf("#/customize")===0)now();else (window.requestIdleCallback||setTimeout)(function(){if(!done)window.__run()},{timeout:1500});})();`;
const js = boot + CRITICAL.map(min).join("\n") + "\n" + LATER.map((f) => `window.__defer.push(function(){${min(f)}});`).join("\n") + "\n" + sched;
fs.writeFileSync(path.join(root, "dist/app.css"), css); fs.writeFileSync(path.join(root, "dist/app.js"), js);
console.log("dist/app.css", (css.length / 1024).toFixed(1) + " KB", "| dist/app.js", (js.length / 1024).toFixed(1) + " KB");
