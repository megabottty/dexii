#!/usr/bin/env node
/**
 * Builds docs/brand/dexii-palette.html, the colour palette hand-off for designers,
 * straight from the theme definitions in src/app/core/services/theme.service.ts so
 * the page can never drift from what the app ships. Run: node scripts/brand-palette.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'src/app/core/services/theme.service.ts'), 'utf8');

const ROLES = [
  ['bg', 'Background', 'Page background'],
  ['bgSecondary', 'Surface', 'Cards, panels, inputs'],
  ['cardBg', 'Card', 'Raised cards and modals'],
  ['text', 'Text', 'Headings and body copy'],
  ['textSecondary', 'Muted text', 'Labels, hints, meta'],
  ['primary', 'Primary', 'Buttons, links, active states'],
  ['primaryHover', 'Primary hover', 'Pressed and hover state'],
  ['accent', 'Accent', 'Badges, highlights, the Tea cup'],
  ['border', 'Border', 'Dividers and outlines']
];

function parseThemes(ts) {
  const themes = [];
  const re = /id:\s*'([a-z]+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',[\s\S]*?colors:\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(ts))) {
    const colors = {};
    for (const c of m[4].matchAll(/([a-zA-Z]+):\s*'(#[0-9a-fA-F]{6})'/g)) colors[c[1]] = c[2].toLowerCase();
    themes.push({ id: m[1], name: m[2], description: m[3], colors });
  }
  return themes;
}

function parseCustom(ts) {
  const m = ts.match(/DEFAULT_CUSTOM_COLORS[^=]*=\s*\{([\s\S]*?)\}/);
  const out = {};
  for (const c of (m ? m[1] : '').matchAll(/([a-zA-Z]+):\s*'(#[0-9a-fA-F]{6})'/g)) out[c[1]] = c[2].toLowerCase();
  return out;
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const grade = (ratio) => ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Low';

const themes = parseThemes(source);
if (themes.length < 5) throw new Error('Could not read the theme definitions');
const custom = parseCustom(source);
const isDark = (t) => luminance(t.colors.bg) < 0.3;

const BRAND = {
  defaultTheme: 'pearl',
  manifestTheme: '#8d5e94',
  manifestBackground: '#fffafa',
  splashGradient: ['#a881af', '#d4af37'],
  status: [
    ['#ef4444', 'Danger', 'Red flags, remove, destructive actions'],
    ['#16a34a', 'Success', 'Accept, confirmations'],
    ['#10b981', 'Seen', 'Read receipts and seen marks'],
    ['#f59e0b', 'Warning / focus', 'Focus ring, caution'],
    ['#d4af37', 'Gold', 'Vault, premium, Pearl accent']
  ],
  type: [
    ['Brand & headings', "'Times New Roman', serif", 'The Rolodex, Dexii wordmark, section titles. Uppercase with wide letter-spacing for eyebrows.'],
    ['Interface', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', 'Body copy, buttons, forms. 1rem minimum everywhere; 1.0625rem body.'],
    ['Diagnostics', 'ui-monospace, SFMono-Regular, Menlo, monospace', 'Technical detail lines only.']
  ],
  shape: [
    ['Buttons', '999px pill', 'Every button, chip and tab is a pill.'],
    ['Cards & tiles', '14px', 'Theme cards, form tiles, option rows.'],
    ['Modals', '0–24px', 'Full-bleed on phones; 24px on the signup card.'],
    ['Tap target', '44px', 'Minimum height for anything tappable on phones.']
  ]
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const swatchRow = (t, [key, label, use]) => {
  const hex = t.colors[key];
  if (!hex) return '';
  const on = key === 'primary' || key === 'primaryHover' || key === 'accent' ? '#ffffff' : t.colors.text;
  const against = key === 'text' || key === 'textSecondary' ? t.colors.bg : on;
  const ratio = contrast(hex, against);
  return `<li class="sw">
    <span class="sw-chip" style="background:${hex}"></span>
    <span class="sw-role">${esc(label)}<small>${esc(use)}</small></span>
    <button type="button" class="sw-hex" data-copy="${hex}" aria-label="Copy ${hex}">${hex}</button>
    <span class="sw-contrast ${grade(ratio) === 'Low' ? 'is-low' : ''}" title="Contrast of ${key === 'text' || key === 'textSecondary' ? 'this text on the background' : 'white text on this colour'}">${ratio.toFixed(1)}:1 · ${grade(ratio)}</span>
  </li>`;
};

const themeCard = (t) => `
<article class="theme ${isDark(t) ? 'theme--dark' : ''}" id="${t.id}">
  <header class="theme-head">
    <div>
      <h3>${esc(t.name)}${t.id === BRAND.defaultTheme ? ' <span class="tag">Default</span>' : ''}</h3>
      <p>${esc(t.description)}</p>
    </div>
    <div class="theme-preview" style="background:${t.colors.bg};color:${t.colors.text};border-color:${t.colors.border}">
      <div class="tp-bar" style="border-color:${t.colors.border}"><span class="tp-logo" style="background:linear-gradient(135deg,${t.colors.primary},${t.colors.accent})">D</span><span class="tp-word">Dexii</span><span class="tp-badge" style="background:${t.colors.accent}">3</span></div>
      <div class="tp-card" style="background:${t.colors.bgSecondary};border-color:${t.colors.border}">
        <span class="tp-eyebrow" style="color:${t.colors.textSecondary}">Active crushes</span>
        <span class="tp-title">Sunny</span>
        <span class="tp-stars" style="color:${t.colors.accent}">★★★☆☆</span>
        <span class="tp-pill" style="background:${t.colors.primary}">New crush</span>
      </div>
    </div>
  </header>
  <ul class="swatches">${ROLES.map((r) => swatchRow(t, r)).join('')}</ul>
</article>`;

const generatedOn = new Date().toISOString().slice(0, 10);

const html = `<title>Dexii Palette</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;600;700&display=swap">
<style>
:root{
  color-scheme:light;
  --bg:#fffafa;--surface:#f5f3f4;--text:#4a374a;--muted:#866386;--primary:#8d5e94;--accent:#d4af37;--border:#e2d1e2;--low:#b91c1c;
  --display:'Cormorant Garamond','Times New Roman',Georgia,serif;
  --body:'Source Sans 3',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#120b14;--surface:#1e1420;--text:#f3eaf4;--muted:#b89bb9;--primary:#c19bc7;--accent:#e2c365;--border:#3a2a3d;--low:#f87171}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#120b14;--surface:#1e1420;--text:#f3eaf4;--muted:#b89bb9;--primary:#c19bc7;--accent:#e2c365;--border:#3a2a3d;--low:#f87171}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--body);font-size:1rem;line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px;padding-block:32px 72px}
header.hero{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;margin-bottom:12px}
.logo{width:72px;height:72px;border-radius:22px;display:grid;place-items:center;color:#fff;font-family:var(--display);font-size:2.4rem;font-weight:600;background:linear-gradient(135deg,#a881af,#d4af37);box-shadow:0 12px 30px rgba(141,94,148,.25)}
h1{font-family:var(--display);font-weight:600;font-size:clamp(2rem,6vw,3.2rem);line-height:1.05;margin:0;text-wrap:balance}
.lede{margin:6px 0 0;color:var(--muted);max-width:60ch}
.meta{display:flex;flex-wrap:wrap;gap:10px 18px;margin:18px 0 36px;color:var(--muted);font-size:.95rem}
.meta code{font-family:var(--mono);font-size:.9rem;color:var(--text)}
h2{font-family:var(--display);font-weight:600;font-size:1.9rem;margin:44px 0 6px;text-wrap:balance}
.sub{margin:0 0 18px;color:var(--muted);max-width:65ch}
.eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.brand-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.tile{border:1px solid var(--border);border-radius:14px;padding:14px 16px;background:var(--surface);display:grid;gap:8px}
.tile .chip{height:54px;border-radius:10px;border:1px solid rgba(0,0,0,.06)}
.tile strong{font-weight:700}
.tile small{color:var(--muted)}
.hex{font-family:var(--mono);font-size:.95rem;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:999px;padding:4px 12px;cursor:pointer;min-height:36px;justify-self:start}
.hex:hover,.sw-hex:hover{border-color:var(--primary)}
.hex:focus-visible,.sw-hex:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.themes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:18px}
.theme{border:1px solid var(--border);border-radius:16px;background:var(--surface);padding:18px;display:grid;gap:14px;scroll-margin-top:16px}
.theme-head{display:grid;grid-template-columns:1fr 150px;gap:14px;align-items:start}
.theme h3{font-family:var(--display);font-size:1.6rem;font-weight:600;margin:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.theme p{margin:4px 0 0;color:var(--muted)}
.tag{font-family:var(--body);font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--primary);border:1px solid currentColor;border-radius:999px;padding:2px 10px}
.theme-preview{border:1px solid;border-radius:12px;padding:8px;display:grid;gap:8px;font-family:var(--body);font-size:.7rem}
.tp-bar{display:flex;align-items:center;gap:6px;padding-bottom:6px;border-bottom:1px solid}
.tp-logo{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;color:#fff;font-family:var(--display);font-weight:600}
.tp-word{font-family:var(--display);letter-spacing:.14em;text-transform:uppercase;font-size:.75rem}
.tp-badge{margin-left:auto;color:#fff;border-radius:999px;min-width:16px;height:16px;display:grid;place-items:center;font-size:.6rem;font-weight:700;padding:0 4px}
.tp-card{border:1px solid;border-radius:10px;padding:8px;display:grid;gap:3px}
.tp-eyebrow{font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.tp-title{font-family:var(--display);font-size:1rem;letter-spacing:.06em;text-transform:uppercase}
.tp-stars{letter-spacing:2px}
.tp-pill{justify-self:start;color:#fff;border-radius:999px;padding:3px 9px;font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-top:3px}
.swatches{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.sw{display:grid;grid-template-columns:44px 1fr auto auto;gap:10px;align-items:center}
.sw-chip{width:44px;height:44px;border-radius:10px;border:1px solid rgba(0,0,0,.08)}
.sw-role{display:grid;line-height:1.25;font-weight:600}
.sw-role small{color:var(--muted);font-weight:400}
.sw-hex{font-family:var(--mono);font-size:.9rem;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:999px;padding:4px 10px;min-height:34px;cursor:pointer}
.sw-contrast{font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.sw-contrast.is-low{color:var(--low);font-weight:700}
table{border-collapse:collapse;width:100%;font-size:.98rem}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
th{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700}
td code{font-family:var(--mono);font-size:.88rem}
.table-wrap{overflow-x:auto}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--text);color:var(--bg);border-radius:999px;padding:8px 16px;font-size:.9rem;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
.notes{display:grid;gap:10px;max-width:70ch}
.notes p{margin:0}
@media (max-width:560px){.theme-head{grid-template-columns:1fr}.theme-preview{max-width:220px}.sw{grid-template-columns:36px 1fr auto}.sw-contrast{grid-column:2/-1;justify-self:start}.sw-chip{width:36px;height:36px}}
@media (prefers-reduced-motion: reduce){.toast{transition:none}}
</style>

<div class="wrap">
  <header class="hero">
    <div class="logo" aria-hidden="true">D</div>
    <div>
      <p class="eyebrow">Brand hand-off</p>
      <h1>Dexii colour palette</h1>
      <p class="lede">Every colour the app ships, as it is written in code. Dexii is a private crush journal with an inner circle of friends, so the themes range from soft and glamorous to dark and dramatic. People pick a theme; the default is Pearl.</p>
    </div>
  </header>
  <div class="meta">
    <span>Generated <code>${generatedOn}</code> from <code>theme.service.ts</code></span>
    <span>${themes.length} themes · ${ROLES.length} roles each</span>
    <span>Tap any hex to copy it</span>
  </div>

  <h2>Brand constants</h2>
  <p class="sub">These are fixed regardless of the theme a person picks.</p>
  <div class="brand-grid">
    <div class="tile"><span class="chip" style="background:linear-gradient(135deg,#a881af,#d4af37)"></span><strong>Logo &amp; splash gradient</strong><small>The D mark and the loading splash</small><span><button type="button" class="hex" data-copy="#a881af">#a881af</button> → <button type="button" class="hex" data-copy="#d4af37">#d4af37</button></span></div>
    <div class="tile"><span class="chip" style="background:${BRAND.manifestTheme}"></span><strong>App / browser chrome</strong><small>manifest theme_color, status bar tint</small><button type="button" class="hex" data-copy="${BRAND.manifestTheme}">${BRAND.manifestTheme}</button></div>
    <div class="tile"><span class="chip" style="background:${BRAND.manifestBackground};border:1px solid var(--border)"></span><strong>App background</strong><small>manifest background_color, first paint</small><button type="button" class="hex" data-copy="${BRAND.manifestBackground}">${BRAND.manifestBackground}</button></div>
    <div class="tile"><span class="chip" style="background:linear-gradient(135deg,${themes.find((t) => t.id === 'pearl')?.colors.primary || '#8d5e94'},${themes.find((t) => t.id === 'pearl')?.colors.accent || '#d4af37'})"></span><strong>In-app logo</strong><small>Gradient from the active theme's primary to its accent</small><span class="sub" style="margin:0;font-size:.9rem">Changes with the theme</span></div>
  </div>

  <h2>Status colours</h2>
  <p class="sub">Semantic colours stay the same in every theme.</p>
  <div class="brand-grid">
    ${BRAND.status.map(([hex, name, use]) => `<div class="tile"><span class="chip" style="background:${hex}"></span><strong>${esc(name)}</strong><small>${esc(use)}</small><button type="button" class="hex" data-copy="${hex}">${hex}</button></div>`).join('')}
  </div>

  <h2>Themes</h2>
  <p class="sub">Each theme defines the same ${ROLES.length} roles. Contrast ratios are text on background for the text roles, and white text on the colour for primary, hover and accent. "Low" means below 3:1.</p>
  <div class="themes">${themes.map(themeCard).join('')}</div>

  <h2>Custom theme defaults</h2>
  <p class="sub">People can build their own theme from three colours; the rest is derived. These are the starting values.</p>
  <div class="brand-grid">
    ${Object.entries(custom).map(([k, hex]) => `<div class="tile"><span class="chip" style="background:${hex};border:1px solid var(--border)"></span><strong>${esc(k === 'bg' ? 'Background' : k[0].toUpperCase() + k.slice(1))}</strong><button type="button" class="hex" data-copy="${hex}">${hex}</button></div>`).join('')}
  </div>

  <h2>Typography</h2>
  <div class="table-wrap"><table><thead><tr><th>Role</th><th>Stack</th><th>Notes</th></tr></thead><tbody>
    ${BRAND.type.map(([role, stack, note]) => `<tr><td><strong>${esc(role)}</strong></td><td><code>${esc(stack)}</code></td><td>${esc(note)}</td></tr>`).join('')}
  </tbody></table></div>

  <h2>Shape &amp; spacing</h2>
  <div class="table-wrap"><table><thead><tr><th>Element</th><th>Value</th><th>Notes</th></tr></thead><tbody>
    ${BRAND.shape.map(([el, val, note]) => `<tr><td><strong>${esc(el)}</strong></td><td><code>${esc(val)}</code></td><td>${esc(note)}</td></tr>`).join('')}
  </tbody></table></div>

  <h2>Notes for the designer</h2>
  <div class="notes">
    <p><strong>Primary</strong> is the one colour that has to carry white text: buttons, the active tab, links. <strong>Accent</strong> is used sparingly for counts and highlights (the Tea cup badge, stars, the Vault). Keep them distinguishable from each other in every theme.</p>
    <p><strong>Pearl</strong> is the first impression: it is the default theme, the install icon and the splash screen. If the brand gets one colour, it is Pearl's primary ${esc(themes.find((t) => t.id === 'pearl')?.colors.primary || '#8d5e94')}, with gold #d4af37 as its partner.</p>
    <p>Four themes are dark (Onyx, Rugged, Gothic, Clean Dark). Anything you design should be checked on at least Pearl, Onyx and Clean Light.</p>
    <p>Text never renders below 16px in the app, and every button is a pill. Icons are emoji today (💘 crushes, 💬 chat, 🍵 Tea, 👥 friends); a custom icon set is an open opportunity.</p>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite">Copied</div>
<script>
(function(){
  var toast=document.getElementById('toast');var timer;
  function show(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){toast.classList.remove('show')},1400)}
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-copy]');if(!btn)return;
    var hex=btn.getAttribute('data-copy');
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(hex).then(function(){show('Copied '+hex)}).catch(function(){select(btn)})}else{select(btn)}
  });
  function select(el){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);show('Select and copy '+el.textContent)}
})();
</script>
`;

const out = path.join(ROOT, 'docs/brand/dexii-palette.html');
fs.writeFileSync(out, html);
console.log(`brand-palette: wrote ${path.relative(ROOT, out)} with ${themes.length} themes`);
