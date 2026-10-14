import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('homepage exposes semantic H1 before H2 and meaningful raw text',()=>{const s=read('index.html');const h=[...s.matchAll(/<h([1-6])\b/g)].map(x=>+x[1]);assert.equal(h[0],1);assert.ok(s.includes('hero-description'));assert.ok(s.length>500);});
test('404 negotiates Markdown and retains real 404 status',()=>{const s=read('agent-error.php');assert.match(s,/http_response_code\(404\)/);assert.match(s,/text\/markdown/);assert.match(s,/Vary: Accept/);assert.match(s,/sitemap\.xml/);});
test('homepage negotiates Markdown at root and HTML normally',()=>{const s=read('.htaccess');assert.match(s,/HTTP:Accept/);assert.match(s,/markdown-home\.php/);assert.match(s,/Vary Accept/);assert.match(read('markdown-home.php'),/readfile/);assert.ok(read('index.md').length>500);});
test('OpenAPI defines real public status endpoint and JSON error',()=>{const spec=JSON.parse(read('openapi.json'));assert.equal(spec.openapi,'3.1.0');assert.ok(spec.paths['/api/status.php'].get.responses['200']);assert.match(read('api/index.php'),/application\/json/);assert.match(read('api/status.php'),/METHOD_NOT_ALLOWED/);});
test('CRM ZIP export includes all machine-readable resources',()=>{const s=read('js/admin_js/admin-export.js');for(const p of ['openapi.json','index.md','markdown-home.php','agent-error.php','api/status.php'])assert.ok(s.includes(p),p);});
