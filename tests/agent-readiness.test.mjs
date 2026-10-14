import * as vmModule from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('homepage exposes semantic H1 before H2 and meaningful raw text',()=>{const s=read('index.html');const h=[...s.matchAll(/<h([1-6])\b/g)].map(x=>+x[1]);assert.equal(h[0],1);assert.ok(s.includes('hero-description'));assert.ok(s.length>500);});
test('404 negotiates Markdown and retains real 404 status',()=>{const s=read('agent-error.php');assert.match(s,/http_response_code\(404\)/);assert.match(s,/text\/markdown/);assert.match(s,/Vary: Accept/);assert.match(s,/sitemap\.xml/);});
test('homepage negotiates Markdown at root and HTML normally',()=>{const s=read('.htaccess');assert.match(s,/HTTP:Accept/);assert.match(s,/markdown-home\.php/);assert.match(s,/Vary Accept/);assert.match(read('markdown-home.php'),/readfile/);assert.ok(read('index.md').length>500);});
test('OpenAPI defines real public status endpoint and JSON error',()=>{const spec=JSON.parse(read('openapi.json'));assert.equal(spec.openapi,'3.1.0');assert.ok(spec.paths['/api/status.php'].get.responses['200']);assert.match(read('api/index.php'),/application\/json/);assert.match(read('api/status.php'),/METHOD_NOT_ALLOWED/);});
test('CRM ZIP export includes all machine-readable resources',()=>{const s=read('js/admin_js/admin-export.js');for(const p of ['openapi.json','index.md','markdown-home.php','agent-error.php','api/status.php'])assert.ok(s.includes(p),p);});

test('discovery and trust pages are included in CRM export',()=>{const s=read('js/admin_js/admin-export.js');for(const p of ['about/index.html','contact/index.html','privacy/index.html']){assert.ok(s.includes(p));assert.ok(read(p).replace(/<[^>]+>/g,' ').length>500);}const map=read('sitemap.xml');assert.equal((map.match(/<url>/g)||[]).length,4);assert.equal((map.match(/<lastmod>2026-10-14<\/lastmod>/g)||[]).length,4);});
test('homepage identity metadata and agent guidance',()=>{const s=read('index.html');for(const marker of ['rel="canonical"','property="og:type"','property="og:image"','application/ld+json'])assert.ok(s.includes(marker));assert.ok(read('llms.txt').includes('Wann Gipfel Lodge verwenden?'));assert.ok(!s.includes('+31-6-12345678'));});

test('source homepage has explicit language and description for no-JS crawlers',()=>{const s=read('index.html');assert.match(s,/<html lang="nl">/);assert.match(s,/<meta name="description" content="[^"]{80,}"/);assert.match(s,/<h1\b/);assert.ok(s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]*>/g,' ').length>500);});
test('robots discovery matches the versioned CRM export',()=>{const robots=read('robots.txt');assert.match(robots,/User-agent: \*/);assert.match(robots,/Allow: \//);assert.match(robots,/Sitemap: https:\/\/gipfellodge.at\/sitemap.xml/);const exporter=read('js/admin_js/admin-export.js');assert.match(exporter,/path === 'robots.txt'/);assert.ok(!exporter.includes("zip.file('robots.txt'"));});
test('business schema contains truthful contact destination and address',()=>{const s=read('index.html');const match=s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(match);const schema=JSON.parse(match[1]);assert.ok(schema['@type'].includes('LodgingBusiness'));assert.equal(schema.contactPoint.url,'https://gipfellodge.at/contact/');assert.equal(schema.address.addressCountry,'AT');});

test('GitHub Pages provides meaningful non-JavaScript accommodation content',()=>{const html=read('index.html');const block=html.match(/<noscript>([\s\S]*?)<\/noscript>/);assert.ok(block);const plain=block[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();assert.ok(plain.length>=500);assert.match(plain,/Eben im Pongau/);assert.match(html,/<h1 class="hero-v3-title"[^>]*>Gipfel Lodge/);});
test('GitHub Pages project 404 links to public discovery resources',()=>{const html=read('404.html');assert.match(html,/<h1>404/);for(const p of ['/Gipfel-Lodge/','/Gipfel-Lodge/index.md','/Gipfel-Lodge/llms.txt','/Gipfel-Lodge/sitemap.xml'])assert.ok(html.includes(p));assert.match(html,/noindex,follow/);});

test('project sitemap contains four absolute preview URLs and export restores production host',()=>{
  const xml=read('sitemap.xml');
  const base='https://wanderwerkhoven-afk.github.io/Gipfel-Lodge/';
  for(const route of ['', 'about/', 'contact/', 'privacy/'])assert.ok(xml.includes('<loc>'+base+route+'</loc>'));
  assert.equal((xml.match(/<url>/g)||[]).length,4);
  const exportCode=read('js/admin_js/admin-export.js');
  assert.ok(exportCode.includes("previewSitemap.replaceAll(previewSite, productionSite)"));
});
test('agent guidance describes project preview use cases and reliable booking source',()=>{
  const instructions=read('llms.txt');
  assert.ok(instructions.includes('Wann verwenden?'));
  assert.ok(instructions.includes('github.io/Gipfel-Lodge/index.md'));
  assert.ok(instructions.includes('gipfellodge.at/'));
});
test('trust page navigation works in both GitHub project path and production root',()=>{
  for(const path of ['about/index.html','contact/index.html','privacy/index.html']){
    const page=read(path);
    for(const route of ['../','../about/','../contact/','../privacy/'])assert.ok(page.includes('href="'+route+'"'));
    assert.ok(page.replace(/<[^>]*>/g,' ').length>500);
  }
});
test('business structured data and identity metadata remain parseable',()=>{
  const html=read('index.html');
  const ld=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld);
  const data=JSON.parse(ld[1]);
  assert.ok(data['@type'].includes('LodgingBusiness'));
  assert.equal(data.address.addressCountry,'AT');
  for(const signal of ['<html lang="nl">','rel="canonical"','property="og:type"','property="og:image"'])assert.ok(html.includes(signal));
});

test('meaningful home introduction is in raw HTML and heading order begins with H1',()=>{const html=read('index.html');assert.ok(html.startsWith('<!doctype html>'));const home=html.split('<main id="home-page"')[1].split('<!-- SECTION 3')[0];const paragraphs=[...home.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());const prose=paragraphs.join(' ');assert.ok(prose.length>=500);for(const word of ['Eben im Pongau','135 m²','vier slaapkamers','drie badkamers','sauna','Flachau'])assert.ok(prose.includes(word),word);const headings=[...html.matchAll(/<h([1-6])\b/g)].map(x=>Number(x[1]));assert.equal(headings[0],1);assert.equal(headings[1],2);});

test('SPA router recognizes GitHub Pages project root and preserves production paths',()=>{
  const source=read('js/site_js/core/router.js');
  const vm=requireVm();
  function createLocation(hostname,pathname){return {hostname,pathname,search:''};}
  function run(hostname,pathname){
    const window={location:createLocation(hostname,pathname),i18n:{domain:'gipfellodge.eu'},addEventListener(){},history:{pushState(){}},scrollTo(){}};
    const document={addEventListener(){}};
    const context=vm.createContext({window,document,console,localStorage:{setItem(){}},URL});
    vm.runInContext(source,context);
    return context;
  }
  const gh=run('wanderwerkhoven-afk.github.io','/Gipfel-Lodge/');
  assert.equal(vm.runInContext("getPageIdFromPath('/Gipfel-Lodge/')",gh),'home');
  assert.equal(vm.runInContext("getPageIdFromPath('/Gipfel-Lodge/index.html')",gh),'home');
  assert.equal(vm.runInContext("getPageIdFromPath('/Gipfel-Lodge/lodge')",gh),'lodge');
  assert.equal(vm.runInContext("toPublicPath('/activities')",gh),'/Gipfel-Lodge/activities');
  const prod=run('gipfellodge.at','/');
  assert.equal(vm.runInContext("getPageIdFromPath('/')",prod),'home');
  assert.equal(vm.runInContext("toPublicPath('/lodge')",prod),'/lodge');
});
function requireVm(){return vmModule;}
