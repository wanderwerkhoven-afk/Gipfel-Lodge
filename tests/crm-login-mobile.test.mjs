import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CRM retains Firebase login form identifiers',()=>{const h=read('crm.html');for(const id of ['login-screen','admin-email','admin-password','login-btn-el','login-error'])assert.ok(h.includes('id="'+id+'"'));assert.match(h,/autocomplete="current-password"/);});
test('mobile login is full viewport and light, without inherited dark modal styling',()=>{const css=read('css/admin_css/crm-style.css');assert.match(css,/height:100dvh!important/);assert.match(css,/background:#f7f4ee!important/);assert.match(css,/backdrop-filter:none!important/);assert.match(css,/font:400 16px Inter/);});
test('CRM forces refresh of login stylesheet',()=>{assert.match(read('crm.html'),/crm-style\.css\?v=20261014-login-2/);});
