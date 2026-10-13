import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('editor applies a phone-width single-column layout after rendering',()=>{const s=read('js/admin_js/admin-texts.js');assert.match(s,/container\.innerHTML = html;\s*applyCrmMobileEditorLayout\(\)/);assert.match(s,/window\.innerWidth<=767/);assert.match(s,/'flex-direction':'column'/);assert.match(s,/crmEditorOriginalStyles/);});
test('CRM cache version forces newly deployed editor assets',()=>{const h=read('crm.html');assert.match(h,/crm-style\.css\?v=20261013-mobile-editor-2/);assert.match(h,/admin-texts\.js\?v=20261013-mobile-editor-2/);});
