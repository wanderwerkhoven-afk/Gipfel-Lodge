import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CRM mobile header uses light background with darker legible branding',()=>{const css=read('css/admin_css/crm-style.css');assert.match(css,/\.mobile-top-bar[\s\S]*?background:#f7f4ee!important/);assert.match(css,/\.mobile-top-bar \.mobile-logo[\s\S]*?color:#223043!important/);assert.match(css,/\.mobile-top-bar \.hamburger-btn[\s\S]*?background:#eee8dc!important/);});
test('new CRM theme asset is requested to avoid stale mobile styles',()=>{const html=read('crm.html');assert.match(html,/crm-style\.css\?v=20261014-light-header-1/);});
