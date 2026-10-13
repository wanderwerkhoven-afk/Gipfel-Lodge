import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('gallery toolbar no longer has absolute positioning',()=>{const h=read('crm.html');const view=h.slice(h.indexOf('id="galleries-view"'),h.indexOf('id="gallery-pages-container"'));assert.match(view,/class="crm-gallery-header"/);assert.match(view,/class="crm-gallery-actions"/);assert.doesNotMatch(view,/position: absolute; right: 0; top: 0/);});
test('gallery page navigation scrolls horizontally on mobile',()=>{const h=read('crm.html'),css=read('css/admin_css/crm-style.css');assert.match(h,/class="crm-gallery-page-tabs"/);assert.match(css,/\.crm-gallery-page-tabs\{max-width:100%;min-width:0;overflow-x:auto/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);});
test('gallery layout has mobile cache version',()=>{assert.match(read('crm.html'),/crm-style\.css\?v=20261014-gallery-mobile-1/);});
