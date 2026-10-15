/**
 * Experimental multipage builder. Run: npm install && npm run build:mpa
 * Output is isolated in dist/mpa until routing and SiteGround export are tested.
 * No runtime HTML fetching and no client-side SPA router.
 */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'mpa');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const seo = require(path.join(root, 'js/site_js/seo/seo-config.js'));
const domains = ['gipfellodge.nl', 'gipfellodge.at', 'gipfellodge.de', 'gipfellodge.eu'];
const known = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];
const scriptName = 'js/site_js/core/multipage.js';
const translations = { de: {}, nl: {}, en: {} };
const context = vm.createContext({ window: { gipfelTranslations: translations } });
for (const filename of [
  'i18n_home.js', 'i18n_lodge.js', 'i18n_activities.js',
  'i18n_booking.js', 'i18n_enjoyment.js', 'i18n_global.js'
]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js/site_js/i18n', filename), 'utf8'),
    context, { filename, timeout: 2000 }
  );
}
function staticTranslations(doc, lang) {
  for (const element of doc.querySelectorAll('[data-i18n]')) {
    const key = element.getAttribute('data-i18n');
    const value = translations[lang]?.[key] ?? translations.nl?.[key];
    if (typeof value !== 'string') continue;
    if (element.matches('input, textarea')) element.setAttribute('placeholder', value);
    else if (element.hasAttribute('title')) element.setAttribute('title', value);
    else if (element.children.length === 0) element.textContent = value;
    // Preserve nested markup for complex translated elements until a safe HTML-aware renderer is added.
  }
}


function build(domain, page) {
  const config = seo.domains[domain];
  const pageConfig = config.pages[page];
  const route = pageConfig.path.replace(new RegExp('^/+'), '');
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
  base.setAttribute('href', '/'); // Each domain directory is intended as its own document root.
  doc.documentElement.dataset.mpaPage = page;
  doc.documentElement.lang = config.locale;
  staticTranslations(doc, config.lang);
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = 'https://' + domain + pageConfig.path;
  const description = doc.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', pageConfig.description);
  // The full page is already present, no need for dynamic page selection.
  // Avoid loading page-specific CSS and scripts that belong to removed pages only.
  const title = doc.querySelector('title');
  if (title) title.textContent = pageConfig.title;
  const folder = path.join(output, domain, route);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), '<!doctype html>\n' + doc.documentElement.outerHTML);
  dom.window.close();
}
fs.rmSync(output, { recursive: true, force: true });
for (const directory of ['assets', 'css', 'js']) {
  const sourceDir = path.join(root, directory);
  if (fs.existsSync(sourceDir)) for (const domain of domains) fs.cpSync(sourceDir, path.join(output, domain, directory), { recursive: true });
}
for (const filename of ['site.webmanifest', 'favicon.svg', 'favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', 'llms.txt', 'index.md', '404.html']) {
  const sourceFile = path.join(root, filename);
  if (fs.existsSync(sourceFile)) for (const domain of domains) fs.copyFileSync(sourceFile, path.join(output, domain, filename));
}
for (const domain of domains) for (const page of known) build(domain, page);
// Fail the build if a page accidentally contains another route's main section
// or if its route adapter and essential shared assets are absent.
for (const domain of domains) for (const page of known) {
  const filename = path.join(output, domain, seo.domains[domain].pages[page].path.replace(new RegExp('^/+'), ''), 'index.html');
  const html = fs.readFileSync(filename, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const mains = [...doc.querySelectorAll('main.page')];
  if (mains.length !== 1 || mains[0].id !== page + '-page') {
    throw new Error('Invalid MPA document: ' + filename);
  }
  if (!doc.querySelector('script[src="' + scriptName + '"]')) {
    throw new Error('Missing MPA navigation adapter: ' + filename);
  }
  for (const el of doc.querySelectorAll('script[src],link[rel="stylesheet"][href]')) {
    const url = el.getAttribute('src') || el.getAttribute('href');
    if (!url || url.startsWith('http:') || url.startsWith('https:') || url.startsWith('//')) continue;
    const relative = url.split(/[?#]/)[0].replace(new RegExp('^\\\\./'), '');
    if (relative.startsWith('/') || relative.includes('..')) continue;
    if (!fs.existsSync(path.join(output, domain, relative))) {
      throw new Error('Missing local dependency: ' + relative + ' in ' + filename);
    }
  }
  dom.window.close();
}
console.log('Generated ' + (known.length * domains.length) + ' independent HTML documents across ' + domains.length + ' domains in dist/mpa');
