/**
 * Experimental multipage builder. Run: npm install && npm run build:mpa
 * Output is isolated in dist/mpa until routing and SiteGround export are tested.
 * No runtime HTML fetching and no client-side SPA router.
 */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'mpa');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routes = {
  home: '', lodge: 'lodge', activities: 'activiteiten',
  enjoyment: 'genieten', booking: 'booking'
};
const known = new Set(Object.keys(routes));
const scriptName = 'js/site_js/core/multipage.js';

function build(page) {
  const dom = new JSDOM(source);
  const doc = dom.window.document;
  // Preserve shared navigation, splash, lightboxes, maintenance and footer.
  for (const el of [...doc.querySelectorAll('main.page')]) {
    if (el.id !== page + '-page') el.remove();
    else el.classList.add('active');
  }
  for (const el of [...doc.querySelectorAll('script[src]')]) {
    const src = el.getAttribute('src') || '';
    if (src.endsWith('js/site_js/core/router.js')) {
      el.setAttribute('src', scriptName);
    }
  }
  // All generated documents live in subfolders, with an explicit root base.
  let base = doc.querySelector('base');
  if (!base) {
    base = doc.createElement('base');
    doc.head.insertBefore(base, doc.head.firstChild);
  }
  base.setAttribute('href', '/Gipfel-Lodge/');
  doc.documentElement.dataset.mpaPage = page;
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = 'https://gipfellodge.nl/' + (routes[page] ? routes[page] + '/' : '');
  // The full page is already present, no need for dynamic page selection.
  const folder = path.join(output, routes[page]);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), '<!doctype html>\n' + doc.documentElement.outerHTML);
  dom.window.close();
}
fs.rmSync(output, { recursive: true, force: true });
for (const page of known) build(page);
console.log('Generated ' + known.size + ' independent HTML documents in dist/mpa');
