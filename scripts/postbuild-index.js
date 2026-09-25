#!/usr/bin/env node
/**
 * Rewrites dist/dexii/browser/index.html so the browser paints the inline
 * splash before it starts evaluating Angular.
 *
 * Angular emits `<script type="module" src="...">` tags in <head>. Module
 * scripts are deferred, but if they have already downloaded by the time the
 * parser finishes (the common case on a fast connection or from the service
 * worker cache) Chrome runs them before producing the first frame, so a slow
 * phone shows a blank page for the whole bootstrap. Here we inject the script
 * tags right after the first frame has been painted (about one frame later
 * than the parser would have started them), so the splash is always visible
 * while Angular loads and runs.
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'dist', 'dexii', 'browser', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const tagRe = /<script src="([^"]+)" type="module"><\/script>/g;
const preloadRe = /<link rel="modulepreload" href="([^"]+)">/g;
const srcs = [];
const preloads = [];
html = html.replace(tagRe, (_, src) => { srcs.push(src); return ''; });
html = html.replace(preloadRe, (_, href) => { preloads.push(href); return ''; });

if (srcs.length === 0) {
  console.log('postbuild-index: no module scripts found, nothing to do');
  process.exit(0);
}

// After the first frame: start the chunk downloads in parallel (modulepreload),
// then add the executing module scripts.
const loader = `<script>(function(){var p=${JSON.stringify(preloads)},s=${JSON.stringify(srcs)};function go(){var i,e;for(i=0;i<p.length;i++){e=document.createElement('link');e.rel='modulepreload';e.href=p[i];document.head.appendChild(e);}for(i=0;i<s.length;i++){e=document.createElement('script');e.type='module';e.src=s[i];document.head.appendChild(e);}}if(window.requestAnimationFrame){requestAnimationFrame(function(){requestAnimationFrame(go);});}else{setTimeout(go,0);}})();</script>`;

html = html.replace('</body>', `${loader}</body>`);
fs.writeFileSync(indexPath, html);
console.log(`postbuild-index: deferred ${srcs.length} module script(s) and ${preloads.length} preload(s) until after first paint`);
