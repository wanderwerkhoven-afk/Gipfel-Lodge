import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('missing Apache paths are not rewritten to SPA', () => {
 assert.ok(read('.htaccess').includes('ErrorDocument 404 /404.php'));
 assert.ok(!read('.htaccess').includes('RewriteRule ^ index.html'));
});
test('404 response has real status and content negotiation', () => {
 assert.ok(read('404.php').includes('http_response_code(404)'));
 assert.ok(read('404.php').includes('text/markdown'));
 assert.ok(read('404.php').includes('sitemap.xml'));
});
test('canonical discovery files enter SiteGround build', () => {
 const b=read('build-siteground.ps1');
 assert.ok(b.includes('gipfellodge.at/sitemap.xml'));
 assert.ok(b.includes('404.php'));
 assert.ok(b.includes('llms.txt'));
});

test('homepage has meaningful non-JavaScript accommodation content', () => {
 const html=read('index.html');
 const noScript=html.match(/<noscript>([\\s\\S]*?)<\\/noscript>/)?.[1] ?? '';
 assert.ok(noScript.replace(/<[^>]*>/g, '').trim().length >= 500);
 assert.ok(html.includes('<link rel="canonical" href="https://gipfellodge.at/"'));
});
