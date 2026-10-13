import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('mobile drawer has an accessible close control',()=>{const h=read('crm.html');assert.match(h,/crm-drawer-close/);assert.match(h,/aria-expanded="false"/)});
test('drawer is above backdrop and shares stacking context',()=>{const css=read('css/admin_css/crm-style.css');const js=read('js/admin_js/crm-shell.js');assert.match(css,/z-index:3001!important/);assert.match(css,/z-index:3000!important/);assert.match(js,/layout\.appendChild\(overlay\)/)});
test('menu can close through backdrop, Escape and route change',()=>{const js=read('js/admin_js/crm-shell.js');assert.match(js,/function closeCrmMenu/);assert.match(js,/event\.key==='Escape'/);assert.match(js,/closeCrmMenu\(\)/)});
